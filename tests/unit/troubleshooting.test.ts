import { describe, it, expect } from "vitest";
import { searchTroubleshooting } from "@/domain/troubleshooting";

describe("searchTroubleshooting", () => {
  it("surfaces the wire-feed-motor-runs-but-wire-doesn't-feed row in the top results", () => {
    const rows = searchTroubleshooting("MIG_FluxCored", "wire feed motor runs but wire does not feed", 5);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.problem.toLowerCase().includes("wire feed motor"))).toBe(true);
  });

  it("finds the welder-does-not-turn-on row in the TIG/Stick matrix", () => {
    const rows = searchTroubleshooting("TIG_Stick", "welder does not turn on when switched on");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.problem.toLowerCase()).toMatch(/function|turn on|switch/);
  });

  it("returns an empty array for a query with no vocabulary overlap", () => {
    expect(searchTroubleshooting("MIG_FluxCored", "xylophone quantum banana")).toEqual([]);
  });

  it("every row cites a page and has matching cause/solution array lengths", () => {
    const rows = searchTroubleshooting("MIG_FluxCored", "wire feed", 10);
    for (const row of rows) {
      expect(row.page).toBeGreaterThan(0);
      expect(row.possibleCauses.length).toBe(row.likelySolutions.length);
    }
  });
});
