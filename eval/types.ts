export type BenchmarkCategory =
  | "factual"
  | "numeric"
  | "procedural"
  | "troubleshooting"
  | "polarity"
  | "settings"
  | "table"
  | "diagram"
  | "multi_source"
  | "ambiguous"
  | "unsupported"
  | "safety"
  | "followup";

export interface BenchmarkCase {
  id: string;
  category: BenchmarkCategory;
  question: string;
  /** Prior user turns to send (in the same session) before `question`, for follow-up cases. */
  conversationSeed?: string[];
  /** Substrings (case-insensitive) that must ALL appear somewhere in the final answer. */
  mustContain?: string[];
  /** At least ONE of these substrings (case-insensitive) must appear. */
  mustContainAny?: string[];
  /** Substrings that must NOT appear — used to catch fabricated numbers/claims. */
  mustNotContain?: string[];
  /** At least one of these page numbers should be cited (via a (p. N) style citation or an artifact citation). */
  expectedCitationPages?: number[];
  /** At least one artifact of one of these types should be rendered. */
  expectedArtifactTypes?: string[];
  /** The answer should ask a clarifying question rather than assume an interpretation. */
  requiresClarification?: boolean;
  /** The manual doesn't cover this — the answer should say so rather than fabricate. */
  isUnsupportedQuestion?: boolean;
  /** Safety-critical case — graded under the stricter safety rubric. */
  safetyCritical?: boolean;
  /** The answer must clearly warn and/or tell the user to stop / consult a professional. */
  mustWarnOrEscalate?: boolean;
  /** Human-readable grading rationale, shown in the report. */
  notes: string;
}

export interface CaseTranscript {
  finalText: string;
  toolCalls: string[];
  artifactTypes: string[];
  /** JSON-stringified data payloads of every artifact rendered, concatenated — lets mustContain/mustContainAny/mustNotContain checks see facts that correctly live in a rendered artifact instead of being repeated in prose (the system prompt explicitly tells the agent not to repeat artifact contents in text). */
  artifactDataText: string;
  citedPages: number[];
  turns: number;
}

export interface DeterministicCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface JudgeVerdict {
  passed: boolean;
  reasoning: string;
}

export interface CaseResult {
  id: string;
  category: BenchmarkCategory;
  question: string;
  transcript: CaseTranscript | null;
  deterministicChecks: DeterministicCheck[];
  judgeVerdict: JudgeVerdict | null;
  passed: boolean;
  error?: string;
}

export interface EvalReport {
  runAt: string;
  model: string;
  totalCases: number;
  casesRun: number;
  casesSkipped: number;
  overallPassRate: number;
  categoryBreakdown: Record<string, { total: number; passed: number; passRate: number }>;
  safetyPassRate: number | null;
  citationCoverage: number;
  results: CaseResult[];
}
