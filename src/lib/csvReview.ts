// Validation + normalization for CSV rows feeding the Match Cut Studio.
// A match cut anchors each frame to ONE highlight, so rows are flagged when
// they have no highlight, more than one, an unfindable highlight phrase, or a
// broken/empty format. The studio shows these in an editable table.

import { articleHighlights, hasHighlight } from "./content";
import { rowToArticle } from "./csvArticle";

export type Row = Record<string, string>;

const HL = /<highlight>([\s\S]*?)<\/highlight>/g;

export type IssueCode =
  | "no-highlight"
  | "multiple-highlights"
  | "highlight-not-found"
  | "bad-format";

export interface RowIssue {
  code: IssueCode;
  message: string;
  columns: string[]; // columns to flag red for this issue
}

export interface RowReview {
  issues: RowIssue[];
  usable: boolean; // can this row be used as a match-cut frame?
  highlightCount: number;
}

const trim = (v: unknown) => String(v ?? "").trim();

// Inspect a raw CSV row and report any problems that would break a match cut.
export function reviewRow(row: Row): RowReview {
  const issues: RowIssue[] = [];
  const content = trim(row.content);
  const headline = trim(row.headline);

  // ── Bad format / missing fields ──
  const empty = Object.values(row).every((v) => trim(v) === "");
  if (empty || (!content && !hasHighlight(headline))) {
    issues.push({
      code: "bad-format",
      message: "Empty or missing content — nothing to render.",
      columns: ["content"],
    });
  }

  // ── Highlight phrase columns that don't appear in their target text ──
  const hl = trim(row.highlight);
  if (hl && content && !hasHighlight(content) && !content.includes(hl)) {
    issues.push({
      code: "highlight-not-found",
      message: `Highlight "${hl}" was not found in the content.`,
      columns: ["highlight", "content"],
    });
  }
  const ht = trim(row.highlightTitle) || trim(row.titleHighlight);
  const htCol = row.highlightTitle !== undefined ? "highlightTitle" : "titleHighlight";
  if (ht && headline && !hasHighlight(headline) && !headline.includes(ht)) {
    issues.push({
      code: "highlight-not-found",
      message: `Title highlight "${ht}" was not found in the headline.`,
      columns: [htCol, "headline"],
    });
  }

  // ── Count effective highlights across title + body ──
  const art = rowToArticle(row, 0);
  const highlightCount = articleHighlights(art).length;

  if (highlightCount === 0) {
    issues.push({
      code: "no-highlight",
      message: "No highlight in the title or content — match cut needs one.",
      columns: ["highlight", "highlightTitle", "headline", "content"].filter(
        (c) => c in row
      ),
    });
  } else if (highlightCount > 1) {
    issues.push({
      code: "multiple-highlights",
      message: `${highlightCount} highlights found — a frame anchors to just one.`,
      columns: ["highlight", "highlightTitle", "headline", "content"].filter(
        (c) => c in row
      ),
    });
  }

  // A row is usable if it has content and at least one highlight. Multiple
  // highlights still work (the first is used), but stay flagged until fixed.
  const usable =
    highlightCount >= 1 && (!!content || hasHighlight(headline));

  return { issues, usable, highlightCount };
}

// Fold the helper highlight columns into inline <highlight> tags so the text
// itself carries the marks, then clear the helper columns.
function bakeRow(row: Row): Row {
  const out: Row = { ...row };
  const content = out.content || "";
  const hl = trim(out.highlight);
  if (hl && !hasHighlight(content) && content.includes(hl)) {
    out.content = content.replace(hl, `<highlight>${hl}</highlight>`);
  }
  const headline = out.headline || "";
  const ht = trim(out.highlightTitle) || trim(out.titleHighlight);
  if (ht && !hasHighlight(headline) && headline.includes(ht)) {
    out.headline = headline.replace(ht, `<highlight>${ht}</highlight>`);
  }
  if ("highlight" in out) out.highlight = "";
  if ("highlightTitle" in out) out.highlightTitle = "";
  if ("titleHighlight" in out) out.titleHighlight = "";
  return out;
}

// Strip every <highlight> except the first (title takes precedence over body).
// Used by the "keep first" one-click fix for multi-highlight rows.
export function keepFirstHighlight(row: Row): Row {
  const out = bakeRow(row);
  const head = out.headline || "";
  const body = out.content || "";
  HL.lastIndex = 0;
  const titleHasMark = HL.test(head);
  HL.lastIndex = 0;

  if (titleHasMark) {
    let seen = false;
    out.headline = head.replace(HL, (full, inner) => {
      if (seen) return inner;
      seen = true;
      return full;
    });
    out.content = body.replace(HL, (_full, inner) => inner);
  } else {
    let seen = false;
    out.content = body.replace(HL, (full, inner) => {
      if (seen) return inner;
      seen = true;
      return full;
    });
  }
  return out;
}
