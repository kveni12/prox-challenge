"use client";

import { ThemeToggle } from "./ThemeToggle";
import { IconButton } from "@/components/ui/Button";
import { PlusIcon, SparkIcon } from "@/components/ui/icons";

export function Header({ onNewConversation, canReset }: { onNewConversation: () => void; canReset: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <SparkIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-display truncate text-sm font-semibold text-fg">Vulcan OmniPro 220</p>
            <p className="truncate font-mono text-[0.65rem] uppercase tracking-wider text-fg-subtle">
              Welding Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReset ? (
            <IconButton label="Start a new conversation" onClick={onNewConversation}>
              <PlusIcon className="h-4.5 w-4.5" />
            </IconButton>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
