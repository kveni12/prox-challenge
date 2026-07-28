import { describe, it, expect } from "vitest";
import { lookupDutyCycle, getDutyCycleFormula } from "@/domain/dutyCycle";

describe("lookupDutyCycle", () => {
  // README's own example question: "What's the duty cycle for MIG welding at 200A on 240V?"
  it("answers the README's canonical MIG 240V/200A example exactly", () => {
    const result = lookupDutyCycle("MIG", "240V", 200);
    expect(result.exactMatch).not.toBeNull();
    expect(result.exactMatch?.dutyCyclePercent).toBe(25);
    expect(result.exactMatch?.volts).toBe(24.0);
  });

  it("returns the 100% continuous point for MIG 240V at 115A", () => {
    const result = lookupDutyCycle("MIG", "240V", 115);
    expect(result.exactMatch?.dutyCyclePercent).toBe(100);
    expect(result.exactMatch?.minutesWelding).toBe(10);
    expect(result.exactMatch?.minutesResting).toBe(0);
  });

  it("does not fabricate a duty cycle for an undocumented current", () => {
    const result = lookupDutyCycle("MIG", "240V", 150);
    expect(result.exactMatch).toBeNull();
    expect(result.note).toMatch(/not one of the three documented rated points/i);
    expect(result.allRatedPoints.length).toBe(3);
  });

  it("returns all three rated points when no amperage is given", () => {
    const result = lookupDutyCycle("Stick", "120V");
    expect(result.allRatedPoints).toHaveLength(3);
    expect(result.allRatedPoints.map((p) => p.dutyCyclePercent).sort((a, b) => a - b)).toEqual([40, 60, 100]);
  });

  it("throws a clear error for an unknown process id", () => {
    expect(() => lookupDutyCycle("Laser", "120V")).toThrow(/Unknown process/);
  });

  it("cross-checks TIG 240V matches the spec-table values (30/60/100%)", () => {
    const result = lookupDutyCycle("TIG", "240V");
    const byPercent = Object.fromEntries(result.allRatedPoints.map((p) => [p.dutyCyclePercent, p.amps]));
    expect(byPercent[30]).toBe(175);
    expect(byPercent[100]).toBe(105);
  });

  it("cross-checks Stick 120V matches the spec-table values (40/60/100%)", () => {
    const result = lookupDutyCycle("Stick", "120V");
    const byPercent = Object.fromEntries(result.allRatedPoints.map((p) => [p.dutyCyclePercent, p.amps]));
    expect(byPercent[40]).toBe(80);
    expect(byPercent[100]).toBe(60);
  });
});

describe("getDutyCycleFormula", () => {
  it("returns a non-empty definition", () => {
    expect(getDutyCycleFormula().length).toBeGreaterThan(10);
  });
});
