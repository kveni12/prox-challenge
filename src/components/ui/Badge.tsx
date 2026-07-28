import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "warn" | "success" | "danger" | "positive" | "negative";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-border",
  accent: "bg-accent-soft text-accent border-accent-soft-border",
  warn: "bg-warn-soft text-warn border-warn-soft-border",
  success: "bg-success-soft text-success border-success/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  positive: "bg-positive-soft text-positive border-positive/30",
  negative: "bg-negative-soft text-negative border-negative/30",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
  mono = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${
        mono ? "font-mono normal-case tracking-normal" : ""
      } ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
