"use client";

import { useId, useState } from "react";
import type { Citation, DutyCyclePoint } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { DutyCycleTableData } from "./types";
import { Badge } from "@/components/ui/Badge";
import { SparkIcon } from "@/components/ui/icons";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function RatedPointsTable({
  process,
  voltage,
  points,
  currentRange,
  note,
}: {
  process: string;
  voltage: string;
  points: DutyCyclePoint[];
  currentRange?: [number, number];
  note: string;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2 px-3.5 py-2">
        <p className="font-display text-sm font-semibold text-fg">
          {process} <span className="text-fg-subtle">·</span> {voltage}
        </p>
        {currentRange ? (
          <span className="font-mono text-[0.7rem] text-fg-subtle">
            Range: {currentRange[0]}–{currentRange[1]}A
          </span>
        ) : null}
      </div>
      {points.length === 0 ? (
        <p className="px-3.5 py-3 text-sm leading-relaxed text-fg-muted">{note}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-bg-elevated">
                <th className="border-b border-border px-3 py-2 text-left font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                  Duty Cycle
                </th>
                <th className="border-b border-border px-3 py-2 text-left font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                  Amps
                </th>
                <th className="border-b border-border px-3 py-2 text-left font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                  Volts
                </th>
                <th className="border-b border-border px-3 py-2 text-left font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                  Welding / Resting
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => {
                const minutesWelding = p.minutesWelding ?? (p.dutyCyclePercent / 100) * 10;
                const minutesResting = p.minutesResting ?? 10 - minutesWelding;
                return (
                  <tr key={p.dutyCyclePercent} className="odd:bg-bg-elevated even:bg-surface">
                    <td className="border-b border-border px-3 py-2 font-mono font-semibold text-accent">
                      {p.dutyCyclePercent}%
                    </td>
                    <td className="border-b border-border px-3 py-2 font-mono text-fg">{p.amps}A</td>
                    <td className="border-b border-border px-3 py-2 font-mono text-fg-muted">{p.volts}V</td>
                    <td className="border-b border-border px-3 py-2 font-mono text-fg-muted">
                      {fmt(minutesWelding)} min / {fmt(minutesResting)} min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {points.length > 0 ? (
        <p className="border-t border-border bg-bg-elevated px-3.5 py-2 text-[0.72rem] leading-snug text-fg-subtle">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function DutyCycleCalculator() {
  const inputId = useId();
  const [pct, setPct] = useState(60);
  const minutesWelding = (pct / 100) * 10;
  const minutesResting = 10 - minutesWelding;

  return (
    <div className="rounded-lg border border-dashed border-accent-soft-border bg-accent-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <SparkIcon className="h-4 w-4 text-accent" />
        <p className="font-display text-sm font-semibold text-fg">Duty cycle calculator</p>
        <Badge tone="accent">Calculated, not a rating</Badge>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-fg-muted">
        Any duty cycle % always follows the same 10-minute-window formula. This isn&apos;t a documented rated point
        for this machine — use it to reason about an arbitrary percentage, not to claim a rated capability.
      </p>
      <label htmlFor={inputId} className="mb-1 block font-mono text-[0.7rem] uppercase tracking-wide text-fg-subtle">
        Duty cycle %
      </label>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="range"
          min={1}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent"
        />
        <input
          type="number"
          min={1}
          max={100}
          value={pct}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) setPct(Math.min(100, Math.max(1, v)));
          }}
          className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-right font-mono text-sm text-fg"
          aria-label="Duty cycle percent"
        />
        <span className="font-mono text-sm text-fg-muted">%</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-surface px-3 py-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-fg-subtle">Welding</p>
          <p className="font-mono text-lg font-semibold text-fg">{fmt(minutesWelding)} min</p>
        </div>
        <div className="rounded-md bg-surface px-3 py-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-fg-subtle">Resting</p>
          <p className="font-mono text-lg font-semibold text-fg">{fmt(minutesResting)} min</p>
        </div>
      </div>
      <p className="mt-2 text-[0.68rem] text-fg-subtle">per any 10-minute window</p>
    </div>
  );
}

export function DutyCycleTable({ data, citations }: { data: DutyCycleTableData; citations: Citation[] }) {
  return (
    <ArtifactShell title={`Duty Cycle — ${data.process}`} eyebrow="Duty Cycle" citations={citations}>
      <p className="mb-4 text-xs leading-relaxed text-fg-muted">{data.definition}</p>

      <div className="mb-2 flex items-center gap-2">
        <Badge tone="neutral">Documented rated points</Badge>
      </div>
      {data.tables.map((t) => (
        <RatedPointsTable
          key={t.voltage}
          process={t.process}
          voltage={t.voltage}
          points={t.allRatedPoints}
          currentRange={t.weldingCurrentRange}
          note={t.note}
        />
      ))}

      <DutyCycleCalculator />
    </ArtifactShell>
  );
}
