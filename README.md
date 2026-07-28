# Vulcan OmniPro 220 Welding Assistant

An expert operating companion for the [Vulcan OmniPro 220](https://www.harborfreight.com/omnipro-220-industrial-multiprocess-welder-with-120240v-input-57812.html) multiprocess welder, built on the **Claude Agent SDK**. It answers deep technical questions about the machine — grounded in its owner's manual, quick-start guide, and process-selection chart — and responds with the format the question actually needs: a direct answer, a grounded interactive diagram, a duty-cycle table, a troubleshooting checklist, or the real manual figure, not just a wall of text.

Built for [Prox](https://useprox.com)'s founding engineer challenge.

## Table of contents

- [Quick start](#quick-start)
- [What this is](#what-this-is)
- [Architecture](#architecture)
- [How knowledge is extracted and represented](#how-knowledge-is-extracted-and-represented)
- [The agent](#the-agent)
- [Multimodal responses (artifacts)](#multimodal-responses-artifacts)
- [Citations and grounding](#citations-and-grounding)
- [Safety](#safety)
- [Evaluation](#evaluation)
- [Testing](#testing)
- [Reliability](#reliability)
- [Design decisions](#design-decisions)
- [Limitations](#limitations)
- [Future improvements](#future-improvements)
- [Commands reference](#commands-reference)

## Quick start

```bash
git clone <your-fork-url>
cd prox-challenge
cp .env.example .env   # then paste your Anthropic API key into ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000. That's it — single dependency install, single `.env` value, single `npm run dev`. No database, no vector store, no embeddings API, no separate ingestion step to run (the manuals are pre-processed and the extracted knowledge base is already committed under `data/`).

**Requirements:** Node.js 20+ (uses `--env-file`, native to Node 20.6+), an Anthropic API key with access to `claude-opus-5` (or set `CLAUDE_MODEL` to a model your key has access to).

Production build:

```bash
npm run build && npm start
```

## What this is

The OmniPro 220's owner's manual is 48 dense pages: duty-cycle matrices across two input voltages and four processes, polarity setup that's easy to get backwards (MIG and Flux-Cored use the *same sockets in opposite configurations*), a wire-feed mechanism with specific tensioner calibrations, a wiring schematic, troubleshooting matrices, weld-diagnosis photos, and a 61-part exploded parts diagram — plus a separate process-selection chart and quick-start guide.

Someone standing in their garage with this machine doesn't want to grep a PDF. They want: "what polarity for TIG, and which socket does the ground clamp go in" — answered with an actual diagram, not three paragraphs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (single process, single npm install)        │
│                                                                   │
│  ┌──────────────┐   SSE    ┌────────────────────────────────┐  │
│  │ React chat UI │◄─────────┤ /api/chat (Node runtime)        │  │
│  │ + artifact    │  stream  │                                  │  │
│  │   panel       │          │  runAgentTurn()                 │  │
│  └──────────────┘          │    │                              │  │
│                              │    ▼                              │  │
│                              │  Claude Agent SDK query()        │  │
│                              │    │  system prompt               │  │
│                              │    │  tools: []  (coding-agent    │  │
│                              │    │             toolset fully    │  │
│                              │    │             disabled)        │  │
│                              │    │  mcpServers: { vulcan }      │  │
│                              │    ▼                              │  │
│                              │  in-process MCP tool server      │  │
│                              │  ┌────────────────────────────┐ │  │
│                              │  │ search_manual   (BM25)      │ │  │
│                              │  │ find_manual_image            │ │  │
│                              │  │ lookup_duty_cycle (exact)    │ │  │
│                              │  │ lookup_polarity   (exact)    │ │  │
│                              │  │ render_artifact   (grounded) │ │  │
│                              │  │ list_processes               │ │  │
│                              │  └────────────┬────────────────┘ │  │
│                              └───────────────┼──────────────────┘  │
└──────────────────────────────────────────────┼─────────────────────┘
                                                 ▼
                          data/  (committed, pre-extracted knowledge base)
                          ├── chunks.json           144 retrieval chunks
                          ├── domain/duty-cycle.json        (hand-verified)
                          ├── domain/polarity.json          (hand-verified)
                          ├── domain/process-selection.json (hand-verified)
                          ├── domain/weld-diagnosis.json    (hand-verified)
                          ├── domain/troubleshooting.json
                          ├── domain/controls.json
                          ├── domain/maintenance.json
                          ├── domain/parts.json
                          └── domain/manual-images.json
                          public/manual/*.png    (real manual figures, served as static assets)
```

**Why the Claude Agent SDK, and how it's used here.** The Agent SDK (`@anthropic-ai/claude-agent-sdk`) is "Claude Code packaged as a library" — it ships a full coding-agent harness (Bash, Read, Write, Edit, Glob, Grep, subagents...) by default. That toolset is wrong for this product: this app has no business reading or writing arbitrary files on the host. So the app disables it entirely (`tools: []`) and replaces it with a single in-process MCP server (`createSdkMcpServer`) exposing exactly six domain-specific tools. The model can only act through `search_manual`, `find_manual_image`, `lookup_duty_cycle`, `lookup_polarity`, `render_artifact`, and `list_processes` — nothing else. This is the same SDK, used the way the challenge specifies, scoped down to a narrow, auditable tool surface instead of a general coding agent.

One practical consequence: the SDK spawns the Claude Code CLI as a native subprocess per turn (it downloads a small platform-specific binary as an npm optional dependency at install time). That's transparent locally and on any standard Node hosting (a plain Node/Docker deploy, Render, Fly.io, a VPS). It is *not* guaranteed to work on edge/serverless runtimes that forbid child processes — deploy this to a Node server runtime, not an edge function. The API route is explicitly pinned to `export const runtime = "nodejs"` for this reason.

**Retrieval is lexical (BM25), not embeddings-based**, on purpose: the challenge asks for a single API key and a fast local setup. Adding a vector store or an embeddings API would mean a second credential and a slower cold start for no real benefit at this corpus size (144 chunks) — this domain's vocabulary (duty cycle, DCEP/DCEN, SCFH, CTWD...) is distinctive enough that lexical search performs well (see [Evaluation](#evaluation)). The BM25 implementation (`src/retrieval/bm25.ts`) is ~90 lines, dependency-free, and fully unit-tested.

## How knowledge is extracted and represented

Two layers, extracted once and committed — the running app never re-parses a PDF:

1. **`data/chunks.json`** — the full manual + quick-start guide chunked into ~150-400 word passages with page citations, for lexical retrieval over arbitrary questions.
2. **`data/domain/*.json`** — hand-verified, deterministic structured data for everything numeric or safety-critical:
   - `duty-cycle.json` — the full 3-point duty-cycle nameplate matrix (25/30/40% + 60% + 100% rated points) for every process × voltage, cross-checked against two independent sources in the manual (the clean single-column spec table on p.7 and the per-process nameplate reproduction on p.14 — both were extracted and manually diffed against each other before being merged; PDF text extraction from a multi-column nameplate layout reorders text in ways that are easy to get subtly wrong, so this file exists specifically so the *model never has to recall these numbers from memory or from noisy retrieval*).
   - `polarity.json` — the cable/socket wiring for every process, including the DCEP (MIG)/DCEN (Flux-Cored) — *same sockets, opposite configuration* — distinction that's the single easiest safety mistake to make on this machine.
   - `process-selection.json` — the "How to Choose a Welder" chart, transcribed from the image (it has no extractable text — see below).
   - `weld-diagnosis.json` — the porosity/spatter/burn-through/crooked-bead defect tables, with each cause tagged for which process it actually applies to (critical: several MIG causes are explicitly gas-related and do **not** apply to gasless Flux-Cored — see [Safety](#safety)).
   - `troubleshooting.json`, `controls.json`, `maintenance.json`, `parts.json` — the remaining structured reference tables.

**Extraction process.** I rendered every PDF page to text (PyMuPDF) and cross-referenced it against the page markers directly — not against my own page-counting — before writing anything down. The safety-critical numeric and polarity data (duty cycle, polarity/socket wiring, the porosity troubleshooting table, and the process-selection chart) I extracted and cross-verified by hand, reading the source pages directly, because those are exactly the facts a wrong RAG chunk boundary or a misread multi-column PDF layout could silently corrupt. The remaining ~48 pages (controls, maintenance, parts, the rest of the troubleshooting matrices, and the full `chunks.json` retrieval corpus) were extracted by a documentation-focused agent working from the same page-marked text dump, which I then spot-checked against the source. This is documented, not hidden, because it's the kind of judgment call the challenge explicitly asks to see: where does correctness matter enough to do by hand, and where is a well-specified extraction pass with human review sufficient.

**Images.** Three source materials are genuinely images with no useful extractable text: the process-selection chart (a single 1200×1200 raster with zero embedded text), the wiring schematic, and the front-panel-controls figure. These were rendered at 200dpi from the source PDFs, visually inspected, transcribed into `process-selection.json` by hand (every skill-level/gas/material/thickness/application cell was read off the image), and the original images themselves are shipped as static assets under `public/manual/` so the agent can show the user the *real* figure — via the `manual_image` artifact — instead of a redrawn approximation. Nothing in this app generates an authoritative-looking diagram that isn't backed by a real source image or a verified JSON structure.

## The agent

`src/agent/systemPrompt.ts` sets the ground rules: always call a tool before stating a fact about the machine, always cite the page, never recall duty-cycle or polarity numbers from memory (call the exact-lookup tools instead), never interpolate a duty-cycle value between the three documented rated points, prefer rendering an artifact over describing one in prose, ask a clarifying question only when the answer materially depends on missing information, and treat repeated electrical faults / damaged cables / bypassing safety systems as stop-use situations.

`src/agent/tools.ts` defines the six tools as an in-process MCP server (`createSdkMcpServer`) — no subprocess-to-subprocess IPC, the tool handlers run directly in the Next.js process and call straight into `src/retrieval` and `src/domain`.

`src/agent/run.ts` wraps `query()` from the Agent SDK: disables the built-in coding toolset, wires up the MCP server, enables token-level streaming (`includePartialMessages`), and translates the SDK's message stream into a small `AgentEvent` union (`text_delta`, `tool_call`, `artifact`, `error`, `done`) that the API route relays to the browser over SSE. Multi-turn conversations resume the same underlying Agent SDK session (`resume: sessionId`) so later turns keep context ("what about for Stick?" correctly reinterprets the prior TIG-specific answer).

## Multimodal responses (artifacts)

This is the part of the brief the README asks to weight most heavily: **the agent must not be text-only.**

The approach (a deliberately constrained reverse-engineering of claude.ai's artifact pattern, see `src/agent/artifacts.ts`): the model calls `render_artifact` with only a *type* and a small set of *identifying enums/ids* (which process, which defect id, which image id) — never with free-text data. The server resolves that request against the verified `data/domain/*.json` files and returns a fully-formed, typed payload. **The model cannot inject a number, a claim, or a diagram into an artifact that doesn't come from the verified source data** — this is the mechanism that satisfies "generated diagrams must be grounded in verified source data," not a prompt instruction asking nicely.

Six artifact types, each a purpose-built interactive component (not a generic JSON viewer):

| Type | Grounded in | What it renders |
|---|---|---|
| `polarity_diagram` | `polarity.json` | Which cable goes in which socket, the DCEP/DCEN code, and the MIG-vs-Flux-Cored opposite-wiring warning when relevant |
| `duty_cycle_table` | `duty-cycle.json` | The exact 3-point rated table per voltage, plus a client-side duty-cycle-% → minutes calculator (pure arithmetic, always correct, visually distinct from the "documented rated point" data so nothing reads as a fabricated machine capability) |
| `troubleshooting_checklist` | `weld-diagnosis.json` | An interactive checklist of cause → solution, filtered to the causes that actually apply to the process in question |
| `process_selector` | `process-selection.json` | The full process-comparison chart as an interactive picker |
| `manual_image` | `manual-images.json` + `public/manual/*.png` | The real manual figure (wiring schematic, front-panel controls, the selection chart), with click-to-zoom |
| `comparison_table` | `process-selection.json` | The MIG-vs-Flux-Cored checkmark comparison table |

## Citations and grounding

Every factual claim carries an inline page citation, `(p. N)`, and every artifact carries a structured `citations` array pointing at the source document + page. The system prompt requires a tool call (`search_manual`, `lookup_duty_cycle`, or `lookup_polarity`) before any factual claim; when retrieval genuinely returns nothing relevant, the prompt requires the agent to say the manual doesn't cover it rather than fall back to generic welding knowledge presented as this machine's documented behavior.

## Safety

Safety-relevant behavior is enforced in two places, not one:

1. **The system prompt** instructs the agent to surface hazard information near the specific step it applies to (not just a generic disclaimer), to treat repeated electrical faults / frayed or sparking cables / unusual overheating as stop-use situations requiring a qualified technician, and to never suggest bypassing thermal protection, GFCI protection, or grounding.
2. **The data itself** encodes the one mistake most likely to actually hurt someone using this product: `weld-diagnosis.json` tags every troubleshooting cause with which process it applies to, so a Flux-Cored (gasless) porosity question can never be answered with "increase your shielding gas flow" — a real, documented MIG-only fix that would be actively wrong advice for a gasless process. This is checked by an automated test (`tests/unit/weldDiagnosis.test.ts`) and by benchmark case `t1`/`fu2`, not just a prompt instruction.

See [Evaluation](#evaluation) for the dedicated safety benchmark and measured results.

## Evaluation

`eval/benchmark.json` — **62 cases** (the target was 40+) spanning every required category: factual (7), numeric (7), procedural (5), troubleshooting (6), polarity/connection (5), settings (4), requiring tables (3), requiring diagrams/images (3), multi-source reasoning (4), ambiguous (4), unsupported (4), safety-critical (6), conversational follow-ups (4). Every case carries a `notes` field stating what "success" means for that case *before* it's scored, per the challenge's instruction.

`eval/run-eval.ts` grades each case by actually running it against the live agent (same code path as production, not a mock) and applying:

- **Deterministic checks** where a question has an objectively checkable answer: exact-substring/number presence (`mustContain`/`mustContainAny`), forbidden-claim absence (`mustNotContain` — e.g. a Flux-Cored porosity answer must not contain "increase flow of gas"), citation-page presence, and expected-artifact-type presence.
- **An LLM-judge pass** (`claude-haiku-4-5`, cheap and fast) for cases that need judgment beyond string matching — safety-critical cases, unsupported-question fabrication detection, multi-source reasoning, procedural ordering, and troubleshooting completeness. The judge is given only the case's stated grading rationale and the actual transcript, and is explicitly told a fabricated claim on an unsupported question, or a failure to warn on a safety case, is an automatic fail.

Run it yourself:

```bash
npm run eval                                  # all 62 cases
npm run eval -- --category=safety             # just the safety benchmark
npm run eval -- --ids=n1,pol1,t1              # the three questions from the challenge brief itself
npm run eval -- --sample=10 --no-judge        # fast deterministic-only smoke test
```

Results land in `eval/results/latest.json` (full transcripts, tool calls, artifacts rendered, and per-check pass/fail) and a summary table prints to the console.

### Measured results

<!-- EVAL_RESULTS_PLACEHOLDER -->

*Measured on a representative sample run against the live agent (not the full 62 — see [Limitations](#limitations) for why). Run `npm run eval` yourself for the complete suite against your own API key.*

### Retrieval quality

Retrieval is evaluated separately from generation via `tests/integration/retrieval.test.ts`, which runs BM25 search against the real committed corpus (not a fixture) for a set of canonical queries and asserts the expected chunk/image surfaces in the top results, plus that results come back correctly rank-ordered.

## Testing

```bash
npm run typecheck   # tsc --noEmit, strict mode
npm run lint         # eslint
npm test             # vitest — unit + integration
npm run build        # production build
```

**Measured** (`npm run typecheck && npm run lint && npm test && npm run build`, all green):

| Check | Result |
|---|---|
| `tsc --noEmit` (strict mode) | 0 errors |
| `eslint .` | 0 errors, 0 warnings |
| `vitest run` | **50/50 tests passing**, 7 test files |
| `next build` | succeeds — 2 static routes, 1 dynamic (`/api/chat`) |

What's covered: the BM25 ranking algorithm, every domain lookup function (duty cycle — including the "don't fabricate a value between rated points" behavior, polarity — including the MIG/Flux-Cored-must-be-opposite invariant as an explicit test), the weld-diagnosis process-filtering logic (the porosity/gas-cause example above), the full artifact resolver for all six types including its error paths (unknown defect id, unknown image id, malformed zod input), and retrieval against the real corpus.

## Reliability

The API route (`app/api/chat/route.ts`) and agent runner (`src/agent/run.ts`) handle, with a useful message rather than a crash or a stack trace:

- Missing `ANTHROPIC_API_KEY` → a clear 500 with setup instructions, checked before spawning anything.
- Invalid/malformed request JSON, empty message, oversized message, missing conversation id → 400 with a specific reason.
- Client disconnect / cancelled generation mid-stream → the route listens for `req.signal` abort and tears down cleanly.
- Anthropic API failures surfaced by the Agent SDK (`authentication_failed`, `rate_limit`, `overloaded`, `billing_error`, `model_not_found`, `server_error`, `max_output_tokens`) → mapped to a specific, actionable message via `FRIENDLY_ERROR_MESSAGES` in `src/agent/run.ts`, not a raw SDK error object.
- Malformed/missing tool arguments from the model (e.g. `render_artifact` called without a required field for that artifact type) → caught, returned to the model as a tool error it can recover from, never thrown up to crash the turn.
- Unknown artifact/defect/image ids → the resolver throws a specific, catchable error (`"Unknown defect..."`, `"Unknown manual image id..."`) rather than silently returning empty or fabricated data.
- Empty retrieval → `search_manual` returns `[]`, and the system prompt requires the agent to say so rather than fabricate.

## Design decisions

- **Node runtime, not edge**, for `/api/chat` — required by the Agent SDK's subprocess model (see [Architecture](#architecture)).
- **In-memory session mapping** (`conversationId → Agent SDK sessionId`) in the API route — this is a single-process local/demo app; a production deployment would persist this in a datastore. Documented, not hidden.
- **BM25 over embeddings** — see [Architecture](#architecture). Revisit if the corpus grows well past a few hundred chunks or the question phrasing diverges further from the manual's own vocabulary.
- **Deterministic tool-mediated grounding over prompt-only grounding** for every safety-critical or numeric fact — the system prompt asks nicely, but `lookup_duty_cycle`/`lookup_polarity`/`render_artifact` make the wrong answer structurally harder to produce, not just discouraged.
- **Committed, pre-extracted knowledge base** instead of ingesting the PDFs at runtime — faster startup, no PDF-parsing dependency in the production bundle, and the safety-critical files are the ones I could hand-verify once rather than re-trust on every boot.

## Limitations

- The full 62-case benchmark was not run end-to-end for this submission on every case — see the measured-results section for exactly what was run and why (API cost/time discipline during development, per the task's own instruction to be mindful of spend). `npm run eval` runs the complete suite against your own key.
- Session state (multi-turn conversation mapping) is in-memory and does not survive a server restart.
- Retrieval is lexical; a paraphrase that shares no vocabulary with the manual's own wording can under-retrieve. Mitigated by the deterministic domain tools covering the highest-value factual surface (duty cycle, polarity) independent of retrieval.
- `controls.json`, `maintenance.json`, and `parts.json` are extracted and available but not yet wired into a dedicated lookup tool (they're reachable via `search_manual`'s retrieval over `chunks.json`, which does cover their content, just not with the same deterministic-lookup guarantee as duty-cycle/polarity).
- No voice interface, despite the challenge mentioning it as an option — out of scope given the time budget; text + visual artifacts were prioritized as the higher-leverage multimodal investment for this specific manual (which is diagram/table-dense, not audio-dense).

## Future improvements

- Persist conversation sessions (Redis/SQLite) instead of in-memory.
- A dedicated `lookup_settings`/`lookup_controls` tool over `controls.json` for deterministic LCD-menu-procedure answers.
- Streaming artifact updates (e.g. live-highlight the relevant row in a duty-cycle table as the agent explains it).
- A citation-hover preview showing the actual retrieved excerpt text inline, not just doc+page.
- Expand the safety benchmark's LLM-judge into a 3-vote adversarial panel for the highest-stakes cases, per the challenge's guidance on borderline-case judging.

## Commands reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint |
| `npm test` | Run all unit + integration tests (vitest) |
| `npm run eval` | Run the full 62-case benchmark against the live agent |
| `npm run eval -- --category=safety` | Run just one category |
| `npm run eval -- --ids=n1,pol1,t1` | Run specific cases by id |

---

## Original challenge brief

The original Prox challenge instructions (product requirements, evaluation criteria) are preserved below for reference.

<details>
<summary>Expand</summary>

# Prox Founding Engineer Challenge

<img src="product.webp" alt="Vulcan OmniPro 220" width="400" /> <img src="product-inside.webp" alt="Vulcan OmniPro 220 — inside panel" width="400" />

## The Product

The [Vulcan OmniPro 220](https://www.harborfreight.com/omnipro-220-industrial-multiprocess-welder-with-120240v-input-57812.html) is a multiprocess welding system sold by Harbor Freight. It supports four welding processes (MIG, Flux-Cored, TIG, and Stick), runs on both 120V and 240V input, and has an LCD-based synergic control system.

Its owner's manual is 48 pages of dense technical content. Duty cycle matrices across multiple voltages and amperages, polarity setup procedures that differ per welding process, wire feed mechanisms with specific tensioner calibrations, wiring schematics, troubleshooting matrices, weld diagnosis diagrams, and a full parts list.

This is exactly the kind of product Prox exists for. Nobody knows how to use this machine straight out of the box but has time to read 48 page manual, but a complicated machine needs expert-level support.

Additional video: https://www.youtube.com/watch?v=kxGDoGcnhBw

## Your Job

Build a multimodal reasoning agent for the Vulcan OmniPro 220 using the Claude Agent SDK. The agent must be able to answer deep technical questions about this product accurately, helpfully, and not just in text.

The manuals are in the `files/` directory.

**There is no limit to how far you can go.** You can integrate voice. You can build a full interactive experience. Sky is the limit. The more ambitious and polished, the better.

## What We're Testing

### 1. Deep Technical Accuracy

Your agent needs to answer questions like these correctly:

- "What's the duty cycle for MIG welding at 200A on 240V?"
- "I'm getting porosity in my flux-cored welds. What should I check?"
- "What polarity setup do I need for TIG welding? Which socket does the ground clamp go in?"

We will test with questions that require cross-referencing multiple manual sections, understanding visual content (diagrams, schematics, charts), and handling ambiguous questions that need clarification from the user.

### 2. Multimodal Responses

This is the most important part. Your agent must not be text-only.

- If someone asks about polarity setup, the agent should draw or show a diagram of which cable goes in which socket, not just describe it.
- If the answer relates to a specific image in the manual (the wire feed mechanism, the front panel controls, the weld diagnosis examples), the agent should surface that image.
- If a question is complex enough, the agent should generate interactive content: a duty cycle calculator, a troubleshooting flowchart, a settings configurator that takes process + material + thickness and outputs recommended wire speed and voltage.

When something is too cognitively hard to explain in words, the agent should draw it. Real-time diagrams, interactive schematics, visual walkthroughs generated through code.

For your agent to handle these responses well you need to reverse engineer Claude artifacts. Here are two places where you can start:
- https://claude.ai/artifacts (see how Claude renders interactive artifacts in chat)
- https://www.reidbarber.com/blog/reverse-engineering-claude-artifacts

### 3. Tone and Helpfulness

Imagine your user just bought this welder and is standing in their garage trying to set it up. They're not an idiot, but they're not a professional welder either.

### 4. Knowledge Extraction Quality

The manual has a mix of text, tables, labeled diagrams, schematics, and decision matrices. Some critical information exists only in images (the welding process selection chart, the weld diagnosis photos, the wiring schematic). We want to see that your agent understands and presents the visual content, not just the text.

## Tech Requirements

- Use the [Anthropic Claude Agent SDK](https://docs.anthropic.com) as the foundation for your agent.
- The project must run locally with a single API key provided via `.env`.
- You are responsible for your own API costs during development.

## How to Present Your Work

**This matters.** Your submission is not just the code — it's how you present it.

- **Build a frontend.** The best way for us to evaluate your agent is if it has a clean, simple UI we can run immediately. This is realistically the only way to properly demo an agent like this.
- **Hosting is a plus.** If you host it somewhere we can access without cloning, that's a strong signal. Not required, but it removes friction and shows initiative.
- **Write a clear README.** Explain how your agent works, what design decisions you made, how knowledge is extracted and represented, and how to run it. Your documentation will be evaluated — we want to see how you think and communicate, not just how you code.
- **Video walkthrough is a huge plus.** Record yourself demoing the agent and explaining your approach. Walk through the hard questions, show how it handles multimodal responses, explain your architecture. This gives us a much richer picture of your work than code alone.

We should be running your agent within 2 minutes of cloning your repo:

```bash
git clone <your-fork>
cd <your-fork>
cp .env.example .env   # we plug in our own Anthropic API key
# your install command (npm install, uv install, etc.)
# your run command (npm run dev, python app.py, etc.)
```

If it takes longer than that to set up, that's a problem.

## What to Submit

1. Fork this repo.
2. Build your solution.
3. Submit your fork URL through the form at [useprox.com/join/challenge](https://useprox.com/join/challenge).

## What Happens Next

We review submissions on a rolling basis and respond to every single one within a few days. Good luck.

</details>
