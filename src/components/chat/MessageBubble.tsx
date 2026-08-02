"use client";

import type { ChatMessage } from "@/hooks/useChat";
import type { ImageAttachment } from "@/agent/run";
import { useStreamAnnouncement } from "@/hooks/useStreamAnnouncement";
import { MarkdownMessage } from "./MarkdownMessage";
import { ArtifactRenderer } from "@/components/artifacts/ArtifactRenderer";
import { ToolStatusLive, ToolCallsSummary } from "./ToolStatus";
import { ErrorBanner } from "./ErrorBanner";
import { SourcesStrip } from "./SourcesStrip";
import { parseCitations, dedupeCitations, extractInlineCitations, linkifyCitations } from "@/lib/citations";

function UserBubble({ text, image }: { text: string; image?: ImageAttachment }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-fg shadow-sm sm:max-w-[75%]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, not an optimizable remote asset
          <img
            src={`data:${image.mediaType};base64,${image.data}`}
            alt="Attached weld photo"
            className="mb-2 max-h-64 w-full rounded-lg object-cover"
          />
        ) : null}
        {text ? <p className="whitespace-pre-wrap leading-relaxed">{text}</p> : null}
      </div>
    </div>
  );
}

function AssistantBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const announcement = useStreamAnnouncement(message.text, message.status === "streaming");
  const lastToolCall = message.toolCalls[message.toolCalls.length - 1];
  const showLiveTool = message.status === "streaming" && message.text.length === 0 && lastToolCall !== undefined;

  const allCitations = dedupeCitations([
    ...message.artifacts.flatMap((a) => parseCitations(a.citations)),
    ...extractInlineCitations(linkifyCitations(message.text)),
  ]);

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] sm:max-w-[85%]">
        <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3 text-sm shadow-sm">
          {showLiveTool ? <ToolStatusLive toolName={lastToolCall} /> : null}

          <div>
            {message.text ? (
              <MarkdownMessage text={message.text} />
            ) : message.status === "streaming" && !showLiveTool ? (
              <span className="inline-flex items-center gap-1 text-fg-subtle">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-fg-subtle [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-fg-subtle [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-fg-subtle [animation-delay:300ms]" />
              </span>
            ) : null}
          </div>
          {/* Screen-reader-only channel: periodic, incremental updates instead of
              announcing every streamed token or re-reading the whole message. */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>

          {message.artifacts.map((artifact) => (
            <ArtifactRenderer key={artifact.id} artifact={artifact} />
          ))}

          {message.status === "error" && message.errorMessage ? (
            <div className="mt-2">
              <ErrorBanner message={message.errorMessage} onRetry={onRetry} />
            </div>
          ) : null}

          {message.status === "done" ? <ToolCallsSummary toolNames={message.toolCalls} /> : null}
        </div>

        {message.status === "done" ? <SourcesStrip citations={allCitations} /> : null}
      </div>
    </div>
  );
}

export function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  if (message.role === "user") return <UserBubble text={message.text} image={message.image} />;
  return <AssistantBubble message={message} onRetry={onRetry} />;
}
