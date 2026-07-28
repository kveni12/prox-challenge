"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { FollowupChips } from "./FollowupChips";
import { getFollowups } from "@/lib/followups";

export function MessageList({
  messages,
  isStreaming,
  onRetry,
  onSelectFollowup,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  onRetry: () => void;
  onSelectFollowup: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const showFollowups =
    !isStreaming && lastMessage !== undefined && lastMessage.role === "assistant" && lastMessage.status === "done";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onRetry={onRetry} />
      ))}
      {showFollowups && lastMessage ? (
        <FollowupChips suggestions={getFollowups(lastMessage)} onSelect={onSelectFollowup} />
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
