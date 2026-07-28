"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-strong disabled:bg-accent/50 border border-transparent shadow-sm",
  secondary:
    "bg-surface text-fg border border-border hover:bg-surface-hover disabled:opacity-50",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg border border-transparent",
  danger: "bg-danger text-accent-fg hover:opacity-90 border border-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5 rounded-md",
  md: "text-sm px-3.5 py-2 gap-2 rounded-lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconTrailing,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
      {iconTrailing}
    </button>
  );
}

export function IconButton({
  label,
  active,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-150 ${
        active
          ? "border-accent-soft-border bg-accent-soft text-accent"
          : "border-border bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
