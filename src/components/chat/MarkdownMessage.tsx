"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkifyCitations, parseCiteHref } from "@/lib/citations";
import { CitationChip } from "./CitationChip";

const components: Components = {
  a({ href, children, ...props }) {
    if (href) {
      const cite = parseCiteHref(href);
      if (cite) {
        return <CitationChip citation={cite}>{children}</CitationChip>;
      }
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

function MarkdownMessageImpl({ text }: { text: string }) {
  const processed = linkifyCitations(text);
  return (
    <div className="prose-vulcan">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownMessage = memo(MarkdownMessageImpl);
