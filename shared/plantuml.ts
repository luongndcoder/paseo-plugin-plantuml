/**
 * PlantUML text encoding & parsing utilities.
 * Supports:
 * - Detecting ```plantuml ... ``` or ```puml ... ``` blocks
 * - Detecting @startuml ... @enduml blocks
 * - Generating PlantUML Hex and Deflate URLs
 */

export interface DiagramBlock {
  id: string;
  code: string;
  title?: string;
}

export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "diagram"; id: string; code: string; title?: string };

// PlantUML alphabet for 64-character table
const PLANTUML_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(b: number): string {
  return PLANTUML_ALPHABET.charAt(b & 0x3f);
}

function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return (
    encode6bit(c1) +
    encode6bit(c2) +
    encode6bit(c3) +
    encode6bit(c4)
  );
}

export function encodePlantUmlBytes(data: Uint8Array): string {
  let res = "";
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 < data.length) {
      res += append3bytes(data[i], data[i + 1], data[i + 2]);
    } else if (i + 1 < data.length) {
      const b1 = data[i];
      const b2 = data[i + 1];
      const c1 = b1 >> 2;
      const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
      const c3 = (b2 & 0xf) << 2;
      res += encode6bit(c1) + encode6bit(c2) + encode6bit(c3);
    } else {
      const b1 = data[i];
      const c1 = b1 >> 2;
      const c2 = (b1 & 0x3) << 4;
      res += encode6bit(c1) + encode6bit(c2);
    }
  }
  return res;
}

/**
 * Standard Hex format (~h<hex>) supported by all PlantUML servers.
 * Pure JS, UTF-8 byte encoding without relying on DOM TextEncoder.
 */
export function encodePlantUmlHex(text: string): string {
  // UTF-8 encode pure JS
  let hex = "~h";
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c < 128) {
      hex += (c < 16 ? "0" : "") + c.toString(16);
    } else if (c < 2048) {
      const b1 = (c >> 6) | 192;
      const b2 = (c & 63) | 128;
      hex += (b1 < 16 ? "0" : "") + b1.toString(16);
      hex += (b2 < 16 ? "0" : "") + b2.toString(16);
    } else if ((c & 0xfc00) === 0xd800 && i + 1 < text.length && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      // Surrogate pair
      const nextC = text.charCodeAt(++i);
      c = 0x10000 + ((c & 0x03ff) << 10) + (nextC & 0x03ff);
      const b1 = (c >> 18) | 240;
      const b2 = ((c >> 12) & 63) | 128;
      const b3 = ((c >> 6) & 63) | 128;
      const b4 = (c & 63) | 128;
      hex += (b1 < 16 ? "0" : "") + b1.toString(16);
      hex += (b2 < 16 ? "0" : "") + b2.toString(16);
      hex += (b3 < 16 ? "0" : "") + b3.toString(16);
      hex += (b4 < 16 ? "0" : "") + b4.toString(16);
    } else {
      const b1 = (c >> 12) | 224;
      const b2 = ((c >> 6) & 63) | 128;
      const b3 = (c & 63) | 128;
      hex += (b1 < 16 ? "0" : "") + b1.toString(16);
      hex += (b2 < 16 ? "0" : "") + b2.toString(16);
      hex += (b3 < 16 ? "0" : "") + b3.toString(16);
    }
  }
  return hex;
}

/**
 * Extract title from PlantUML code if present (e.g. `title My Sequence Diagram`)
 */
export function extractDiagramTitle(code: string): string | undefined {
  const titleMatch = code.match(/^\s*title\s+([^\r\n]+)/im);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  return undefined;
}

/**
 * Normalizes PlantUML source code by ensuring @startuml and @enduml wrap it.
 */
export function normalizePlantUml(code: string): string {
  let trimmed = code.trim();
  if (!/@start/i.test(trimmed)) {
    trimmed = `@startuml\n${trimmed}`;
  }
  if (!/@end/i.test(trimmed)) {
    trimmed = `${trimmed}\n@enduml`;
  }
  return trimmed;
}

/**
 * Build diagram URL using the fast HEX format or server endpoint.
 */
export function buildPlantUmlUrl(
  code: string,
  format: "svg" | "png" = "svg",
  serverUrl = "https://www.plantuml.com/plantuml"
): string {
  const normalized = normalizePlantUml(code);
  const encoded = encodePlantUmlHex(normalized);
  const cleanServer = serverUrl.replace(/\/+$/, "");
  return `${cleanServer}/${format}/${encoded}`;
}

/**
 * Regex to match PlantUML code blocks in markdown:
 * - ```plantuml ... ``` or ```puml ... ```
 * - or ```uml ... ```
 * - or bare @startuml ... @enduml
 */
const CODE_BLOCK_REGEX =
  /(?:```(?:plantuml|puml|uml)\r?\n([\s\S]*?)```|(@start(?:uml|mindmap|wbs|gantt|json|yaml|ditaa|salt)[\s\S]*?@end(?:uml|mindmap|wbs|gantt|json|yaml|ditaa|salt)))/gi;

/**
 * Parse text into sequential blocks: markdown text segments and plantuml diagram blocks.
 */
export function parsePlantUmlBlocks(text: string): MessageBlock[] {
  if (!text) return [];

  const blocks: MessageBlock[] = [];
  let lastIndex = 0;
  let diagramIndex = 0;

  // Reset regex state
  CODE_BLOCK_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Preceding text chunk
    if (matchStart > lastIndex) {
      const textChunk = text.slice(lastIndex, matchStart);
      if (textChunk) {
        blocks.push({ type: "text", content: textChunk });
      }
    }

    // Code extracted from either markdown code block group (1) or @start... group (2)
    const rawCode = match[1] ?? match[2];
    if (rawCode && rawCode.trim().length > 0) {
      const code = normalizePlantUml(rawCode);
      const title = extractDiagramTitle(code);
      blocks.push({
        type: "diagram",
        id: `plantuml-${diagramIndex++}`,
        code,
        title,
      });
    }

    lastIndex = matchEnd;
  }

  // Trailing text chunk
  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex);
    if (trailing) {
      blocks.push({ type: "text", content: trailing });
    }
  }

  return blocks;
}

/**
 * Extract only diagram blocks from text.
 */
export function extractPlantUmlBlocks(text: string): DiagramBlock[] {
  const blocks = parsePlantUmlBlocks(text);
  return blocks
    .filter((b): b is Extract<MessageBlock, { type: "diagram" }> => b.type === "diagram")
    .map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
    }));
}

