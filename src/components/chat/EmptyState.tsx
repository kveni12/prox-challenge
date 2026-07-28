import { SuggestedPrompts } from "./SuggestedPrompts";
import { SparkIcon } from "@/components/ui/icons";

export function EmptyState({ onSelectPrompt }: { onSelectPrompt: (text: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 text-center sm:py-16">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-soft-border bg-accent-soft text-accent">
        <SparkIcon className="h-6 w-6" />
      </span>
      <h1 className="font-display text-2xl font-semibold text-fg sm:text-3xl">Vulcan OmniPro 220</h1>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-fg-subtle">Welding Assistant</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted">
        Grounded answers on polarity, duty cycle, process selection, and troubleshooting — pulled straight from the
        owner&apos;s manual, cited by page, with diagrams instead of walls of text.
      </p>

      <div className="mt-8 w-full text-left">
        <p className="mb-2.5 px-1 font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">Try asking</p>
        <SuggestedPrompts onSelect={onSelectPrompt} />
      </div>
    </div>
  );
}
