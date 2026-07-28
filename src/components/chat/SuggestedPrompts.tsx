import type { ComponentType } from "react";
import { WrenchIcon, SparkIcon, AlertIcon, GridIcon, ImageIcon, type IconProps } from "@/components/ui/icons";

interface Prompt {
  category: string;
  text: string;
  icon: ComponentType<IconProps>;
}

const PROMPTS: Prompt[] = [
  {
    category: "Polarity",
    text: "What polarity setup do I need for TIG welding? Which socket does the ground clamp go in?",
    icon: WrenchIcon,
  },
  {
    category: "Numeric",
    text: "What's the duty cycle for MIG welding at 200A on 240V?",
    icon: SparkIcon,
  },
  {
    category: "Troubleshooting",
    text: "I'm getting porosity in my flux-cored welds. What should I check?",
    icon: AlertIcon,
  },
  {
    category: "Process selection",
    text: "Which process should I use for 1/4 inch steel?",
    icon: GridIcon,
  },
  {
    category: "Visual",
    text: "Show me the front panel controls.",
    icon: ImageIcon,
  },
  {
    category: "Comparison",
    text: "MIG vs flux-cored — what's actually different?",
    icon: GridIcon,
  },
];

export function SuggestedPrompts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {PROMPTS.map((prompt) => {
        const Icon = prompt.icon;
        return (
          <button
            key={prompt.text}
            type="button"
            onClick={() => onSelect(prompt.text)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-accent-soft-border hover:bg-accent-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
              <Icon className="h-3.5 w-3.5" />
              {prompt.category}
            </span>
            <span className="text-sm leading-snug text-fg-muted group-hover:text-fg">{prompt.text}</span>
          </button>
        );
      })}
    </div>
  );
}
