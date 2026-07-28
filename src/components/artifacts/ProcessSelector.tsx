"use client";

import { useMemo, useState } from "react";
import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { ProcessSelectorData } from "./types";
import { ComparisonTableBody } from "./ComparisonTable";
import { Badge } from "@/components/ui/Badge";
import { ChevronDownIcon } from "@/components/ui/icons";

const DISPLAY_ORDER = ["MIG", "FluxCored", "Stick", "TIG"] as const;

type SkillFilter = "Any" | "Low" | "Moderate" | "High";
type GasFilter = "Any" | "No gas" | "Gas required";

const FILTER_BUTTON_BASE =
  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)";

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={`${FILTER_BUTTON_BASE} ${
              value === opt
                ? "border-accent-soft-border bg-accent-soft text-accent"
                : "border-border bg-surface text-fg-muted hover:bg-surface-hover"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProcessSelector({ data, citations }: { data: ProcessSelectorData; citations: Citation[] }) {
  const [skill, setSkill] = useState<SkillFilter>("Any");
  const [gas, setGas] = useState<GasFilter>("Any");
  const [showComparison, setShowComparison] = useState(false);
  const [showDutyCycle, setShowDutyCycle] = useState(false);

  const processKeys = DISPLAY_ORDER.filter((k) => data.processes[k]);

  const matches = useMemo(() => {
    const result = new Map<string, boolean>();
    for (const key of processKeys) {
      const entry = data.processes[key];
      if (!entry) continue;
      const skillOk = skill === "Any" || entry.skillLevel === skill;
      const gasOk = gas === "Any" || (gas === "No gas" ? !entry.gasRequired : entry.gasRequired);
      result.set(key, skillOk && gasOk);
    }
    return result;
  }, [data.processes, processKeys, skill, gas]);

  const anyFilterActive = skill !== "Any" || gas !== "Any";
  const matchCount = [...matches.values()].filter(Boolean).length;

  return (
    <ArtifactShell title={data.title} eyebrow="Process Selector" citations={citations}>
      <p className="mb-4 text-xs leading-relaxed text-fg-muted">{data.note}</p>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <FilterGroup label="Skill level" options={["Any", "Low", "Moderate", "High"] as const} value={skill} onChange={setSkill} />
          <FilterGroup label="Shielding gas" options={["Any", "No gas", "Gas required"] as const} value={gas} onChange={setGas} />
        </div>
        {anyFilterActive ? (
          <p className="shrink-0 font-mono text-xs text-fg-muted">
            <span className="font-semibold text-accent">{matchCount}</span> of {processKeys.length} match
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {processKeys.map((key) => {
          const entry = data.processes[key];
          if (!entry) return null;
          const isMatch = matches.get(key) ?? true;
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 transition-all ${
                anyFilterActive && !isMatch
                  ? "border-border bg-surface opacity-45"
                  : anyFilterActive && isMatch
                    ? "border-accent-soft-border bg-accent-soft/40 ring-1 ring-accent-soft-border"
                    : "border-border bg-surface"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="font-display text-sm font-semibold text-fg">{entry.displayName}</h4>
                <Badge tone={entry.skillLevel === "High" ? "warn" : entry.skillLevel === "Moderate" ? "accent" : "success"}>
                  {entry.skillLevel}
                </Badge>
              </div>
              <p className="mb-2 text-xs text-fg-muted">{entry.gasNote}</p>
              <p className="mb-2 font-mono text-xs text-fg-subtle">{entry.materialThicknessRange}</p>
              <div className="mb-2 flex flex-wrap gap-1">
                {entry.materials.map((m) => (
                  <span key={m} className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] text-fg-muted">
                    {m}
                  </span>
                ))}
              </div>
              <ul className="flex flex-col gap-0.5">
                {entry.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="flex gap-1.5 text-xs leading-snug text-fg-muted">
                    <span className="text-accent">-</span>
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.68rem] text-fg-subtle">Spatter: {entry.spatterLevel}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowComparison((v) => !v)}
          aria-expanded={showComparison}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:bg-surface-hover"
        >
          MIG vs. Flux-Cored comparison
          <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${showComparison ? "rotate-180" : ""}`} />
        </button>
        {showComparison ? (
          <div className="rounded-lg border border-border p-3.5">
            <ComparisonTableBody data={data.migVsFluxCoredComparison} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowDutyCycle((v) => !v)}
          aria-expanded={showDutyCycle}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:bg-surface-hover"
        >
          What&apos;s a duty cycle?
          <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${showDutyCycle ? "rotate-180" : ""}`} />
        </button>
        {showDutyCycle ? (
          <div className="rounded-lg border border-border p-3.5 text-sm text-fg-muted">
            <p className="mb-2 leading-relaxed">{data.dutyCycleExplainer.definition}</p>
            <p className="font-mono text-xs text-fg-subtle">
              Example: {data.dutyCycleExplainer.example.dutyCyclePercent}% at{" "}
              {data.dutyCycleExplainer.example.amps}A = {data.dutyCycleExplainer.example.minutesWelding} min welding,{" "}
              {data.dutyCycleExplainer.example.minutesResting} min resting per 10-minute window.
            </p>
          </div>
        ) : null}
      </div>
    </ArtifactShell>
  );
}
