import { query } from "@anthropic-ai/claude-agent-sdk";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { createVulcanTools } from "./tools";
import type { ResolvedArtifact } from "./artifacts";

export type AgentEvent =
  | { type: "text_delta"; text: string }
  | { type: "artifact"; artifact: ResolvedArtifact }
  | { type: "tool_call"; toolName: string }
  | { type: "session"; sessionId: string }
  | { type: "error"; message: string; code?: string }
  | { type: "done" };

export interface RunAgentTurnParams {
  prompt: string;
  resumeSessionId?: string;
  model?: string;
  /** Aborted when the client disconnects, so an abandoned turn doesn't keep calling tools and spending API budget for a response nobody will see. */
  signal?: AbortSignal;
}

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  authentication_failed: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in your .env file.",
  oauth_org_not_allowed: "This Anthropic account/organization isn't allowed to use the configured model.",
  billing_error: "The Anthropic account has a billing issue (e.g. no credit). Check your Anthropic Console billing page.",
  rate_limit: "Hit an Anthropic API rate limit. Wait a moment and try again.",
  overloaded: "Anthropic's API is temporarily overloaded. Try again in a few seconds.",
  invalid_request: "The request to Claude was malformed. This is likely a bug in the app — please report it.",
  model_not_found: "The configured model isn't available for this API key. Try unsetting CLAUDE_MODEL or check your account's model access.",
  server_error: "Anthropic's API had a server-side error. Try again.",
  max_output_tokens: "The response hit the model's output limit before finishing.",
  unknown: "An unexpected error occurred while talking to Claude.",
};

/**
 * Runs one user turn against the domain agent and yields a stream of UI
 * events. The Claude Agent SDK's own coding-agent toolset (Bash/Read/Write/
 * etc.) is fully disabled — `tools: []` — and replaced with the in-process
 * MCP server defined in ./tools, so the model can only act through the four
 * domain tools plus render_artifact.
 */
export async function* runAgentTurn(params: RunAgentTurnParams): AsyncGenerator<AgentEvent> {
  const { server, artifactBus } = createVulcanTools();
  let flushedArtifactCount = 0;

  function* flushArtifacts(): Generator<AgentEvent> {
    while (flushedArtifactCount < artifactBus.length) {
      yield { type: "artifact", artifact: artifactBus[flushedArtifactCount]! };
      flushedArtifactCount += 1;
    }
  }

  // Bridge the caller's AbortSignal (the HTTP request) onto the AbortController
  // the SDK expects, so a client disconnect actually stops the CLI subprocess
  // instead of letting an abandoned turn keep calling tools and spending API
  // budget for a response nobody will see.
  const abortController = new AbortController();
  if (params.signal) {
    if (params.signal.aborted) abortController.abort();
    else params.signal.addEventListener("abort", () => abortController.abort(), { once: true });
  }

  const stream = query({
    prompt: params.prompt,
    options: {
      abortController,
      model: params.model ?? DEFAULT_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      tools: [],
      mcpServers: { vulcan: server },
      allowedTools: [
        "mcp__vulcan__search_manual",
        "mcp__vulcan__find_manual_image",
        "mcp__vulcan__lookup_duty_cycle",
        "mcp__vulcan__lookup_polarity",
        "mcp__vulcan__lookup_troubleshooting",
        "mcp__vulcan__render_artifact",
        "mcp__vulcan__list_processes",
      ],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      includePartialMessages: true,
      resume: params.resumeSessionId,
      maxTurns: 12,
    },
  });

  try {
    for await (const message of stream) {
      switch (message.type) {
        case "system": {
          if (message.subtype === "init") {
            yield { type: "session", sessionId: message.session_id };
          }
          break;
        }
        case "stream_event": {
          const event = message.event;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield { type: "text_delta", text: event.delta.text };
          }
          yield* flushArtifacts();
          break;
        }
        case "assistant": {
          if (message.error) {
            yield {
              type: "error",
              message: FRIENDLY_ERROR_MESSAGES[message.error] ?? FRIENDLY_ERROR_MESSAGES.unknown!,
              code: message.error,
            };
          }
          for (const block of message.message.content) {
            if (block.type === "tool_use" && block.name.startsWith("mcp__vulcan__")) {
              yield { type: "tool_call", toolName: block.name.replace("mcp__vulcan__", "") };
            }
          }
          yield* flushArtifacts();
          break;
        }
        case "result": {
          yield* flushArtifacts();
          if (message.subtype !== "success") {
            yield {
              type: "error",
              message: message.subtype === "error_max_turns" ? "The agent used too many steps and stopped early." : "The agent stopped before finishing.",
              code: message.subtype,
            };
          }
          break;
        }
        default:
          break;
      }
    }
    yield* flushArtifacts();
    yield { type: "done" };
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : "Unknown agent error." };
  } finally {
    stream.close();
  }
}
