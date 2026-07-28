import type { Citation } from "@/domain/types";

const DOC_LABELS: Record<Citation["doc"], string> = {
  "owner-manual": "Owner's Manual",
  "quick-start": "Quick Start Guide",
  "selection-chart": "Selection Chart",
};

export function docLabel(doc: Citation["doc"]): string {
  return DOC_LABELS[doc] ?? doc;
}

export function citationKey(c: Citation): string {
  return `${c.doc}-${c.page}`;
}

function slugToDoc(slug: string): Citation["doc"] {
  if (slug.includes("quick")) return "quick-start";
  if (slug.includes("selection") || slug.includes("chart")) return "selection-chart";
  return "owner-manual";
}

function docLabelToSlug(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("quick")) return "quick-start";
  if (lower.includes("selection") || lower.includes("chart")) return "selection-chart";
  return "owner-manual";
}

/**
 * Runtime guard: the backend types `ResolvedArtifact.citations` as `unknown`,
 * but every artifact resolver populates it with `Citation[]`. Validate
 * defensively instead of trusting the type.
 */
export function parseCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const doc = (item as Record<string, unknown>).doc;
    const page = (item as Record<string, unknown>).page;
    const label = (item as Record<string, unknown>).label;
    if (typeof doc !== "string" || typeof page !== "number") continue;
    const safeDoc: Citation["doc"] =
      doc === "owner-manual" || doc === "quick-start" || doc === "selection-chart" ? doc : slugToDoc(doc);
    out.push({ doc: safeDoc, page, ...(typeof label === "string" ? { label } : {}) });
  }
  return out;
}

export function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of citations) {
    const key = citationKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Rewrites inline "(p. 19)" / "(owner's manual, p. 14)" style citation
 * markers in assistant markdown into real markdown links pointing at a
 * `cite://<doc>/<page>` pseudo-URL, so a custom `a` renderer in react-markdown
 * can turn them into clickable citation chips instead of plain text.
 */
export function linkifyCitations(markdown: string): string {
  return markdown.replace(
    /(?<!\])\(([A-Za-z' ]{0,32}?,\s*)?[Pp]\.?\s?(\d{1,3})\)/g,
    (full, docPart: string | undefined, pageStr: string) => {
      const page = pageStr;
      const docSlug = docPart ? docLabelToSlug(docPart) : "owner-manual";
      return `[p. ${page}](cite://${docSlug}/${page})`;
    },
  );
}

export interface ParsedCiteHref {
  doc: Citation["doc"];
  page: number;
}

export function parseCiteHref(href: string): ParsedCiteHref | null {
  const match = /^cite:\/\/([a-z-]+)\/(\d+)$/.exec(href);
  if (!match) return null;
  const [, slug, pageStr] = match;
  if (!slug || !pageStr) return null;
  return { doc: slugToDoc(slug), page: Number(pageStr) };
}

/** Extracts the set of citations referenced inline in already-linkified markdown text. */
export function extractInlineCitations(markdown: string): Citation[] {
  const out: Citation[] = [];
  const re = /\]\(cite:\/\/([a-z-]+)\/(\d+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const slug = m[1];
    const pageStr = m[2];
    if (!slug || !pageStr) continue;
    out.push({ doc: slugToDoc(slug), page: Number(pageStr) });
  }
  return dedupeCitations(out);
}
