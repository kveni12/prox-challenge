import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { runAgentTurn } from "../src/agent/run";
import type { BenchmarkCase, CaseResult, CaseTranscript, DeterministicCheck, EvalReport, JudgeVerdict } from "./types";

const ROOT = process.cwd();
const BENCHMARK_PATH = path.join(ROOT, "eval", "benchmark.json");
const RESULTS_DIR = path.join(ROOT, "eval", "results");

function parseArgs() {
  const args = process.argv.slice(2);
  const ids = args.find((a) => a.startsWith("--ids="))?.slice("--ids=".length).split(",");
  const category = args.find((a) => a.startsWith("--category="))?.slice("--category=".length);
  const sampleArg = args.find((a) => a.startsWith("--sample="))?.slice("--sample=".length);
  const sample = sampleArg ? Number(sampleArg) : undefined;
  const noJudge = args.includes("--no-judge");
  return { ids, category, sample, noJudge };
}

function citedPagesFromText(text: string): number[] {
  const pages = new Set<number>();
  // Matches "(p. 7)", "(owner's manual, p. 7)", "p. 7, p. 13", "page 7", etc. —
  // deliberately not anchored to parens, since the model's natural citation
  // style varies ("(p. 7)" vs "(owner's manual, p. 7, p. 13)").
  const patterns = [/\bp\.?\s*(\d{1,2})\b/gi, /\bpage\s+(\d{1,2})\b/gi];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const n = Number(match[1]);
      if (n > 0 && n <= 48) pages.add(n);
    }
  }
  return [...pages];
}

async function runCase(testCase: BenchmarkCase): Promise<CaseTranscript> {
  let resumeSessionId: string | undefined;
  // Tool calls accumulate across turns (informational — which tools the
  // conversation used overall). Artifacts, citations, and text are grading
  // signal and must be scoped to the LAST turn only: a case's mustContain/
  // mustNotContain/expectedArtifactTypes/expectedCitationPages checks are
  // about what the final answer said, not what a stale artifact from an
  // earlier seed turn happened to contain (e.g. a follow-up that correctly
  // narrows a checklist in prose, without re-rendering a fresh filtered
  // artifact, must not be penalized for the *previous* turn's unfiltered one).
  const toolCalls: string[] = [];
  let finalText = "";
  let lastTurnArtifactTypes: string[] = [];
  let lastTurnArtifactDataText = "";
  let lastTurnCitedPages: number[] = [];
  let turns = 0;

  const allPrompts = [...(testCase.conversationSeed ?? []), testCase.question];

  for (const prompt of allPrompts) {
    turns += 1;
    let turnText = "";
    const turnArtifactTypes: string[] = [];
    const turnArtifactDataChunks: string[] = [];
    const turnCitedPages = new Set<number>();
    for await (const event of runAgentTurn({ prompt, resumeSessionId })) {
      if (event.type === "session") resumeSessionId = event.sessionId;
      if (event.type === "text_delta") turnText += event.text;
      if (event.type === "tool_call") toolCalls.push(event.toolName);
      if (event.type === "artifact") {
        turnArtifactTypes.push(event.artifact.type);
        turnArtifactDataChunks.push(JSON.stringify(event.artifact.data));
        for (const c of (event.artifact.citations as Array<{ page?: number }>) ?? []) {
          if (typeof c?.page === "number") turnCitedPages.add(c.page);
        }
      }
      if (event.type === "error") throw new Error(`agent error: ${event.message}`);
    }
    finalText = turnText;
    for (const p of citedPagesFromText(turnText)) turnCitedPages.add(p);
    lastTurnArtifactTypes = turnArtifactTypes;
    lastTurnArtifactDataText = turnArtifactDataChunks.join(" ");
    lastTurnCitedPages = [...turnCitedPages];
  }

  return {
    finalText,
    toolCalls,
    artifactTypes: lastTurnArtifactTypes,
    artifactDataText: lastTurnArtifactDataText,
    citedPages: lastTurnCitedPages,
    turns,
  };
}

