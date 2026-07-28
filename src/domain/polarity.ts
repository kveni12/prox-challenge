import { getPolarity } from "./index";
import type { PolarityEntry } from "./types";

export function lookupPolarity(processId: string): PolarityEntry {
  const data = getPolarity();
  const entry = data.processes[processId];
  if (!entry) {
    throw new Error(`Unknown process "${processId}". Known processes: ${Object.keys(data.processes).join(", ")}`);
  }
  return entry;
}

export function listPolarityProcesses(): string[] {
  return Object.keys(getPolarity().processes);
}
