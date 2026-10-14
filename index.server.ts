import type { PluginServerContext } from "@getpaseo/plugin/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { plantUmlSettings } from "./shared/settings";
import { readDiagramFileContract, listDiagramFilesContract } from "./shared/rpc";

function getWorkspaceRoot(context: any, workspaceId?: string): string {
  if (workspaceId && context.paseo?.workspaces?.ref) {
    try {
      const handle = context.paseo.workspaces.ref(workspaceId);
      const ws = handle?.current?.();
      if (ws?.directory) return ws.directory;
    } catch {
      // Fallback
    }
  }
  return process.cwd();
}

const SUPPORTED_EXTS = new Set([".md", ".markdown", ".puml", ".plantuml", ".uml", ".txt"]);

export default function contribute(server: PluginServerContext) {
  // Register host-scoped settings document for PlantUML configuration
  server.registerSettings(plantUmlSettings);

  // Register RPC to read markdown or diagram file
  server.handle(readDiagramFileContract, async (input, context) => {
    try {
      const rootDir = getWorkspaceRoot(context, input.workspaceId);
      // Resolve path safely against rootDir or absolute if exists
      const targetPath = path.isAbsolute(input.filePath)
        ? input.filePath
        : path.resolve(rootDir, input.filePath);

      // Security check: must not escape rootDir unless explicitly accessible file
      if (!fs.existsSync(targetPath)) {
        return {
          ok: false,
          filePath: input.filePath,
          error: `File không tồn tại: ${input.filePath}`,
        };
      }

      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        return {
          ok: false,
          filePath: input.filePath,
          error: `Đường dẫn là thư mục, không phải file: ${input.filePath}`,
        };
      }

      // Max size limit: 5MB
      if (stat.size > 5 * 1024 * 1024) {
        return {
          ok: false,
          filePath: input.filePath,
          error: `File quá lớn (> 5MB): ${input.filePath}`,
        };
      }

      const content = fs.readFileSync(targetPath, "utf-8");
      return {
        ok: true,
        filePath: input.filePath,
        content,
      };
    } catch (err: any) {
      return {
        ok: false,
        filePath: input.filePath,
        error: err.message || "Lỗi đọc file",
      };
    }
  });

  // Register RPC to list diagram-candidate files in workspace
  server.handle(listDiagramFilesContract, async (input, context) => {
    try {
      const rootDir = getWorkspaceRoot(context, input.workspaceId);
      const results: string[] = [];

      function walk(currentDir: string, depth = 0) {
        if (depth > 4 || results.length >= 60) return;
        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(currentDir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") {
            continue;
          }
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTS.has(ext)) {
              results.push(path.relative(rootDir, fullPath));
            }
          }
        }
      }

      walk(rootDir);

      return {
        ok: true,
        files: results,
      };
    } catch (err: any) {
      return {
        ok: false,
        files: [],
        error: err.message || "Lỗi duyệt file",
      };
    }
  });

  return () => {};
}
