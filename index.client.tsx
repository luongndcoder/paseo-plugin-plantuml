import type { PluginClientContext } from "@getpaseo/plugin/client";
import { parsePlantUmlBlocks } from "./shared/plantuml";
import { PlantUmlTimelineDataSchema } from "./shared/schema";
import { PlantUmlTimelineItem } from "./client/timeline-item";
import { PlantUmlSettingsScreen } from "./client/settings-screen";
import { WorkspaceDiagramPanel } from "./client/workspace-panel";

export default function contribute(client: PluginClientContext) {
  // 1. Transform assistant_message containing PlantUML blocks into a custom plugin timeline item
  client.addTimelineTransformer({
    id: "plantuml-renderer",
    query: { itemType: "assistant_message" },
    transform({ item, phase }) {
      const text = item.text;
      if (!text) return undefined;

      // Quick check before deep parsing to preserve fast path for plain messages
      const hasPlantUml =
        /```(?:plantuml|puml|uml)/i.test(text) ||
        /@start(?:uml|mindmap|wbs|gantt|json|yaml|ditaa|salt)/i.test(text);

      if (!hasPlantUml) {
        return undefined; // Keep native assistant message
      }

      const blocks = parsePlantUmlBlocks(text);
      const diagramBlocks = blocks.filter((b) => b.type === "diagram");

      // If no valid diagram extracted, keep original
      if (diagramBlocks.length === 0) {
        return undefined;
      }

      return {
        items: [
          {
            type: "plugin",
            kind: "plantuml-card",
            version: 1,
            data: {
              blocks,
              diagramCount: diagramBlocks.length,
              phase,
            },
          },
        ],
      };
    },
  });

  // 2. Register timeline renderer component
  client.addTimelineRenderer({
    kind: "plantuml-card",
    version: 1,
    schema: PlantUmlTimelineDataSchema,
    Component: PlantUmlTimelineItem,
  });

  // 3. Register settings screen in Settings -> Plugins
  client.addSettingsScreen({
    id: "plantuml-settings",
    title: "PlantUML Preview",
    icon: "Network",
    Component: PlantUmlSettingsScreen,
  });

  // 4. Register Workspace Panel for previewing Markdown & PUML files
  client.addWorkspacePanel({
    id: "plantuml-preview-panel",
    title: "PlantUML Preview",
    icon: "Network",
    locations: ["workspace", "explorer"],
    context: "workspace",
    Component: WorkspaceDiagramPanel,
  });

  // 5. Register Command Center item to open the preview panel quickly
  client.addCommandCenterItem({
    id: "open-plantuml-preview",
    title: "PlantUML: Open Diagram & Markdown Preview",
    icon: "Network",
    keywords: ["plantuml", "puml", "preview", "diagram", "markdown", "uml"],
    context: "workspace",
    onSelect(ctx) {
      ctx.openPanel("plantuml-preview-panel", { location: "workspace" });
    },
  });

  // 6. Register Slash Command in composer
  client.addSlashCommand({
    name: "plantuml",
    description: "Mở tab xem trước sơ đồ PlantUML từ file .md/.puml trong workspace",
    argumentHint: "[file path]",
    context: "workspace",
    onSubmit(ctx) {
      ctx.openPanel("plantuml-preview-panel", { location: "workspace" });
    },
  });

  return () => {};
}
