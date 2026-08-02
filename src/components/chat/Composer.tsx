"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { SendIcon, PaperclipIcon, CloseIcon } from "@/components/ui/icons";
import type { ImageAttachment } from "@/agent/run";

const MAX_LENGTH = 4000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_PHOTO_PROMPT = "What's wrong with this weld? Please diagnose it.";

interface AttachedImage extends ImageAttachment {
  name: string;
  previewUrl: string;
}

export function Composer({
  onSend,
  disabled,
  autoFocus = true,
}: {
  onSend: (text: string, image?: ImageAttachment) => void;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    // Keep composer focused and ready for the next question right after a
    // response finishes — a persistent "next action" affordance.
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAttachError(null);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setAttachError("Only JPEG, PNG, or WebP photos are supported.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setAttachError("Photo is too large (max 8MB). Try a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.slice(result.indexOf(",") + 1);
      setAttachedImage({ mediaType: file.type as ImageAttachment["mediaType"], data, name: file.name, previewUrl: result });
    };
    reader.onerror = () => setAttachError("Couldn't read that file. Try again.");
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attachedImage) || disabled) return;
    const outgoingText = trimmed || DEFAULT_PHOTO_PROMPT;
    onSend(outgoingText, attachedImage ? { mediaType: attachedImage.mediaType, data: attachedImage.data } : undefined);
    setValue("");
    setAttachedImage(null);
    setAttachError(null);
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
    <div>
      {attachedImage ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-fg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob/data URL preview, not an optimizable remote asset */}
          <img src={attachedImage.previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate">{attachedImage.name}</span>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            aria-label="Remove attached photo"
            className="shrink-0 rounded p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {attachError ? <p className="mb-2 text-xs text-warn">{attachError}</p> : null}

      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent-soft-border">
        <label htmlFor="chat-composer" className="sr-only">
          Ask the Vulcan OmniPro 220 assistant a question
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach a photo of your weld"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PaperclipIcon className="h-4 w-4" />
        </button>
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
          disabled={disabled || (value.trim().length === 0 && !attachedImage)}
          aria-label="Send message"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
