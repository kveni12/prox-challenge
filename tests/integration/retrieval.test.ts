import { describe, it, expect } from "vitest";
import { searchManual, searchManualImages, getCorpusSize } from "@/retrieval";
import { getTroubleshooting } from "@/domain";

// These run against the real committed data/chunks.json corpus (144 chunks
// extracted from the actual manuals), not a fixture — this is a lightweight
// retrieval-quality smoke test, not a mock-based unit test.
describe("searchManual over the real manual corpus", () => {
  it("loaded a non-trivial corpus", () => {
    expect(getCorpusSize()).toBeGreaterThan(50);
  });

  it("finds wire-feed troubleshooting content for a feed-roller query", () => {
    const results = searchManual("wire feed roller size incorrect", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => /feed roller/i.test(r.text) || /feed roller/i.test(r.section))).toBe(true);
  });

  it("finds duty cycle content for a duty-cycle query", () => {
    const results = searchManual("duty cycle 200 amps 240 volts", 5);
    expect(results.some((r) => /duty cycle/i.test(r.text) || /duty cycle/i.test(r.section))).toBe(true);
  });

  it("finds shielding gas SCFH content for a gas-flow query", () => {
    const results = searchManual("shielding gas flow rate SCFH setting", 5);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns results ordered by descending score", () => {
    const results = searchManual("wire feed motor runs but wire does not feed", 6);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });
});

describe("searchManualImages", () => {
  it("finds the process selection chart for a process-selection query", () => {
    const results = searchManualImages("which welding process should I use", 3);
    expect(results.some((r) => r.id === "process-selection-chart")).toBe(true);
  });

  it("finds the wiring schematic for a schematic query", () => {
    const results = searchManualImages("wiring schematic diagram", 3);
    expect(results.some((r) => r.id === "wiring-schematic")).toBe(true);
  });
});

describe("getTroubleshooting (extracted matrix)", () => {
  it("has both matrices populated with page citations", () => {
    const data = getTroubleshooting();
    expect(data.MIG_FluxCored.length).toBeGreaterThan(0);
    expect(data.TIG_Stick.length).toBeGreaterThan(0);
    for (const row of [...data.MIG_FluxCored, ...data.TIG_Stick]) {
      expect(row.page).toBeGreaterThan(0);
      expect(row.possibleCauses.length).toBeGreaterThan(0);
      expect(row.possibleCauses.length).toBe(row.likelySolutions.length);
    }
  });
});
