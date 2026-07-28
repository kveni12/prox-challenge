import { z } from "zod";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { searchManual, searchManualImages } from "@/retrieval";
import { lookupDutyCycle } from "@/domain/dutyCycle";
import { lookupPolarity, listPolarityProcesses } from "@/domain/polarity";
import { searchTroubleshooting } from "@/domain/troubleshooting";
import { artifactRequestSchema, resolveArtifact, type ResolvedArtifact } from "./artifacts";

const PROCESS_IDS = ["MIG", "FluxCored", "Stick", "TIG", "SpoolGun"] as const;

/**
 * Builds a fresh in-process MCP server (and its artifact output bus) for a
 * single request. Isolating this per-request avoids one user's artifacts
 * leaking into another concurrent conversation in the same Node process.
 */
export function createVulcanTools() {
  const artifactBus: ResolvedArtifact[] = [];

  const server = createSdkMcpServer({
    name: "vulcan",
    version: "1.0.0",
    tools: [
      tool(
        "search_manual",
        "Search the Vulcan OmniPro 220 owner's manual and quick-start guide for relevant text passages. Use this for any factual question before answering — it returns ranked excerpts with exact page numbers you must cite. Returns an empty list if nothing relevant is found; in that case say so rather than guessing.",
        {
          query: z.string().describe("Search query — use the user's own terms plus relevant welding vocabulary (e.g. 'porosity flux-cored', 'duty cycle 200A 240V')."),
          topK: z.number().int().min(1).max(10).optional().describe("Number of results to return (default 6)."),
        },
        async (args) => {
          const results = searchManual(args.query, args.topK ?? 6);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  results.map((r) => ({ page: r.page, doc: r.doc, section: r.section, text: r.text })),
                ),
              },
            ],
          };
        },
      ),

      tool(
        "find_manual_image",
        "Find a real figure/diagram/photo from the manual by topic (e.g. 'wiring schematic', 'front panel controls', 'process selection chart'). Returns image ids you can pass to render_artifact with type 'manual_image' to actually show it to the user. Do not describe a manual diagram in words when you can show it — call this and render it instead.",
        {
          query: z.string().describe("What kind of figure you're looking for."),
        },
        async (args) => {
          const images = searchManualImages(args.query, 3);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(images.map((i) => ({ id: i.id, caption: i.caption, page: i.source.page }))),
              },
            ],
          };
        },
      ),

      tool(
        "lookup_duty_cycle",
        "Exact, deterministic duty-cycle lookup for one process and input voltage. The machine is only rated at three documented current points per process/voltage (never a continuous curve) — this tool tells you which points are documented and whether the requested amperage matches one exactly. Always use this instead of recalling duty-cycle numbers from memory.",
        {
          process: z.enum(PROCESS_IDS).describe("Welding process."),
          voltage: z.enum(["120V", "240V"]).describe("Input line voltage."),
          amps: z.number().optional().describe("Specific amperage the user asked about, if any."),
        },
        async (args) => {
          const result = lookupDutyCycle(args.process, args.voltage, args.amps);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      ),

      tool(
        "lookup_polarity",
        "Exact, deterministic polarity and socket wiring for one welding process (which cable goes in the Positive vs Negative socket). Safety-critical — always use this tool rather than recalling polarity from memory, and always pair it with rendering a polarity_diagram artifact.",
        {
          process: z.enum(PROCESS_IDS).describe("Welding process."),
        },
        async (args) => {
          const result = lookupPolarity(args.process);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      ),

      tool(
        "lookup_troubleshooting",
        "Search the machine-level troubleshooting matrices (electrical/mechanical faults like 'welder won't turn on', 'wire feed motor runs but wire doesn't feed', 'weak arc', 'LCD doesn't light') — NOT weld-quality defects like porosity or spatter, which are covered by search_manual and the weld-diagnosis defect data instead. Returns Problem / Possible Causes / Likely Solutions rows with page citations.",
        {
          matrix: z.enum(["MIG_FluxCored", "TIG_Stick"]).describe("Which troubleshooting matrix to search."),
          query: z.string().describe("Description of the problem, e.g. 'welder does not turn on'."),
        },
        async (args) => {
          const rows = searchTroubleshooting(args.matrix, args.query);
          return { content: [{ type: "text", text: JSON.stringify(rows) }] };
        },
      ),

      tool(
        "render_artifact",
        "Render a grounded interactive/visual artifact for the user: a polarity diagram, a duty-cycle table, a troubleshooting checklist, the process-selector chart, a real manual image, or a MIG-vs-Flux-Cored comparison table. You supply only an id/enum (e.g. which process, which defect) — the server fills in the actual verified data, so you cannot inject unsupported numbers here. Prefer this over describing a diagram, table, or procedure in prose whenever one of these types fits the question.",
        {
          type: z
            .enum([
              "polarity_diagram",
              "duty_cycle_table",
              "troubleshooting_checklist",
              "process_selector",
              "manual_image",
              "comparison_table",
            ])
            .describe("Which kind of artifact to render."),
          process: z.enum(PROCESS_IDS).optional().describe("Required for polarity_diagram and duty_cycle_table; optional filter for troubleshooting_checklist."),
          voltage: z.enum(["120V", "240V"]).optional().describe("Optional for duty_cycle_table; omit to show both."),
          category: z.enum(["wireWeld", "stickWeld"]).optional().describe("Required for troubleshooting_checklist."),
          defectId: z.string().optional().describe("Required for troubleshooting_checklist, e.g. 'wire-porosity'."),
          imageId: z.string().optional().describe("Required for manual_image — get this from find_manual_image first."),
          table: z.literal("mig_vs_fluxcored").optional().describe("Required for comparison_table."),
        },
        async (args) => {
          try {
            const parsed = artifactRequestSchema.parse(args);
            const resolved = resolveArtifact(parsed);
            artifactBus.push(resolved);
            return {
              content: [
                {
                  type: "text",
                  text: `Rendered "${resolved.title}" (artifact ${resolved.id}, type ${resolved.type}) to the user's screen. Do not repeat its full contents in your text reply — refer to it briefly instead.`,
                },
              ],
            };
          } catch (err) {
            const detail =
              err instanceof z.ZodError
                ? `Missing or invalid arguments for artifact type "${(args as { type?: string }).type}": ${err.issues.map((i) => i.message).join("; ")}`
                : (err as Error).message;
            return {
              content: [{ type: "text", text: `Could not render artifact: ${detail}. Check the required fields for this artifact type and try again.` }],
              isError: true,
            };
          }
        },
      ),

      tool(
        "list_processes",
        "List the welding process ids this machine supports (for use with other tools' `process` argument).",
        {},
        async () => {
          return { content: [{ type: "text", text: JSON.stringify(listPolarityProcesses()) }] };
        },
      ),
    ],
  });

  return { server, artifactBus };
}
