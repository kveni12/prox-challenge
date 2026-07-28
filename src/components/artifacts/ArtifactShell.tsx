import type { ReactNode } from "react";
import type { Citation } from "@/domain/types";
import { SourceTag } from "@/components/chat/CitationChip";

export function ArtifactShell({
  title,
  eyebrow,
  icon,
  citations,
  children,
  headerExtra,
}: {
  title: string;
  eyebrow: string;
  icon?: ReactNode;
  citations: Citation[];
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="my-2 w-full overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-[0_1px_3px_rgb(var(--shadow-color)/0.08)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon ? <span className="mt-0.5 shrink-0 text-accent">{icon}</span> : null}
          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-fg-subtle">
              {eyebrow}
            </p>
            <h3 className="font-display truncate text-[0.95rem] font-semibold text-fg sm:text-base">{title}</h3>
          </div>
        </div>
        {headerExtra}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
      {citations.length > 0 ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
          <span className="font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">Source</span>
          {citations.map((c) => (
            <SourceTag key={`${c.doc}-${c.page}-${c.label ?? ""}`} citation={c} />
          ))}
        </footer>
      ) : null}
    </section>
  );
}