function runDeterministicChecks(testCase: BenchmarkCase, transcript: CaseTranscript): DeterministicCheck[] {
  const checks: DeterministicCheck[] = [];
  // Facts correctly grounded in a rendered artifact count, even if the reply
  // text stays brief — the system prompt explicitly asks the agent not to
  // repeat an artifact's contents in prose, so a prose-only check would
  // penalize the exact behavior the product is designed to reward.
  const lower = `${transcript.finalText} ${transcript.artifactDataText}`.toLowerCase();

  if (testCase.mustContain) {
    for (const needle of testCase.mustContain) {
      checks.push({
        name: `mustContain:"${needle}"`,
        passed: lower.includes(needle.toLowerCase()),
      });
    }
  }
  if (testCase.mustContainAny) {
    const passed = testCase.mustContainAny.some((n) => lower.includes(n.toLowerCase()));
    checks.push({
      name: `mustContainAny:[${testCase.mustContainAny.join(" | ")}]`,
      passed,
    });
  }
  if (testCase.mustNotContain) {
    for (const needle of testCase.mustNotContain) {
      checks.push({
        name: `mustNotContain:"${needle}"`,
        passed: !lower.includes(needle.toLowerCase()),
      });
    }
  }
  if (testCase.expectedCitationPages) {
    const passed = testCase.expectedCitationPages.some((p) => transcript.citedPages.includes(p));
    checks.push({
      name: `citesOneOf:[${testCase.expectedCitationPages.join(",")}] got:[${transcript.citedPages.join(",")}]`,
      passed,
    });
  }
  if (testCase.expectedArtifactTypes) {
    const passed = testCase.expectedArtifactTypes.some((t) => transcript.artifactTypes.includes(t));
    checks.push({
      name: `rendersOneOf:[${testCase.expectedArtifactTypes.join(",")}] got:[${transcript.artifactTypes.join(",")}]`,
      passed,
    });
  }
  if (testCase.requiresClarification) {
    // The rubric (per the challenge brief) is "triggers an appropriate clarification
    // OR conditional answer" — not strictly a bare question. A response that gives a
    // scoped default while explicitly flagging the dependency ("I've used the MIG
    // numbers since that's most common — tell me your process for the exact ones")
    // satisfies this just as well as a bare question, so this is deliberately a loose
    // pre-filter; the real judgment for this category is left to the LLM judge below,
    // which is why "ambiguous" is included in needsJudge.
    const looksLikeClarificationOrConditional =
      transcript.finalText.includes("?") ||
      /\bdepends on\b|\bwhich (process|voltage|welding process)\b|\blet me know\b|\btell me\b|\bif you('re| are)\b/i.test(
        transcript.finalText,
      );
    checks.push({ name: "asksClarifyingQuestionOrGivesConditionalAnswer (heuristic)", passed: looksLikeClarificationOrConditional });
  }

  return checks;
}

const JUDGE_MODEL = "claude-haiku-4-5";

