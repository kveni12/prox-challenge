import { getTroubleshooting } from "./index";
import type { TroubleshootingRow } from "./types";
import { tokenize } from "@/retrieval/bm25";

export type TroubleshootingMatrix = "MIG_FluxCored" | "TIG_Stick";

/** Simple keyword-overlap match over problem statements — the matrix is small (13 rows), so BM25 is overkill. */
export function searchTroubleshooting(matrix: TroubleshootingMatrix, query: string, topK = 3): TroubleshootingRow[] {
  const data = getTroubleshooting();
  const rows = data[matrix];
  const qTokens = new Set(tokenize(query));
  const scored = rows.map((row) => {
    const rowTokens = tokenize(`${row.problem} ${row.possibleCauses.join(" ")}`);
    const overlap = rowTokens.filter((t) => qTokens.has(t)).length;
    return { row, overlap };
  });
  return scored
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, topK)
    .map((s) => s.row);
}
