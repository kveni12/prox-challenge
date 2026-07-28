import type { Citation } from "@/domain/types";
import { BookIcon } from "@/components/ui/icons";
import { SourceTag } from "./CitationChip";

export function SourcesStrip({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
      <BookIcon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <span className="mr-0.5 text-[0.7rem] font-medium text-fg-subtle">Sources:</span>
      {citations.map((c) => (
        <SourceTag key={`${c.doc}-${c.page}-${c.label ?? ""}`} citation={c} />
      ))}
    </div>
  );
}
