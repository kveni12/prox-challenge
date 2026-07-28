"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SendIcon } from "@/components/ui/icons";

const MAX_LENGTH = 4000;

export function Composer({
  onSend,
  disabled,
  autoFocus = true,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    // Keep composer focused and ready for the next question right after a
    // response finishes — a persistent "next action" affordance.
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent-soft-border">
      <label htmlFor="chat-composer" className="sr-only">
        Ask the Vulcan OmniPro 220 assistant a question
      </label>
      <textarea
        id="chat-composer"
        ref={textareaRef}
        rows={1}
        value={value}
        maxLength={MAX_LENGTH}
        placeholder="Ask about setup, polarity, duty cycle, troubleshooting…"
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
