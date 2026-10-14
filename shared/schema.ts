import { z } from "zod";

/**
 * Parsed section of an assistant message:
 * - markdown text chunk
 * - plantuml diagram block
 */
export const DiagramBlockSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string().optional(),
});

export const PlantUmlTimelineDataSchema = z.object({
  /** Array of message blocks in order: text or diagram */
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("text"),
        content: z.string(),
      }),
      z.object({
        type: z.literal("diagram"),
        id: z.string(),
        code: z.string(),
        title: z.string().optional(),
      }),
    ])
  ),
  diagramCount: z.number(),
  phase: z.enum(["streaming", "complete"]),
});

export type PlantUmlTimelineData = z.infer<typeof PlantUmlTimelineDataSchema>;
