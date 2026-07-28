import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { PolarityDiagramData } from "./types";
import { AlertIcon, WrenchIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";

function splitSteps(instructions: string): string[] {
  return instructions
    .split(/(?<=[.:])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Socket({
  polarity,
  cableName,
}: {
  polarity: "positive" | "negative";
  cableName: string;
}) {
  const isPositive = polarity === "positive";
  return (
    <div className="flex flex-1 flex-col items-center gap-3 rounded-xl border border-[#4b4029] bg-[#221c14] p-4 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border-4 font-mono text-2xl font-bold ${
          isPositive
            ? "border-positive text-positive bg-positive-soft"
            : "border-negative text-negative bg-negative-soft"
        }`}
        aria-hidden="true"
      >
        {isPositive ? "+" : "−"}
      </span>
      <div>
        <p className={`font-mono text-xs font-bold uppercase tracking-wide ${isPositive ? "text-positive" : "text-negative"}`}>
          {isPositive ? "Positive Socket" : "Negative Socket"}
        </p>
        <p className="mt-1 text-sm font-medium text-[#f3ede1]">{cableName}</p>
      </div>
    </div>
  );
}

export function PolarityDiagram({ data, citations }: { data: PolarityDiagramData; citations: Citation[] }) {
  const negativeCable = data.groundClampSocket === "negative" ? "Ground Clamp Cable" : data.torchOrWireCableName;
  const positiveCable = data.groundClampSocket === "positive" ? "Ground Clamp Cable" : data.torchOrWireCableName;
  const steps = splitSteps(data.instructions);

  return (
    <ArtifactShell
      title={data.displayName}
      eyebrow="Polarity Setup"
      icon={<WrenchIcon className="h-4 w-4" />}
      citations={citations}
      headerExtra={
        <Badge tone="accent" mono>
          {data.polarityCode}
        </Badge>
      }
    >
      {data.warning ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-warn-soft-border bg-warn-soft px-3.5 py-3"
        >
          <AlertIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warn" />
          <p className="text-sm font-medium leading-snug text-warn">{data.warning}</p>
        </div>
      ) : null}

      <p className="mb-4 text-xs text-fg-subtle">{data.polarityName}</p>

      <div className="mb-4 rounded-xl border border-[#382f20] bg-[#17130d] p-4">
        <p className="mb-3 text-center font-mono text-[0.65rem] uppercase tracking-widest text-[#8a7d67]">
          Front Panel Sockets
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Socket polarity="negative" cableName={negativeCable} />
          <Socket polarity="positive" cableName={positiveCable} />
        </div>
      </div>

      {steps.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-fg">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[0.7rem] font-semibold text-fg-muted">
                {i + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {data.caveat ? (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-fg-muted">
          {data.caveat}
        </div>
      ) : null}
    </ArtifactShell>
  );
}
