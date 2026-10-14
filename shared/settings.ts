import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const DEFAULT_PLANTUML_CONFIG = {
  serverUrl: "https://www.plantuml.com/plantuml",
  defaultFormat: "svg" as const,
  defaultView: "preview" as const,
};

export const plantUmlSettings = defineSettings({
  id: "plantuml-config",
  scope: "host",
  version: 1,
  schema: z.object({
    /** Server URL for rendering PlantUML, defaults to official public server */
    serverUrl: z.string().default("https://www.plantuml.com/plantuml"),
    /** Default format for diagram images: svg or png */
    defaultFormat: z.enum(["svg", "png"]).default("svg"),
    /** Automatically render diagram preview on load (or start in preview mode) */
    defaultView: z.enum(["preview", "code"]).default("preview"),
  }),
});
