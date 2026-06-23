"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import { Row, reviewRow, keepFirstHighlight } from "@/lib/csvReview";

interface Props {
  rows: Row[];
  fields: string[];
  onChange: (rows: Row[]) => void;
}

const RED = "#ef4444";
const RED_BG = "rgba(239,68,68,0.12)";

// In-browser editor for an uploaded CSV. Each row is validated for the match
// cut; cells with problems are outlined red and the user can fix them inline.
export default function CsvReviewTable({ rows, fields, onChange }: Props) {
  const reviews = useMemo(() => rows.map(reviewRow), [rows]);
  const usableCount = reviews.filter((r) => r.usable).length;
  const flagged = reviews.filter((r) => r.issues.length > 0).length;

  const setCell = (i: number, field: string, value: string) => {
    const next = rows.map((r, ri) => (ri === i ? { ...r, [field]: value } : r));
    onChange(next);
  };

  const applyKeepFirst = (i: number) => {
    const fixed = keepFirstHighlight(rows[i]);
    onChange(rows.map((r, ri) => (ri === i ? fixed : r)));
  };

  if (rows.length === 0) return null;

  return (
    <div className="form-group">
      <label className="form-label flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" /> Review CSV ({usableCount}/{rows.length} usable
        {flagged > 0 ? `, ${flagged} flagged` : ""})
      </label>
      <p style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.4 }}>
        Rows highlighted <span style={{ color: RED, fontWeight: 700 }}>red</span> have problems. Edit a
        cell to fix it, or use <strong>Keep first</strong> to drop extra highlights. Flagged rows are
        excluded from the match cut until resolved.
      </p>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--border-color)",
          borderRadius: 9,
          maxHeight: 340,
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "var(--bg-inset)" }}>
              <Th style={{ width: 34, textAlign: "center" }}>#</Th>
              {fields.map((f) => (
                <Th key={f}>{f}</Th>
              ))}
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rev = reviews[i];
              const badCols = new Set(rev.issues.flatMap((x) => x.columns));
              const hasMulti = rev.issues.some((x) => x.code === "multiple-highlights");
              return (
                <tr
                  key={i}
                  style={{
                    background: rev.issues.length ? RED_BG : "transparent",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <Td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{i + 1}</Td>
                  {fields.map((f) => {
                    const bad = badCols.has(f);
                    const long = f === "content" || f === "subheadline";
                    return (
                      <Td key={f} style={{ padding: 3 }}>
                        {long ? (
                          <textarea
                            value={row[f] ?? ""}
                            onChange={(e) => setCell(i, f, e.target.value)}
                            rows={2}
                            style={cellInput(bad, 220)}
                          />
                        ) : (
                          <input
                            value={row[f] ?? ""}
                            onChange={(e) => setCell(i, f, e.target.value)}
                            style={cellInput(bad, 130)}
                          />
                        )}
                      </Td>
                    );
                  })}
                  <Td style={{ minWidth: 150 }}>
                    {rev.issues.length === 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {rev.issues.map((iss, k) => (
                          <span key={k} style={{ color: RED, lineHeight: 1.3 }}>
                            {iss.message}
                          </span>
                        ))}
                        {hasMulti && (
                          <button
                            type="button"
                            onClick={() => applyKeepFirst(i)}
                            className="btn-secondary"
                            style={{ fontSize: 10, padding: "3px 7px", alignSelf: "flex-start" }}
                          >
                            <Wand2 className="w-3 h-3" /> Keep first
                          </button>
                        )}
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cellInput(bad: boolean, width: number): React.CSSProperties {
  return {
    width,
    minWidth: width,
    fontSize: 11,
    padding: "4px 6px",
    borderRadius: 6,
    resize: "vertical",
    color: "var(--text-primary, #e5e7eb)",
    background: "var(--bg-card)",
    border: `1px solid ${bad ? RED : "var(--border-color)"}`,
    outline: "none",
  };
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "6px 8px",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "var(--text-secondary)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "4px 6px", verticalAlign: "top", ...style }}>{children}</td>;
}
