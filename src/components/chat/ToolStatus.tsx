import { TOOL_STATUS_LABEL } from "@/hooks/useChat";

function Spinner() {
  return (
    <span className="relative flex h-3.5 w-3.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
      <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent" />
    </span>
  );
}

export function ToolStatusLive({ toolName }: { toolName: string }) {
  const label = TOOL_STATUS_LABEL[toolName] ?? `Running ${toolName}…`;
  return (
    <div
      role="status"
      className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-muted"
    >
      <Spinner />
      {label}
    </div>
  );
}

export function ToolCallsSummary({ toolNames }: { toolNames: string[] }) {
  if (toolNames.length === 0) return null;
  const unique = [...new Set(toolNames)];
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.68rem] text-fg-subtle">
      <span className="font-mono uppercase tracking-wide">Grounded via</span>
      {unique.map((t) => (
        <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono">
          {t}
        </span>
      ))}
    </p>
  );
}
