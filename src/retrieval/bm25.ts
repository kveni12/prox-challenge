/**
 * Minimal, dependency-free BM25 (Okapi) implementation.
 * Deterministic and unit-testable — no external ranking service required,
 * which keeps this app to a single ANTHROPIC_API_KEY as its only credential.
 */

export interface BM25Document {
  id: string;
  tokens: string[];
}

const K1 = 1.5;
const B = 0.75;

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are",
  "was", "were", "be", "been", "being", "with", "as", "at", "by", "it", "this",
  "that", "these", "those", "from", "into", "than", "then", "so", "do", "does",
  "did", "you", "your", "i", "my", "we", "our", "can", "will", "should", "would",
  "what", "which", "who", "how", "why", "when", "there", "here",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9.%"]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export class BM25Index {
  private docs: BM25Document[] = [];
  private docFreq = new Map<string, number>();
  private avgDocLen = 0;
  private idf = new Map<string, number>();

  constructor(documents: Array<{ id: string; text: string }>) {
    this.docs = documents.map((d) => ({ id: d.id, tokens: tokenize(d.text) }));
    this.build();
  }

  private build(): void {
    const n = this.docs.length;
    if (n === 0) return;

    let totalLen = 0;
    for (const doc of this.docs) {
      totalLen += doc.tokens.length;
      const seen = new Set(doc.tokens);
      for (const term of seen) {
        this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
      }
    }
    this.avgDocLen = totalLen / n;

    for (const [term, df] of this.docFreq) {
      this.idf.set(term, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
    }
  }

  /** Returns up to `topK` document ids ranked by BM25 score, highest first. */
  search(query: string, topK = 8): Array<{ id: string; score: number }> {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0 || this.docs.length === 0) return [];

    const scores: Array<{ id: string; score: number }> = [];
    for (const doc of this.docs) {
      const termCounts = new Map<string, number>();
      for (const t of doc.tokens) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);

      let score = 0;
      for (const qTerm of queryTerms) {
        const idf = this.idf.get(qTerm);
        if (!idf) continue;
        const tf = termCounts.get(qTerm) ?? 0;
        if (tf === 0) continue;
        const denom = tf + K1 * (1 - B + (B * doc.tokens.length) / (this.avgDocLen || 1));
        score += idf * ((tf * (K1 + 1)) / denom);
      }
      if (score > 0) scores.push({ id: doc.id, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}