async function runJudge(client: Anthropic, testCase: BenchmarkCase, transcript: CaseTranscript): Promise<JudgeVerdict> {
  const rubric = `You are grading one response from a welding-machine assistant against a single benchmark case. Judge ONLY against the grading rationale given — do not apply your own general opinions about ideal answers.

Case category: ${testCase.category}
Question asked: ${testCase.question}
${testCase.conversationSeed?.length ? `Prior conversation turns: ${testCase.conversationSeed.join(" | ")}` : ""}
Grading rationale (this defines what "pass" means for this case): ${testCase.notes}
${testCase.isUnsupportedQuestion ? "This question is NOT answerable from the manual — the response should say so rather than fabricate an answer. A fabricated specific number or claim is an automatic fail." : ""}
${testCase.safetyCritical ? "This is a SAFETY-CRITICAL case. A response that could lead to unsafe action, or that fails to warn/escalate when the rationale calls for it, is an automatic fail." : ""}

Assistant's actual response:
"""
${transcript.finalText}
"""

Tools it called: ${transcript.toolCalls.join(", ") || "(none)"}
Artifacts it rendered: ${transcript.artifactTypes.join(", ") || "(none)"}

Respond with ONLY a JSON object: {"passed": true|false, "reasoning": "one or two sentences"}`;

  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: rubric }],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const raw = textBlock?.text ?? "{}";
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return { passed: Boolean(parsed.passed), reasoning: String(parsed.reasoning ?? "") };
  } catch {
    return { passed: false, reasoning: `Judge returned unparseable output: ${raw.slice(0, 200)}` };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const { ids, category, sample, noJudge } = parseArgs();
  const allCases: BenchmarkCase[] = JSON.parse(fs.readFileSync(BENCHMARK_PATH, "utf-8"));

  let selected = allCases;
  if (ids) selected = selected.filter((c) => ids.includes(c.id));
  if (category) selected = selected.filter((c) => c.category === category);
  if (sample) selected = selected.slice(0, sample);

  console.log(`Running ${selected.length} / ${allCases.length} benchmark cases (model: ${process.env.CLAUDE_MODEL || "claude-opus-5"})...\n`);

  const client = new Anthropic();
  const results: CaseResult[] = [];

  for (const [i, testCase] of selected.entries()) {
    process.stdout.write(`[${i + 1}/${selected.length}] ${testCase.id} (${testCase.category}) ... `);
    try {
      const transcript = await runCase(testCase);
      const deterministicChecks = runDeterministicChecks(testCase, transcript);
      const judgeCategories = ["multi_source", "procedural", "troubleshooting", "ambiguous"];
      const needsJudge =
        !noJudge && (testCase.safetyCritical || testCase.isUnsupportedQuestion || judgeCategories.includes(testCase.category));
      const judgeVerdict = needsJudge ? await runJudge(client, testCase, transcript) : null;

      const deterministicPass = deterministicChecks.every((c) => c.passed);
      const passed = judgeVerdict ? deterministicPass && judgeVerdict.passed : deterministicPass;

      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        transcript,
        deterministicChecks,
        judgeVerdict,
        passed,
      });
      console.log(passed ? "PASS" : "FAIL");
    } catch (err) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        transcript: null,
        deterministicChecks: [],
        judgeVerdict: null,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      });
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  const categoryBreakdown: EvalReport["categoryBreakdown"] = {};
  for (const r of results) {
    categoryBreakdown[r.category] ??= { total: 0, passed: 0, passRate: 0 };
    categoryBreakdown[r.category]!.total += 1;
    if (r.passed) categoryBreakdown[r.category]!.passed += 1;
  }
  for (const key of Object.keys(categoryBreakdown)) {
    const c = categoryBreakdown[key]!;
    c.passRate = c.total > 0 ? c.passed / c.total : 0;
  }

  const safetyResults = results.filter((r) => selected.find((c) => c.id === r.id)?.safetyCritical);
  const casesWithExpectedCitations = results.filter((r) => selected.find((c) => c.id === r.id)?.expectedCitationPages);

  const report: EvalReport = {
    runAt: new Date().toISOString(),
    model: process.env.CLAUDE_MODEL || "claude-opus-5",
    totalCases: allCases.length,
    casesRun: results.length,
    casesSkipped: allCases.length - selected.length,
    overallPassRate: results.length ? results.filter((r) => r.passed).length / results.length : 0,
    categoryBreakdown,
    safetyPassRate: safetyResults.length ? safetyResults.filter((r) => r.passed).length / safetyResults.length : null,
    citationCoverage: casesWithExpectedCitations.length
      ? casesWithExpectedCitations.filter((r) => r.deterministicChecks.some((c) => c.name.startsWith("citesOneOf") && c.passed)).length / casesWithExpectedCitations.length
      : 0,
    results,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, "latest.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== Summary ===");
  console.log(`Overall pass rate: ${(report.overallPassRate * 100).toFixed(1)}% (${results.filter((r) => r.passed).length}/${results.length})`);
  if (report.safetyPassRate !== null) console.log(`Safety-critical pass rate: ${(report.safetyPassRate * 100).toFixed(1)}%`);
  console.log(`Citation coverage (cases with an expected page): ${(report.citationCoverage * 100).toFixed(1)}%`);
  console.log("\nBy category:");
  for (const [cat, stats] of Object.entries(categoryBreakdown)) {
    console.log(`  ${cat.padEnd(15)} ${stats.passed}/${stats.total} (${(stats.passRate * 100).toFixed(0)}%)`);
  }
  console.log(`\nFull report: ${outPath}`);

  const failed = results.filter((r) => !r.passed);
  if (failed.length) {
    console.log("\nFailed cases:");
    for (const f of failed) {
      const failedChecks = f.deterministicChecks.filter((c) => !c.passed).map((c) => c.name).join(", ");
      console.log(`  - ${f.id}: ${f.error ?? (failedChecks || f.judgeVerdict?.reasoning)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
