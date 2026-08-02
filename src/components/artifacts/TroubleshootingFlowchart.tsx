"use client";

import { useState } from "react";
import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { TroubleshootingFlowchartData } from "./types";
import { CheckIcon, WrenchIcon, RefreshIcon, AlertIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_PAGE: Record<TroubleshootingFlowchartData["category"], number> = {
  wireWeld: 37,
  stickWeld: 40,
};

function StepTrail({
  total,
  current,
  resolvedIndex,
}: {
  total: number;
  current: number;
  resolvedIndex: number | null;
}) {
  return (
    <div className="mb-4 flex items-center" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const isResolved = i === resolvedIndex;
        const isRuledOut = resolvedIndex !== null ? i < resolvedIndex : i < current;
        const isCurrent = resolvedIndex === null && i === current;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[0.65rem] font-bold transition-colors ${
                isResolved
                  ? "bg-success text-accent-fg"
                  : isRuledOut
                    ? "bg-surface-2 text-fg-subtle line-through"
                    : isCurrent
                      ? "bg-accent text-accent-fg"
                      : "border border-border text-fg-subtle"
              }`}
            >
              {isResolved ? <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            {i < total - 1 ? <span className="h-px flex-1 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function TroubleshootingFlowchart({
  data,
  citations,
}: {
  data: TroubleshootingFlowchartData;
  citations: Citation[];
}) {
  const { defect } = data;
  const causes = defect.causes;
  const [stepIndex, setStepIndex] = useState(0);
  const [resolvedIndex, setResolvedIndex] = useState<number | null>(null);

  const exhausted = resolvedIndex === null && stepIndex >= causes.length;
  const current = resolvedIndex === null && !exhausted ? causes[stepIndex] : null;

  const reset = () => {
    setStepIndex(0);
    setResolvedIndex(null);
  };

  const effectiveCitations: Citation[] =
    citations.length > 0
      ? citations
      : [{ doc: "owner-manual", page: CATEGORY_PAGE[data.category], label: "Weld Diagnosis" }];

  return (
    <ArtifactShell
      title={defect.name}
      eyebrow="Troubleshooting Flowchart"
      icon={<WrenchIcon className="h-4 w-4" />}
      citations={effectiveCitations}
      headerExtra={
        <Badge tone={resolvedIndex !== null ? "success" : exhausted ? "neutral" : "accent"}>
          {resolvedIndex !== null ? "Resolved" : exhausted ? "Not found" : `Step ${stepIndex + 1}/${causes.length}`}
        </Badge>
      }
    >
      {defect.description ? <p className="mb-4 text-sm leading-relaxed text-fg-muted">{defect.description}</p> : null}
      {data.process ? (
        <p className="mb-3 text-xs text-fg-subtle">
          Filtered for <span className="font-mono font-medium text-fg-muted">{data.process}</span> — causes that only
          apply to other processes are hidden.
        </p>
      ) : null}

      {causes.length === 0 ? (
        <p className="text-sm text-fg-muted">No documented causes for this process/defect combination.</p>
      ) : (
        <>
          <StepTrail total={causes.length} current={stepIndex} resolvedIndex={resolvedIndex} />

          {current ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Possible cause</p>
              <p className="mb-3 text-base font-semibold text-fg">{current.cause}</p>
              {current.note ? <p className="mb-3 text-xs italic text-fg-subtle">{current.note}</p> : null}
              <p className="mb-4 text-sm text-fg-muted">Does this match what you&apos;re seeing?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResolvedIndex(stepIndex)}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong"
                >
                  Yes — show me the fix
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => i + 1)}
                  className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  No, try the next one
                </button>
              </div>
            </div>
          ) : resolvedIndex !== null ? (
            <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-accent-fg">
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <p className="text-sm font-semibold text-success">{causes[resolvedIndex]!.cause}</p>
              </div>
              <p className="text-sm leading-relaxed text-fg">{causes[resolvedIndex]!.solution}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-warn-soft-border bg-warn-soft px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertIcon className="h-4.5 w-4.5 shrink-0 text-warn" />
                <p className="text-sm font-semibold text-warn">None of the documented causes matched</p>
              </div>
              <p className="text-sm leading-relaxed text-fg-muted">
                Every documented cause for {defect.name.toLowerCase()} has been ruled out. If the problem persists,
                consult the manual (p. {effectiveCitations[0]?.page ?? CATEGORY_PAGE[data.category]}) or contact
                Harbor Freight support (1-800-444-3353).
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            Start over
          </button>
        </>
      )}
    </ArtifactShell>
  );
}
