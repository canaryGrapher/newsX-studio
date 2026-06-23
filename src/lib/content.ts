// Shared newspaper content parsing.
// Supports inline tokens {image1}, {pullq1} for block placement,
// and an inline <highlight>...</highlight> mapper that marks text runs.

export interface Run {
  text: string;
  highlight: boolean;
}

export type Segment =
  | { type: "para"; runs: Run[] }
  | { type: "image"; key: string }
  | { type: "pullq"; key: string };

const BLOCK_TOKEN_RE = /(\{(?:image|pullq)\d+\})/g;
const HIGHLIGHT_RE = /<highlight>([\s\S]*?)<\/highlight>/g;

// Split a plain paragraph string into highlighted / non-highlighted runs.
export function parseRuns(text: string): Run[] {
  const runs: Run[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  HIGHLIGHT_RE.lastIndex = 0;

  while ((m = HIGHLIGHT_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, m.index), highlight: false });
    }
    if (m[1]) runs.push({ text: m[1], highlight: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), highlight: false });
  }
  return runs.length ? runs : [{ text, highlight: false }];
}

export function parseContent(content: string): Segment[] {
  const parts = content.split(BLOCK_TOKEN_RE);
  const segments: Segment[] = [];

  for (const part of parts) {
    if (/^\{image\d+\}$/.test(part)) {
      segments.push({ type: "image", key: part.slice(1, -1) });
    } else if (/^\{pullq\d+\}$/.test(part)) {
      segments.push({ type: "pullq", key: part.slice(1, -1) });
    } else {
      const paras = part.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      for (const p of paras) segments.push({ type: "para", runs: parseRuns(p) });
    }
  }
  return segments;
}

// Plain text with all tokens/markup stripped (for previews, titles, etc.)
export function stripMarkup(content: string): string {
  return content
    .replace(BLOCK_TOKEN_RE, " ")
    .replace(HIGHLIGHT_RE, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Every highlighted phrase found in the body, in order.
export function extractHighlights(content: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  HIGHLIGHT_RE.lastIndex = 0;
  while ((m = HIGHLIGHT_RE.exec(content)) !== null) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  return out;
}

export function hasHighlight(content: string): boolean {
  HIGHLIGHT_RE.lastIndex = 0;
  return HIGHLIGHT_RE.test(content);
}
