import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { ComparisonTableData } from "./types";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

function Mark({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-soft text-success">
      <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
      <CloseIcon className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

export function ComparisonTableBody({ data }: { data: ComparisonTableData }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2">
              <th className="border-b border-border px-3 py-2 text-left font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                Attribute
              </th>
              <th className="border-b border-border px-3 py-2 text-center font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                MIG
              </th>
              <th className="border-b border-border px-3 py-2 text-center font-mono text-[0.68rem] uppercase tracking-wide text-fg-subtle">
                Flux-Cored
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="odd:bg-bg-elevated even:bg-surface">
                <td className="border-b border-border px-3 py-2 text-fg">{row.attribute}</td>
                <td className="border-b border-border px-3 py-2 text-center">
                  <Mark value={row.MIG} />
                </td>
                <td className="border-b border-border px-3 py-2 text-center">
                  <Mark value={row.FluxCored} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.note ? <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{data.note}</p> : null}
    </div>
  );
}

export function ComparisonTable({ data, citations }: { data: ComparisonTableData; citations: Citation[] }) {
  return (
    <ArtifactShell title="MIG vs. Flux-Cored" eyebrow="Comparison" citations={citations}>
      <ComparisonTableBody data={data} />
    </ArtifactShell>
  );
}
