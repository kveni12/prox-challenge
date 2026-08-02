import { z } from "zod";
import { getDutyCycle } from "@/domain";
import { lookupDutyCycle } from "@/domain/dutyCycle";
import { lookupPolarity } from "@/domain/polarity";
import { getProcessSelection } from "@/domain";
import { lookupWeldDefect, filterCausesForProcess } from "@/domain/weldDiagnosis";
import { getManualImages } from "@/domain";

/**
 * Every artifact the agent can render is identified by a small enum/id
 * argument, never free-form data. The server resolves that id against the
 * verified domain JSON — the model cannot inject unsupported numbers or
 * claims into a rendered artifact.
 */

const processIdSchema = z.enum(["MIG", "FluxCored", "Stick", "TIG", "SpoolGun"]);
const voltageSchema = z.enum(["120V", "240V"]);

export const artifactRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("polarity_diagram"),
    process: processIdSchema,
  }),
  z.object({
    type: z.literal("duty_cycle_table"),
    process: processIdSchema,
    voltage: voltageSchema.optional(),
  }),
  z.object({
    type: z.literal("troubleshooting_flowchart"),
    category: z.enum(["wireWeld", "stickWeld"]),
    defectId: z.string(),
    process: processIdSchema.optional(),
  }),
  z.object({
    type: z.literal("process_selector"),
  }),
  z.object({
    type: z.literal("manual_image"),
    imageId: z.string(),
  }),
  z.object({
    type: z.literal("comparison_table"),
    table: z.literal("mig_vs_fluxcored"),
  }),
]);

export type ArtifactRequest = z.infer<typeof artifactRequestSchema>;

export interface ResolvedArtifact {
  id: string;
  type: ArtifactRequest["type"];
  title: string;
  data: unknown;
  citations: unknown;
}

let artifactCounter = 0;

export function resolveArtifact(req: ArtifactRequest): ResolvedArtifact {
  artifactCounter += 1;
  const id = `artifact-${Date.now()}-${artifactCounter}`;

  switch (req.type) {
    case "polarity_diagram": {
      const entry = lookupPolarity(req.process);
      return {
        id,
        type: req.type,
        title: `Polarity Setup — ${entry.displayName}`,
        data: { process: req.process, ...entry },
        citations: [entry.source],
      };
    }
    case "duty_cycle_table": {
      const voltages: Array<"120V" | "240V"> = req.voltage ? [req.voltage] : ["120V", "240V"];
      const tables = voltages.map((v) => lookupDutyCycle(req.process, v));
      const dutyCycleData = getDutyCycle();
      return {
        id,
        type: req.type,
        title: `Duty Cycle — ${req.process}`,
        data: { process: req.process, tables, definition: dutyCycleData.definition },
        citations: [dutyCycleData.source.primary, ...dutyCycleData.source.corroborating],
      };
    }
    case "troubleshooting_flowchart": {
      const [defect] = lookupWeldDefect(req.category, req.defectId);
      if (!defect) {
        throw new Error(`Unknown defect "${req.defectId}" in category "${req.category}"`);
      }
      const filtered = req.process ? filterCausesForProcess(defect, req.process) : defect;
      return {
        id,
        type: req.type,
        title: `Troubleshooting — ${defect.name}`,
        data: { category: req.category, process: req.process, defect: filtered },
        citations: [],
      };
    }
    case "process_selector": {
      const selection = getProcessSelection();
      return {
        id,
        type: req.type,
        title: selection.title,
        data: selection,
        citations: [selection.source],
      };
    }
    case "manual_image": {
      const { images } = getManualImages();
      const img = images.find((i) => i.id === req.imageId);
      if (!img) {
        throw new Error(`Unknown manual image id "${req.imageId}". Known ids: ${images.map((i) => i.id).join(", ")}`);
      }
      return {
        id,
        type: req.type,
        title: img.caption,
        data: img,
        citations: [img.source],
      };
    }
    case "comparison_table": {
      const selection = getProcessSelection();
      return {
        id,
        type: req.type,
        title: "MIG vs. Flux-Cored",
        data: selection.migVsFluxCoredComparison,
        citations: [selection.source],
      };
    }
  }
}
