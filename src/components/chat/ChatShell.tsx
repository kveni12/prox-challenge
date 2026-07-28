"use client";

import { useChat } from "@/hooks/useChat";
import { CitationProvider } from "./CitationContext";
import { Header } from "./Header";
import { EmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatShell() {
  const { messages, isStreaming, sendMessage, retry, resetConversation } = useChat();
  const hasMessages = messages.length > 0;

  return (
    <CitationProvider>
      <div className="flex h-dvh flex-col bg-bg">
        <Header onNewConversation={resetConversation} canReset={hasMessages} />

        <main id="main" className="flex-1 overflow-y-auto" aria-label="Conversation">
          {hasMessages ? (
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              onRetry={retry}
              onSelectFollowup={sendMessage}
            />
          ) : (
            <EmptyState onSelectPrompt={sendMessage} />
          )}
        </main>

        <footer className="border-t border-border bg-bg px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Composer onSend={sendMessage} disabled={isStreaming} />
            <p className="mt-2 text-center text-[0.68rem] text-fg-subtle">
              Answers are grounded in the Vulcan OmniPro 220 documentation and cited by page. Verify safety-critical
              steps against the physical manual before working on the machine.
            </p>
          </div>
        </footer>
      </div>
    </CitationProvider>
  );
}
