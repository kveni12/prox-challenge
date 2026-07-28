"use client";

import { useState } from "react";
import Image from "next/image";
import type { Citation } from "@/domain/types";
import { ArtifactShell } from "./ArtifactShell";
import type { ManualImageData } from "./types";
import { Modal } from "@/components/ui/Modal";
import { ZoomIcon } from "@/components/ui/icons";

const KNOWN_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "process-selection-chart": { width: 3334, height: 3334 },
  "front-panel-controls": { width: 1654, height: 2339 },
  "rating-nameplate": { width: 1654, height: 2339 },
  "wiring-schematic": { width: 1654, height: 2339 },
  "parts-diagram-1": { width: 1654, height: 2339 },
  "parts-diagram-2": { width: 1654, height: 2339 },
};

export function ManualImageArtifact({ data, citations }: { data: ManualImageData; citations: Citation[] }) {
  const [open, setOpen] = useState(false);
  const dims = KNOWN_DIMENSIONS[data.id] ?? { width: 1654, height: 2339 };

  return (
    <ArtifactShell title={data.caption} eyebrow="Manual Figure" citations={citations}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mx-auto block w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        aria-label={`Zoom into figure: ${data.caption}`}
      >
        <Image
          src={data.path}
          alt={data.caption}
          width={dims.width}
          height={dims.height}
          sizes="(max-width: 640px) 90vw, 384px"
          className="h-auto w-full"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
            <ZoomIcon className="h-3.5 w-3.5" /> Zoom in
          </span>
        </span>
      </button>
      {data.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.topics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] text-fg-subtle"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title={data.caption} widthClassName="max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs natural intrinsic sizing */}
        <img src={data.path} alt={data.caption} className="mx-auto max-h-[75vh] w-auto rounded-md" />
      </Modal>
    </ArtifactShell>
  );
}
