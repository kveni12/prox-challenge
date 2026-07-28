"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a copy of `value` that updates at most once every `delayMs`,
 * always settling on the latest value once updates stop. Used to keep
 * aria-live announcements of streaming text from firing on every single
 * token — screen readers get periodic updates instead of a flood.
 */
export function useThrottledValue<T>(value: T, delayMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRun = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastRun.current;

    if (elapsed >= delayMs) {
      lastRun.current = now;
      setThrottled(value);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastRun.current = Date.now();
      setThrottled(value);
    }, delayMs - elapsed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delayMs]);

  return throttled;
}
