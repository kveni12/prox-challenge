import { describe, it, expect } from "vitest";
import { artifactRequestSchema, resolveArtifact } from "@/agent/artifacts";

describe("resolveArtifact", () => {
  it("resolves a polarity_diagram grounded in the real polarity data", () => {
    const req = artifactRequestSchema.parse({ type: "polarity_diagram", process: "FluxCored" });
    const result = resolveArtifact(req);
    expect(result.type).toBe("polarity_diagram");
    expect(result.citations).toHaveLength(1);
    expect((result.data as { polarityCode: string }).polarityCode).toBe("DCEN");
  });

  it("resolves a duty_cycle_table for a single voltage when requested", () => {
    const req = artifactRequestSchema.parse({ type: "duty_cycle_table", process: "MIG", voltage: "240V" });
    const result = resolveArtifact(req);
    const data = result.data as { tables: Array<{ voltage: string }> };
    expect(data.tables).toHaveLength(1);
    expect(data.tables[0]!.voltage).toBe("240V");
  });

  it("resolves a duty_cycle_table for both voltages when none is specified", () => {
    const req = artifactRequestSchema.parse({ type: "duty_cycle_table", process: "TIG" });
    const result = resolveArtifact(req);
    const data = result.data as { tables: unknown[] };
    expect(data.tables).toHaveLength(2);
  });

  it("resolves a troubleshooting_checklist and filters causes by process", () => {
    const req = artifactRequestSchema.parse({
      type: "troubleshooting_checklist",
      category: "wireWeld",
      defectId: "wire-porosity",
      process: "FluxCored",
    });
    const result = resolveArtifact(req);
    const data = result.data as { defect: { causes: Array<{ cause: string }> } };
    expect(data.defect.causes.some((c) => c.cause.toLowerCase().includes("shielding gas"))).toBe(false);
  });

  it("throws for an unknown defectId instead of returning empty/undefined", () => {
    const req = artifactRequestSchema.parse({
      type: "troubleshooting_checklist",
      category: "wireWeld",
      defectId: "does-not-exist",
    });
    expect(() => resolveArtifact(req)).toThrow(/Unknown defect/);
  });

  it("resolves process_selector with all four processes present", () => {
    const req = artifactRequestSchema.parse({ type: "process_selector" });
    const result = resolveArtifact(req);
    const data = result.data as { processes: Record<string, unknown> };
    expect(Object.keys(data.processes).sort()).toEqual(["FluxCored", "MIG", "Stick", "TIG"]);
  });

  it("resolves a known manual_image and throws for an unknown one", () => {
    const ok = artifactRequestSchema.parse({ type: "manual_image", imageId: "process-selection-chart" });
    expect(resolveArtifact(ok).title).toBeTruthy();

    const bad = artifactRequestSchema.parse({ type: "manual_image", imageId: "nope" });
    expect(() => resolveArtifact(bad)).toThrow(/Unknown manual image/);
  });

  it("resolves the mig-vs-fluxcored comparison table", () => {
    const req = artifactRequestSchema.parse({ type: "comparison_table", table: "mig_vs_fluxcored" });
    const result = resolveArtifact(req);
    const data = result.data as { rows: unknown[] };
    expect(data.rows.length).toBeGreaterThan(0);
  });

  it("rejects a malformed request via zod before it ever reaches resolveArtifact", () => {
    expect(() => artifactRequestSchema.parse({ type: "polarity_diagram", process: "Laser" })).toThrow();
    expect(() => artifactRequestSchema.parse({ type: "not_a_real_type" })).toThrow();
  });

  it("generates unique ids across calls", () => {
    const req = artifactRequestSchema.parse({ type: "process_selector" });
    const a = resolveArtifact(req);
    const b = resolveArtifact(req);
    expect(a.id).not.toBe(b.id);
  });
});
