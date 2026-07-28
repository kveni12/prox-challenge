"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Citation } from "@/domain/types";
import { docLabel } from "@/lib/citations";
import { Modal } from "@/components/ui/Modal";
import { BookIcon } from "@/components/ui/icons";

interface CitationContextValue {
  openCitation: (citation: Citation) => void;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export function useCitations(): CitationContextValue {
  const ctx = useContext(CitationContext);
  if (!ctx) {
    throw new Error("useCitations must be used within a CitationProvider");
  }
  return ctx;
}

export function CitationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Citation | null>(null);

  const value = useMemo<CitationContextValue>(
    () => ({
      openCitation: (citation) => setActive(citation),
    }),
    [],
  );

  return (
    <CitationContext.Provider value={value}>
      {children}
      <Modal open={active !== null} onClose={() => setActive(null)} title="Source" widthClassName="max-w-md">
        {active ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-accent-soft-border bg-accent-soft px-3.5 py-3">
              <BookIcon className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-display text-sm font-semibold text-fg">
                  {docLabel(active.doc)}, page {active.page}
                </p>
                {active.label ? <p className="mt-0.5 text-xs text-fg-muted">{active.label}</p> : null}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-fg-subtle">
              This response was grounded in the Vulcan OmniPro 220 documentation above. The assistant only states
              facts it retrieved from this source — nothing here is generated from general welding knowledge unless
              labeled as a recommendation.
            </p>
          </div>
        ) : null}
      </Modal>
    </CitationContext.Provider>
  );
}
