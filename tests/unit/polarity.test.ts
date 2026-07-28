import { describe, it, expect } from "vitest";
import { lookupPolarity, listPolarityProcesses } from "@/domain/polarity";

describe("lookupPolarity", () => {
  it("gives MIG (solid core) DCEP with ground clamp in negative", () => {
    const p = lookupPolarity("MIG");
    expect(p.polarityCode).toBe("DCEP");
    expect(p.groundClampSocket).toBe("negative");
    expect(p.torchOrWireCableSocket).toBe("positive");
  });

  it("gives Flux-Cored DCEN with ground clamp in positive — the opposite of MIG", () => {
    const fc = lookupPolarity("FluxCored");
    const mig = lookupPolarity("MIG");
    expect(fc.polarityCode).toBe("DCEN");
    expect(fc.groundClampSocket).toBe("positive");
    expect(fc.torchOrWireCableSocket).toBe("negative");
    // Safety-critical invariant: MIG and Flux-Cored must never share a wiring config.
    expect(fc.groundClampSocket).not.toBe(mig.groundClampSocket);
    expect(fc.torchOrWireCableSocket).not.toBe(mig.torchOrWireCableSocket);
  });

  it("answers the README's TIG ground-clamp-socket example: Positive", () => {
    const tig = lookupPolarity("TIG");
    expect(tig.groundClampSocket).toBe("positive");
    expect(tig.torchOrWireCableSocket).toBe("negative");
    expect(tig.torchOrWireCableName).toMatch(/TIG Torch/i);
  });

  it("gives Stick ground clamp in negative, electrode holder in positive", () => {
    const stick = lookupPolarity("Stick");
    expect(stick.groundClampSocket).toBe("negative");
    expect(stick.torchOrWireCableSocket).toBe("positive");
  });

  it("every process cites a source page", () => {
    for (const id of listPolarityProcesses()) {
      const entry = lookupPolarity(id);
      expect(entry.source.page).toBeGreaterThan(0);
      expect(entry.source.doc).toBe("owner-manual");
    }
  });

  it("throws a clear error for an unknown process", () => {
    expect(() => lookupPolarity("Laser")).toThrow(/Unknown process/);
  });
});
