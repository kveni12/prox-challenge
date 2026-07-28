"use client";

import type { Citation } from "@/domain/types";
import { docLabel } from "@/lib/citations";
import { useCitations } from "./CitationContext";

export function CitationChip({ citation, children }: { citation: Citation; children?: React.ReactNode }) {
  const { openCitation } = useCitations();
  const label = `${docLabel(citation.doc)}, p. ${citation.page}`;
  return (
    <button
      type="button"
      className="citation-chip"
      title={`Source: ${label}`}
      aria-label={`Source: ${label}`}
      onClick={() => openCitation(citation)}
    >
      {children ?? `p. ${citation.page}`}
    </button>
  );
}

export function SourceTag({ citation }: { citation: Citation }) {
  const { openCitation } = useCitations();
  return (
    <button
      type="button"
      onClick={() => openCitation(citation)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-[0.7rem] font-medium text-fg-muted transition-colors hover:border-accent-soft-border hover:bg-accent-soft hover:text-accent"
    >
      {docLabel(citation.doc)}
      <span className="text-fg-subtle">·</span>
      p.{citation.page}
    </button>
  );
}
