export type ProcessId = "MIG" | "FluxCored" | "Stick" | "TIG" | "SpoolGun";

export interface Citation {
  doc: "owner-manual" | "quick-start" | "selection-chart";
  page: number;
  label?: string;
}

export interface DutyCyclePoint {
  dutyCyclePercent: number;
  amps: number;
  volts: number;
  minutesWelding?: number;
  minutesResting?: number;
}

export interface ProcessDutyCycle {
  "120V"?: DutyCyclePoint[];
  "240V"?: DutyCyclePoint[];
  weldingCurrentRange?: { "120V": [number, number]; "240V": [number, number]; unit: string };
  maxOCV_VDC?: number;
  note?: string;
}

export interface DutyCycleData {
  machine: string;
  source: { primary: Citation; corroborating: Citation[] };
  definition: string;
  note: string;
  processes: Record<string, ProcessDutyCycle>;
  wireSpeedRange: { min: number; max: number; unit: string; source: Citation };
  thermalProtection: { behavior: string; source: Citation };
}

export interface PolarityEntry {
  displayName: string;
  polarityCode: "DCEP" | "DCEN";
  polarityName: string;
  groundClampSocket: "positive" | "negative";
  torchOrWireCableSocket: "positive" | "negative";
  torchOrWireCableName: string;
  instructions: string;
  warning?: string;
  caveat?: string;
  source: Citation;
}

export interface PolarityData {
  machine: string;
  safetyNote: string;
  sockets: { description: string; source: Citation };
  processes: Record<string, PolarityEntry>;
}

export interface ProcessSelectionEntry {
  displayName: string;
  skillLevel: "Low" | "Moderate" | "High";
  gasRequired: boolean;
  gasNote: string;
  materials: string[];
  materialThicknessRange: string;
  typicalApplications: string[];
  spatterLevel: string;
  highlights: string[];
}

export interface ProcessSelectionData {
  title: string;
  source: Citation & { assetPath: string };
  note: string;
  processes: Record<string, ProcessSelectionEntry>;
  migVsFluxCoredComparison: {
    note: string;
    rows: Array<{ attribute: string; MIG: boolean; FluxCored: boolean }>;
  };
  dutyCycleExplainer: {
    definition: string;
    example: { amps: number; dutyCyclePercent: number; minutesWelding: number; minutesResting: number };
  };
  decisionQuestions: string[];
}

export interface WeldDefectCause {
  cause: string;
  solution: string;
  appliesTo?: ProcessId[];
  note?: string;
}

export interface WeldDefect {
  id: string;
  name: string;
  description?: string;
  causes: WeldDefectCause[];
}

export interface WeldDiagnosisData {
  wireWeld: { note: string; source: Citation; defects: WeldDefect[] };
  stickWeld: { note: string; source: Citation; defects: WeldDefect[] };
  stickPenetration: {
    note: string;
    source: Citation;
    categories: Array<{
      id: string;
      name: string;
      description?: string;
      causes?: Array<{ cause: string; solution: string }>;
      generalFix?: string;
    }>;
  };
}

export interface TroubleshootingRow {
  problem: string;
  possibleCauses: string[];
  likelySolutions: string[];
  page: number;
}

export interface TroubleshootingData {
  MIG_FluxCored: TroubleshootingRow[];
  TIG_Stick: TroubleshootingRow[];
}

export interface ManualImage {
  id: string;
  path: string;
  caption: string;
  source: Citation;
  topics: string[];
}

export interface ManualImagesData {
  images: ManualImage[];
}

export interface Chunk {
  id: string;
  doc: "owner-manual" | "quick-start";
  page: number;
  section: string;
  text: string;
}
