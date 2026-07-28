import { runAgentTurn } from "@/agent/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory conversationId -> Claude Agent SDK sessionId mapping.
// This is a single-process demo app; conversations don't survive a server
// restart. A production deployment would persist this in a datastore.
const sessionMap = new Map<string, string>();

interface ChatRequestBody {
  message?: unknown;
  conversationId?: unknown;
}

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: "missing_api_key",
        message:
          "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your Anthropic API key, then restart the server.",
      },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  if (!message) {
    return Response.json({ error: "empty_message", message: "message must be a non-empty string." }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json(
      { error: "message_too_long", message: "Keep questions under 4000 characters." },
      { status: 400 },
    );
  }
  if (!conversationId) {
    return Response.json(
      { error: "missing_conversation_id", message: "conversationId is required." },
      { status: 400 },
    );
  }

  const resumeSessionId = sessionMap.get(conversationId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const abort = () => controller.close();
      req.signal.addEventListener("abort", abort);

      try {
        for await (const event of runAgentTurn({ prompt: message, resumeSessionId })) {
          if (event.type === "session") {
            sessionMap.set(conversationId, event.sessionId);
          }
          controller.enqueue(sse(event));
        }
      } catch (err) {
        controller.enqueue(
          sse({
            type: "error",
            message: err instanceof Error ? err.message : "Unexpected server error.",
          }),
        );
      } finally {
        req.signal.removeEventListener("abort", abort);
        try {
          controller.close();
        } catch {
          // already closed by client abort
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
