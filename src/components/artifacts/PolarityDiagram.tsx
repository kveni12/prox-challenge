import Image from "next/image";
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

/**
 * Pixel-verified against the real product photo (public/product-front-panel.webp,
 * 1200x1200): the two live sockets sit at these coordinates regardless of which
 * process is being explained, so the marker position is fixed while only the
 * label/color per socket changes with `data`.
 */
const SOCKET_POSITION = {
  negative: { left: "68.7%", top: "79.6%" },
  positive: { left: "85%", top: "80%" },
} as const;

function SocketHotspot({
  polarity,
  cableName,
  labelSide,
}: {
  polarity: "positive" | "negative";
  cableName: string;
  labelSide: "left" | "right";
}) {
  const isPositive = polarity === "positive";
  const position = SOCKET_POSITION[polarity];
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: position.left, top: position.top, transform: "translate(-50%, -100%)" }}
    >
      <div
        className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-center shadow-lg ${
          isPositive
            ? "border-positive/50 bg-positive-soft/95"
            : "border-negative/50 bg-negative-soft/95"
        } ${labelSide === "right" ? "translate-x-[38%]" : "-translate-x-[38%]"}`}
      >
        <p className={`font-mono text-[0.62rem] font-bold uppercase tracking-wide ${isPositive ? "text-positive" : "text-negative"}`}>
          {isPositive ? "+ Positive" : "− Negative"}
        </p>
        <p className="text-[0.68rem] font-medium leading-tight text-[#1a1610]">{cableName}</p>
      </div>
      <span
        aria-hidden="true"
        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold ring-4 ring-black/20 ${
          isPositive
            ? "border-positive bg-positive text-white"
            : "border-negative bg-negative text-white"
        }`}
      >
        {isPositive ? "+" : "−"}
      </span>
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

      <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-[#0c0a06] pt-3">
        <p className="mb-1 text-center font-mono text-[0.62rem] uppercase tracking-widest text-[#8a7d67]">
          Actual Front-Panel Sockets — Vulcan OmniPro 220
        </p>
        <div className="relative mx-auto w-full max-w-md">
          <Image
            src="/product-front-panel.webp"
            alt="Vulcan OmniPro 220 front panel, showing the two output sockets"
            width={1200}
            height={1200}
            sizes="(max-width: 640px) 90vw, 448px"
            className="h-auto w-full select-none"
            priority={false}
          />
          <SocketHotspot polarity="negative" cableName={negativeCable} labelSide="left" />
          <SocketHotspot polarity="positive" cableName={positiveCable} labelSide="right" />
        </div>
      </div>

      {steps.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-2.5 text-sm text-fg">
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
