import { ArrowRightIcon } from "@/components/ui/icons";

export function FollowupChips({ suggestions, onSelect }: { suggestions: string[]; onSelect: (text: string) => void }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="ml-1 mt-2 flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent-soft-border hover:bg-accent-soft hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          {s}
          <ArrowRightIcon className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
