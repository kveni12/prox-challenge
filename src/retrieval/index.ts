import fs from "node:fs";
import path from "node:path";
import { BM25Index, tokenize } from "./bm25";
import { getManualImages } from "@/domain";
import type { Chunk, ManualImage } from "@/domain/types";

const CHUNKS_PATH = path.join(process.cwd(), "data", "chunks.json");

let chunks: Chunk[] | null = null;
let index: BM25Index | null = null;

function ensureLoaded(): { chunks: Chunk[]; index: BM25Index } {
  if (chunks && index) return { chunks, index };
  try {
    const raw = fs.readFileSync(CHUNKS_PATH, "utf-8");
    chunks = JSON.parse(raw) as Chunk[];
  } catch {
    chunks = [];
  }
  index = new BM25Index(chunks.map((c) => ({ id: c.id, text: `${c.section} ${c.text}` })));
  return { chunks, index };
}

export interface RetrievedChunk extends Chunk {
  score: number;
}

/** Lexical (BM25) search over the manual text corpus. Deterministic, no embeddings API required. */
export function searchManual(query: string, topK = 6): RetrievedChunk[] {
  const { chunks: allChunks, index: idx } = ensureLoaded();
  const hits = idx.search(query, topK);
  const byId = new Map(allChunks.map((c) => [c.id, c]));
  return hits
    .map((h) => {
      const chunk = byId.get(h.id);
      return chunk ? { ...chunk, score: h.score } : null;
    })
    .filter((c): c is RetrievedChunk => c !== null);
}

export function getChunkById(id: string): Chunk | undefined {
  const { chunks: allChunks } = ensureLoaded();
  return allChunks.find((c) => c.id === id);
}

export function getCorpusSize(): number {
  return ensureLoaded().chunks.length;
}

/** Simple keyword overlap match against curated manual-image topics — small enough corpus that BM25 is overkill. */
export function searchManualImages(query: string, topK = 3): ManualImage[] {
  const q = new Set(tokenize(query));
  const { images } = getManualImages();
  const scored = images.map((img) => {
    const haystack = tokenize(`${img.caption} ${img.topics.join(" ")}`);
    const overlap = haystack.filter((t) => q.has(t)).length;
    return { img, overlap };
  });
  return scored
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, topK)
    .map((s) => s.img);
}

/** Test-only. */
export function __clearRetrievalCache(): void {
  chunks = null;
  index = null;
}
