import { getWeldDiagnosis } from "./index";
import type { WeldDefect, ProcessId } from "./types";

export function lookupWeldDefect(category: "wireWeld" | "stickWeld", defectId?: string): WeldDefect[] {
  const data = getWeldDiagnosis();
  const bucket = data[category];
  if (!defectId) return bucket.defects;
  const found = bucket.defects.find((d) => d.id === defectId || d.name.toLowerCase() === defectId.toLowerCase());
  return found ? [found] : [];
}

/** Filters a defect's causes down to the ones that actually apply to the given process (e.g. drops MIG-only shielding-gas causes for a Flux-Cored question). */
export function filterCausesForProcess(defect: WeldDefect, processId: ProcessId): WeldDefect {
  return {
    ...defect,
    causes: defect.causes.filter((c) => !c.appliesTo || c.appliesTo.includes(processId)),
  };
}
