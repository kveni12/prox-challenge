import { getDutyCycle } from "./index";
import type { DutyCyclePoint } from "./types";

export type Voltage = "120V" | "240V";

export interface DutyCycleLookupResult {
  process: string;
  voltage: Voltage;
  requestedAmps?: number;
  exactMatch: DutyCyclePoint | null;
  allRatedPoints: DutyCyclePoint[];
  weldingCurrentRange?: [number, number];
  note: string;
  source: unknown;
}

/**
 * Deterministic lookup against the documented duty-cycle nameplate table.
 * Never interpolates between rated points — the manual only publishes three
 * discrete points per process/voltage, so anything between them is undocumented.
 */
export function lookupDutyCycle(processId: string, voltage: Voltage, amps?: number): DutyCycleLookupResult {
  const data = getDutyCycle();
  const proc = data.processes[processId];
  if (!proc) {
    throw new Error(
      `Unknown process "${processId}". Known processes: ${Object.keys(data.processes).join(", ")}`,
    );
  }
  const points = proc[voltage] ?? [];
  const exactMatch = amps == null ? null : (points.find((p) => p.amps === amps) ?? null);

  let note: string;
  if (amps == null) {
    note = `Documented rated points for ${processId} at ${voltage}. The machine's duty cycle is only rated at these three points (25-40% max-current point, 60% point, 100% continuous point) — the manual does not publish a continuous curve.`;
  } else if (exactMatch) {
    note = `Exact documented value.`;
  } else {
    note = `${amps}A is not one of the three documented rated points for ${processId} at ${voltage} (${points.map((p) => `${p.dutyCyclePercent}%@${p.amps}A`).join(", ")}). Do not estimate a duty cycle for it — state that only these points are documented, and that duty cycle generally decreases as current increases toward the rated max.`;
  }

  return {
    process: processId,
    voltage,
    requestedAmps: amps,
    exactMatch,
    allRatedPoints: points,
    weldingCurrentRange: proc.weldingCurrentRange?.[voltage],
    note,
    source: data.source,
  };
}

export function getDutyCycleFormula(): string {
  return getDutyCycle().definition;
}
