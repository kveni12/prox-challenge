import type { ProcessId, PolarityEntry, ProcessSelectionData, WeldDefect, ManualImage } from "@/domain/types";
import type { DutyCycleLookupResult } from "@/domain/dutyCycle";

export interface PolarityDiagramData extends PolarityEntry {
  process: ProcessId;
}

export interface DutyCycleTableData {
  process: string;
  tables: DutyCycleLookupResult[];
  definition: string;
}

export interface TroubleshootingChecklistData {
  category: "wireWeld" | "stickWeld";
  process?: ProcessId;
  defect: WeldDefect;
}

export type ProcessSelectorData = ProcessSelectionData;

export type ManualImageData = ManualImage;

export type ComparisonTableData = ProcessSelectionData["migVsFluxCoredComparison"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asPolarityDiagramData(data: unknown): PolarityDiagramData | null {
  if (!isRecord(data)) return null;
  if (typeof data.process !== "string" || typeof data.polarityCode !== "string") return null;
  return data as unknown as PolarityDiagramData;
}

export function asDutyCycleTableData(data: unknown): DutyCycleTableData | null {
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.tables)) return null;
  return data as unknown as DutyCycleTableData;
}

export function asTroubleshootingChecklistData(data: unknown): TroubleshootingChecklistData | null {
  if (!isRecord(data)) return null;
  if (!isRecord(data.defect) || !Array.isArray((data.defect as Record<string, unknown>).causes)) return null;
  return data as unknown as TroubleshootingChecklistData;
}

export function asProcessSelectorData(data: unknown): ProcessSelectorData | null {
  if (!isRecord(data)) return null;
  if (!isRecord(data.processes)) return null;
  return data as unknown as ProcessSelectorData;
}

export function asManualImageData(data: unknown): ManualImageData | null {
  if (!isRecord(data)) return null;
  if (typeof data.path !== "string") return null;
  return data as unknown as ManualImageData;
}

export function asComparisonTableData(data: unknown): ComparisonTableData | null {
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.rows)) return null;
  return data as unknown as ComparisonTableData;
}
