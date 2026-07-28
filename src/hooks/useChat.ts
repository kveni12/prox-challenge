"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedArtifact } from "@/agent/artifacts";

export type AgentEvent =
  | { type: "text_delta"; text: string }
  | { type: "artifact"; artifact: ResolvedArtifact }
  | { type: "tool_call"; toolName: string }
  | { type: "session"; sessionId: string }
  | { type: "error"; message: string; code?: string }
  | { type: "done" };

export type ToolName =
  | "search_manual"
  | "find_manual_image"
  | "lookup_duty_cycle"
  | "lookup_polarity"
  | "render_artifact"
  | "list_processes";

export const TOOL_STATUS_LABEL: Record<string, string> = {
  search_manual: "Searching the manual…",
  find_manual_image: "Finding the manual diagram…",
  lookup_duty_cycle: "Looking up duty cycle…",
  lookup_polarity: "Checking polarity wiring…",
  lookup_troubleshooting: "Checking troubleshooting tables…",
  render_artifact: "Building the visual…",
  list_processes: "Checking supported processes…",
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  artifacts: ResolvedArtifact[];
  toolCalls: string[];
  status: "streaming" | "done" | "error";
  errorMessage?: string;
  errorCode?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  fatalError: string | null;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function getConversationId(): string {
  if (typeof window === "undefined") return "server";
  const key = "vulcan-conversation-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

interface StreamJsonError {
  error?: unknown;
  message?: unknown;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({ messages: [], isStreaming: false, fatalError: null });
  const conversationIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef<string>("");

  useEffect(() => {
    conversationIdRef.current = getConversationId();
  }, []);

  const updateAssistant = useCallback((id: string, updater: (msg: ChatMessage) => ChatMessage) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === id ? updater(m) : m)),
    }));
  }, []);

  const applyEvent = useCallback(
    (assistantId: string, event: AgentEvent) => {
      switch (event.type) {
        case "text_delta":
          updateAssistant(assistantId, (m) => ({ ...m, text: m.text + event.text }));
          break;
        case "artifact":
          updateAssistant(assistantId, (m) => ({ ...m, artifacts: [...m.artifacts, event.artifact] }));
          break;
        case "tool_call":
          updateAssistant(assistantId, (m) => ({ ...m, toolCalls: [...m.toolCalls, event.toolName] }));
          break;
        case "session":
          break;
        case "error":
          updateAssistant(assistantId, (m) => ({
            ...m,
            status: "error",
            errorMessage: event.message,
            errorCode: event.code,
          }));
          break;
        case "done":
          updateAssistant(assistantId, (m) => (m.status === "error" ? m : { ...m, status: "done" }));
          break;
      }
    },
    [updateAssistant],
  );

  const runStream = useCallback(
    async (assistantId: string, text: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isStreaming: true, fatalError: null }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId: conversationIdRef.current }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok || !contentType.includes("text/event-stream")) {
          let message = `Request failed (${res.status}).`;
          try {
            const body = (await res.json()) as StreamJsonError;
            if (typeof body.message === "string") message = body.message;
          } catch {
            // non-JSON error body; keep the generic message
          }
          applyEvent(assistantId, { type: "error", message });
          return;
        }

        if (!res.body) {
          applyEvent(assistantId, { type: "error", message: "No response body from server." });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            const jsonText = line.slice(5).trim();
            if (!jsonText) continue;
            try {
              const event = JSON.parse(jsonText) as AgentEvent;
              applyEvent(assistantId, event);
            } catch {
              // ignore malformed frame
            }
          }
        }

        // Flush any trailing buffered frame without a closing \n\n.
        const trailing = buffer.trim();
        if (trailing.startsWith("data:")) {
          const jsonText = trailing.slice(5).trim();
          if (jsonText) {
            try {
              const event = JSON.parse(jsonText) as AgentEvent;
              applyEvent(assistantId, event);
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        applyEvent(assistantId, {
          type: "error",
          message: err instanceof Error ? err.message : "Connection to the assistant was lost.",
        });
      } finally {
        setState((prev) => ({ ...prev, isStreaming: false }));
        abortRef.current = null;
      }
    },
    [applyEvent],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || state.isStreaming) return;
      lastUserTextRef.current = trimmed;

      const userMessage: ChatMessage = {
        id: nextId("user"),
        role: "user",
        text: trimmed,
        artifacts: [],
        toolCalls: [],
        status: "done",
      };
      const assistantId = nextId("assistant");
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        artifacts: [],
        toolCalls: [],
        status: "streaming",
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
      }));

      void runStream(assistantId, trimmed);
    },
    [runStream, state.isStreaming],
  );

  const retry = useCallback(() => {
    if (!lastUserTextRef.current || state.isStreaming) return;
    const text = lastUserTextRef.current;

    setState((prev) => {
      const messages = [...prev.messages];
      // Drop the trailing failed assistant message (and, if present, the
      // user message immediately preceding it) so retry doesn't duplicate.
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant" && last.status === "error") {
        messages.pop();
        const prevLast = messages[messages.length - 1];
        if (prevLast && prevLast.role === "user" && prevLast.text === text) {
          messages.pop();
        }
      }
      return { ...prev, messages };
    });

    const userMessage: ChatMessage = {
      id: nextId("user"),
      role: "user",
      text,
      artifacts: [],
      toolCalls: [],
      status: "done",
    };
    const assistantId = nextId("assistant");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      artifacts: [],
      toolCalls: [],
      status: "streaming",
    };

    setState((prev) => ({ ...prev, messages: [...prev.messages, userMessage, assistantMessage] }));
    void runStream(assistantId, text);
  }, [runStream, state.isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    lastUserTextRef.current = "";
    if (typeof window !== "undefined") {
      const fresh = crypto.randomUUID();
      window.sessionStorage.setItem("vulcan-conversation-id", fresh);
      conversationIdRef.current = fresh;
    }
    setState({ messages: [], isStreaming: false, fatalError: null });
  }, []);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    sendMessage,
    retry,
    resetConversation,
  };
}
