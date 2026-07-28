import fs from "node:fs";
import path from "node:path";
import type {
  DutyCycleData,
  PolarityData,
  ProcessSelectionData,
  WeldDiagnosisData,
  TroubleshootingData,
  ManualImagesData,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function loadJson<T>(relativePath: string): T {
  const fullPath = path.join(DATA_DIR, relativePath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(raw) as T;
}

function loadJsonOptional<T>(relativePath: string, fallback: T): T {
  try {
    return loadJson<T>(relativePath);
  } catch {
    return fallback;
  }
}

let cache: {
  dutyCycle?: DutyCycleData;
  polarity?: PolarityData;
  processSelection?: ProcessSelectionData;
  weldDiagnosis?: WeldDiagnosisData;
  troubleshooting?: TroubleshootingData;
  manualImages?: ManualImagesData;
} = {};

export function getDutyCycle(): DutyCycleData {
  cache.dutyCycle ??= loadJson<DutyCycleData>("domain/duty-cycle.json");
  return cache.dutyCycle;
}

export function getPolarity(): PolarityData {
  cache.polarity ??= loadJson<PolarityData>("domain/polarity.json");
  return cache.polarity;
}

export function getProcessSelection(): ProcessSelectionData {
  cache.processSelection ??= loadJson<ProcessSelectionData>("domain/process-selection.json");
  return cache.processSelection;
}

export function getWeldDiagnosis(): WeldDiagnosisData {
  cache.weldDiagnosis ??= loadJson<WeldDiagnosisData>("domain/weld-diagnosis.json");
  return cache.weldDiagnosis;
}

export function getTroubleshooting(): TroubleshootingData {
  cache.troubleshooting ??= loadJsonOptional<TroubleshootingData>("domain/troubleshooting.json", {
    MIG_FluxCored: [],
    TIG_Stick: [],
  });
  return cache.troubleshooting;
}

export function getManualImages(): ManualImagesData {
  cache.manualImages ??= loadJsonOptional<ManualImagesData>("domain/manual-images.json", { images: [] });
  return cache.manualImages;
}

/** Test-only: clear the in-process cache so tests can reload fixtures. */
export function __clearDomainCache(): void {
  cache = {};
}
