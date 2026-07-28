"use client";

import { useEffect, useRef, useState } from "react";
import { useThrottledValue } from "./useThrottledValue";

/**
 * Produces periodic, incremental chunks of `text` suitable for an aria-live
 * region — instead of announcing every single streamed token (spammy) or
 * the full message on every update (repetitive), it throttles to ~1
 * announcement per second and only reports what's new since the last one.
 */
export function useStreamAnnouncement(text: string, streaming: boolean, delayMs = 900): string {
  const [announcement, setAnnouncement] = useState("");
  const announcedLengthRef = useRef(0);
  const throttledText = useThrottledValue(text, delayMs);

  useEffect(() => {
    if (!streaming) return;
    const chunk = throttledText.slice(announcedLengthRef.current);
    if (chunk.trim().length > 0) {
      setAnnouncement(chunk);
      announcedLengthRef.current = throttledText.length;
    }
  }, [throttledText, streaming]);

  useEffect(() => {
    if (streaming) return;
    const chunk = text.slice(announcedLengthRef.current);
    if (chunk.trim().length > 0) {
      setAnnouncement(chunk);
      announcedLengthRef.current = text.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  return announcement;
}
