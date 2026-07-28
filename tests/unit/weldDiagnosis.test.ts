import { describe, it, expect } from "vitest";
import { lookupWeldDefect, filterCausesForProcess } from "@/domain/weldDiagnosis";

describe("lookupWeldDefect", () => {
  it("finds the porosity defect by id", () => {
    const [defect] = lookupWeldDefect("wireWeld", "wire-porosity");
    expect(defect).toBeDefined();
    expect(defect!.name.toLowerCase()).toBe("porosity");
    expect(defect!.causes.length).toBeGreaterThan(0);
  });

  it("returns all defects when no id is given", () => {
    const all = lookupWeldDefect("wireWeld");
    expect(all.length).toBeGreaterThanOrEqual(4); // porosity, burn-through, crooked/wavy bead, excessive spatter
  });

  it("returns an empty array for an unknown defect id", () => {
    expect(lookupWeldDefect("wireWeld", "nonexistent-defect")).toEqual([]);
  });
});

describe("filterCausesForProcess — the README's flux-cored porosity example", () => {
  it("drops MIG-only shielding-gas causes when the process is FluxCored", () => {
    const [porosity] = lookupWeldDefect("wireWeld", "wire-porosity");
    const filtered = filterCausesForProcess(porosity!, "FluxCored");

    const causeTexts = filtered.causes.map((c) => c.cause.toLowerCase());
    expect(causeTexts.some((c) => c.includes("shielding gas"))).toBe(false);
    // non-gas causes must still be present
    expect(causeTexts.some((c) => c.includes("polarity"))).toBe(true);
    expect(causeTexts.some((c) => c.includes("dirty workpiece"))).toBe(true);
  });

  it("keeps MIG-only shielding-gas causes when the process is MIG", () => {
    const [porosity] = lookupWeldDefect("wireWeld", "wire-porosity");
    const filtered = filterCausesForProcess(porosity!, "MIG");
    const causeTexts = filtered.causes.map((c) => c.cause.toLowerCase());
    expect(causeTexts.some((c) => c.includes("shielding gas"))).toBe(true);
  });

  it("filters out everything when the process doesn't match any cause's appliesTo", () => {
    const [porosity] = lookupWeldDefect("wireWeld", "wire-porosity");
    // Every wireWeld porosity cause is tagged MIG and/or FluxCored — asking for the
    // wire-weld checklist under "Stick" (which has its own stickWeld category) should
    // correctly yield nothing, not silently fall back to unfiltered causes.
    const forStick = filterCausesForProcess(porosity!, "Stick");
    expect(forStick.causes.length).toBe(0);
  });
});
