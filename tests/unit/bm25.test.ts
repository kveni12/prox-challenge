import { describe, it, expect } from "vitest";
import { BM25Index, tokenize } from "@/retrieval/bm25";

describe("tokenize", () => {
  it("lowercases and strips stopwords", () => {
    expect(tokenize("What is the Duty Cycle?")).toEqual(["duty", "cycle"]);
  });

  it("preserves percent and amperage-style tokens", () => {
    expect(tokenize("25% at 200A")).toEqual(["25%", "200a"]);
  });

  it("drops single-character tokens", () => {
    expect(tokenize("a b cc")).toEqual(["cc"]);
  });
});

describe("BM25Index", () => {
  const docs = [
    { id: "polarity-mig", text: "MIG solid core welding uses DCEP polarity, ground clamp in negative socket" },
    { id: "polarity-fluxcored", text: "Flux-cored gasless welding uses DCEN polarity, ground clamp in positive socket" },
    { id: "duty-cycle", text: "Duty cycle rated 25 percent at 200 amps on 240 volts for MIG welding" },
    { id: "unrelated", text: "Store idle welders out of reach of children" },
  ];
  const index = new BM25Index(docs);

  it("ranks the most relevant document first", () => {
    const results = index.search("flux-cored polarity socket");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe("polarity-fluxcored");
  });

  it("finds numeric duty cycle content", () => {
    const results = index.search("duty cycle 200 amps");
    expect(results[0]!.id).toBe("duty-cycle");
  });

  it("returns nothing for a query with no shared vocabulary", () => {
    const results = index.search("xylophone quantum");
    expect(results).toEqual([]);
  });

  it("respects topK", () => {
    const results = index.search("welding polarity socket", 1);
    expect(results.length).toBe(1);
  });

  it("handles an empty corpus without throwing", () => {
    const empty = new BM25Index([]);
    expect(empty.search("anything")).toEqual([]);
  });
});
