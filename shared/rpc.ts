import { z } from "zod";
import { defineRpc } from "@getpaseo/plugin";

export const readDiagramFileContract = defineRpc({
  name: "plantuml.read_file",
  input: z.object({
    workspaceId: z.string().optional(),
    filePath: z.string().min(1),
  }),
  output: z.object({
    ok: z.boolean(),
    filePath: z.string(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const listDiagramFilesContract = defineRpc({
  name: "plantuml.list_files",
  input: z.object({
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    ok: z.boolean(),
    files: z.array(z.string()),
    error: z.string().optional(),
  }),
});
