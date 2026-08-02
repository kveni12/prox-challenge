import type { ResolvedArtifact } from "@/agent/artifacts";
import { parseCitations } from "@/lib/citations";
import { PolarityDiagram } from "./PolarityDiagram";
import { DutyCycleTable } from "./DutyCycleTable";
import { TroubleshootingFlowchart } from "./TroubleshootingFlowchart";
import { ProcessSelector } from "./ProcessSelector";
import { ManualImageArtifact } from "./ManualImageArtifact";
import { ComparisonTable } from "./ComparisonTable";
import {
  asPolarityDiagramData,
  asDutyCycleTableData,
  asTroubleshootingFlowchartData,
  asProcessSelectorData,
  asManualImageData,
  asComparisonTableData,
} from "./types";

function UnsupportedArtifact({ title }: { title: string }) {
  return (
    <div className="my-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-fg-muted">
      Couldn&apos;t render &ldquo;{title}&rdquo; — the artifact data didn&apos;t match the expected shape.
    </div>
  );
}

export function ArtifactRenderer({ artifact }: { artifact: ResolvedArtifact }) {
  const citations = parseCitations(artifact.citations);

  switch (artifact.type) {
    case "polarity_diagram": {
      const data = asPolarityDiagramData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <PolarityDiagram data={data} citations={citations} />;
    }
    case "duty_cycle_table": {
      const data = asDutyCycleTableData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <DutyCycleTable data={data} citations={citations} />;
    }
    case "troubleshooting_flowchart": {
      const data = asTroubleshootingFlowchartData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <TroubleshootingFlowchart data={data} citations={citations} />;
    }
    case "process_selector": {
      const data = asProcessSelectorData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <ProcessSelector data={data} citations={citations} />;
    }
    case "manual_image": {
      const data = asManualImageData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <ManualImageArtifact data={data} citations={citations} />;
    }
    case "comparison_table": {
      const data = asComparisonTableData(artifact.data);
      if (!data) return <UnsupportedArtifact title={artifact.title} />;
      return <ComparisonTable data={data} citations={citations} />;
    }
    default:
      return <UnsupportedArtifact title={artifact.title} />;
  }
}
