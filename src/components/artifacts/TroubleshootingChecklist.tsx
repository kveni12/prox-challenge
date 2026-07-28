"use client";

import { useState } from "react";
import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { TroubleshootingChecklistData } from "./types";
import { CheckIcon, WrenchIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_PAGE: Record<TroubleshootingChecklistData["category"], number> = {
  wireWeld: 37,
  stickWeld: 40,
};

export function TroubleshootingChecklist({
  data,
  citations,
}: {
  data: TroubleshootingChecklistData;
  citations: Citation[];
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { defect } = data;

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const effectiveCitations: Citation[] =
    citations.length > 0
      ? citations
      : [{ doc: "owner-manual", page: CATEGORY_PAGE[data.category], label: "Weld Diagnosis" }];

  return (
    <ArtifactShell
      title={defect.name}
      eyebrow="Troubleshooting"
      icon={<WrenchIcon className="h-4 w-4" />}
      citations={effectiveCitations}
      headerExtra={
        <Badge tone={checked.size === defect.causes.length && defect.causes.length > 0 ? "success" : "neutral"}>
          {checked.size}/{defect.causes.length} checked
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

      <ul className="flex flex-col gap-2">
        {defect.causes.map((c, i) => {
          const isChecked = checked.has(i);
          return (
            <li key={c.cause}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                  isChecked
                    ? "border-success/30 bg-success-soft"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isChecked}
                  onChange={() => toggle(i)}
                  aria-describedby={`cause-${i}-solution`}
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isChecked ? "border-success bg-success text-accent-fg" : "border-border-strong text-transparent"
                  }`}
                >
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isChecked ? "text-success" : "text-fg"}`}>
                    {c.cause}
                  </span>
                  <span id={`cause-${i}-solution`} className="mt-0.5 block text-sm leading-snug text-fg-muted">
                    {c.solution}
                  </span>
                  {c.note ? <span className="mt-1 block text-xs italic text-fg-subtle">{c.note}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </ArtifactShell>
  );
}
