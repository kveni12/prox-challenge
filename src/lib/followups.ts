import type { ChatMessage } from "@/hooks/useChat";

const DEFAULT_FOLLOWUPS = [
  "What polarity setup do I need for TIG welding?",
  "Which process should I use for 1/4 inch steel?",
];

const BY_ARTIFACT_TYPE: Record<string, string[]> = {
  polarity_diagram: ["What's the duty cycle for this process?", "What should I check if I get excessive spatter?"],
  duty_cycle_table: ["What polarity does this process need?", "Show me troubleshooting for burn-through."],
  troubleshooting_checklist: ["What polarity setup do I need for this process?", "What's the duty cycle at my target amperage?"],
  process_selector: ["What's the duty cycle for MIG at 240V?", "What polarity does flux-cored use?"],
  comparison_table: ["Which process should I use for aluminum?", "What's the duty cycle for flux-cored?"],
  manual_image: ["What does the wiring schematic show?", "What are the front panel controls?"],
};

export function getFollowups(message: ChatMessage): string[] {
  const lastArtifact = message.artifacts[message.artifacts.length - 1];
  if (lastArtifact) {
    const suggestions = BY_ARTIFACT_TYPE[lastArtifact.type];
    if (suggestions) return suggestions;
  }
  return DEFAULT_FOLLOWUPS;
}
