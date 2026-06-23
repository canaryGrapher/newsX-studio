"use client";

import React, { forwardRef, useRef, useState, useEffect, useLayoutEffect } from "react";
import { parseContent, parseRuns, Run, Segment } from "@/lib/content";
import { getNewspaperTheme } from "@/lib/newspaperThemes";
import type { Article } from "./NewspaperCanvas";

// useLayoutEffect on the client, useEffect on the server (avoids SSR warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Shared visual constants ─────────────────────────────────────────────────
// Default (Classic) palette — kept for backward compatibility.
export const INK = "#1a1510";
export const PAPER = "#f0e5cf";
export const SERIF = `var(--font-body-next), 'Playfair Display', Georgia, 'Times New Roman', serif`;
export const HIGHLIGHT_BG = "#f6d24b";

export const GRAIN_URL = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

interface ThemeColors {
  ink: string;
  highlightBg: string;
  highlightInk: string;
}

interface NewspaperViewProps {
  article: Article;
  resolvedImages: Record<string, string>;
  isExporting: boolean;
  /** Hide the paper grain (useful for clean match-cut frames). */
  noGrain?: boolean;
  /** Render highlight text without the marker background, keeping its geometry
   *  identical. Used to prepare the "plain" frame for the growing-highlight effect. */
  noHighlight?: boolean;
}

// Render inline runs, applying highlight marks. `startBig` enlarges the very
// first character (newspaper drop-cap).
function renderRuns(runs: Run[], startBig: boolean, hlCounter: { i: number }, c: ThemeColors) {
  let bigDone = !startBig;
  return runs.map((run, ri) => {
    let leading: React.ReactNode = null;
    let text = run.text;

    if (!bigDone && text.length > 0) {
      // Find first non-space char for the drop cap.
      const idx = text.search(/\S/);
      if (idx >= 0) {
        const before = text.slice(0, idx);
        const cap = text[idx];
        text = text.slice(idx + 1);
        leading = (
          <>
            {before}
            <span
              style={{
                float: "left",
                fontFamily: SERIF,
                fontWeight: 900,
                fontSize: "3.1em",
                lineHeight: 0.78,
                padding: "2px 6px 0 0",
                color: c.ink,
              }}
            >
              {cap}
            </span>
          </>
        );
        bigDone = true;
      }
    }

    if (run.highlight) {
      const hi = hlCounter.i++;
      return (
        <span key={ri}>
          {leading}
          <mark
            className="nx-highlight"
            data-hl-index={hi}
            style={{
              background: c.highlightBg,
              color: c.highlightInk,
              padding: "0 2px",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {text}
          </mark>
        </span>
      );
    }
    return (
      <span key={ri}>
        {leading}
        {text}
      </span>
    );
  });
}

const NewspaperView = forwardRef<HTMLDivElement, NewspaperViewProps>(
  function NewspaperView({ article, resolvedImages, isExporting, noGrain = false, noHighlight = false }, ref) {
    const theme = getNewspaperTheme(article.theme);
    const ink = theme.ink;
    const paper = theme.paper;
    const colors: ThemeColors = {
      ink: theme.ink,
      highlightBg: noHighlight ? "transparent" : theme.highlight,
      highlightInk: noHighlight ? theme.ink : theme.highlightInk,
    };
    const showGrain = theme.grain && !noGrain;

    const numCols = Math.max(1, Math.min(4, article.columns ?? 2));
    const segments = parseContent(article.content);
    const hlCounter = { i: 0 };

    // ── Auto shrink-to-fit ───────────────────────────────────────────────────
    // The body lives in a fixed-height clip box; an inner box is sized to the
    // inverse of a scale factor and then transformed down, so columns reflow
    // into the enlarged logical area and the whole thing fits without clipping.
    const clipRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useIsoLayoutEffect(() => {
      const inner = innerRef.current;
      if (!inner) return;
      const fits = (s: number) => {
        inner.style.width = `${100 / s}%`;
        inner.style.height = `${100 / s}%`;
        inner.style.transform = `scale(${s})`;
        return inner.scrollHeight <= inner.clientHeight + 1;
      };
      let best = 0.5;
      if (fits(1)) {
        best = 1;
      } else {
        let lo = 0.5;
        let hi = 1;
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) {
            best = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }
      }
      fits(best);
    });

    let paraIdx = 0;

    const renderSeg = (seg: Segment, key: number) => {
      if (seg.type === "para") {
        const isFirst = paraIdx === 0;
        const useDropCap = isFirst && !!article.dropCap;
        paraIdx++;
        return (
          <p
            key={key}
            style={{
              fontFamily: SERIF,
              fontSize: "0.82rem",
              lineHeight: 1.47,
              textAlign: "justify",
              hyphens: "auto",
              textIndent: isFirst ? "0" : "1.2em",
              margin: "0 0 7px",
              color: ink,
              breakInside: "avoid",
            }}
          >
            {renderRuns(seg.runs, useDropCap, hlCounter, colors)}
          </p>
        );
      }

      if (seg.type === "image") {
        const imgDef = article.images?.[seg.key];
        const resolved = resolvedImages[seg.key];
        const src = isExporting ? resolved : resolved || imgDef?.src;
        if (!src) return null;
        return (
          <div key={key} style={{ marginBottom: "8px", breakInside: "avoid" }}>
            <img
              src={src}
              alt=""
              style={{
                width: "100%",
                display: "block",
                filter: theme.imageFilter,
                aspectRatio: imgDef?.ratio || "4/3",
                objectFit: "cover",
              }}
            />
            {imgDef?.caption && (
              <p style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", marginTop: "3px", opacity: 0.65, lineHeight: 1.3, color: ink }}>
                {imgDef.caption}
              </p>
            )}
          </div>
        );
      }

      if (seg.type === "pullq") {
        const text = article.pullQuotes?.[seg.key];
        if (!text) return null;
        return (
          <blockquote
            key={key}
            style={{
              fontFamily: SERIF,
              fontSize: "1.2rem",
              fontWeight: 700,
              lineHeight: 1.22,
              color: ink,
              borderTop: `2.5px solid ${ink}`,
              borderBottom: `2.5px solid ${ink}`,
              paddingTop: "10px",
              paddingBottom: "10px",
              margin: "10px 0",
              textAlign: "left",
              breakInside: "avoid",
            }}
          >
            &ldquo;{text}&rdquo;
          </blockquote>
        );
      }
      return null;
    };

    return (
      <div
        ref={ref}
        style={{
          background: paper,
          color: ink,
          width: "100%",
          height: "100%",
          padding: "36px 42px 30px",
          fontFamily: SERIF,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {showGrain && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: GRAIN_URL,
              backgroundRepeat: "repeat",
              backgroundSize: "256px 256px",
              opacity: 0.09,
              pointerEvents: "none",
              zIndex: 20,
              mixBlendMode: "multiply",
            }}
          />
        )}

        <h1
          style={{
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: "2.85rem",
            lineHeight: 1.03,
            letterSpacing: "-0.3px",
            marginBottom: "10px",
            color: ink,
            position: "relative",
            zIndex: 2,
            textAlign: "left",
          }}
        >
          {renderRuns(parseRuns(article.headline || ""), false, hlCounter, colors)}
        </h1>

        {article.subheadline && (
          <p
            style={{
              fontFamily: SERIF,
              fontWeight: 400,
              fontSize: "1.08rem",
              lineHeight: 1.3,
              marginBottom: "10px",
              color: ink,
              position: "relative",
              zIndex: 2,
              textAlign: "justify",
            }}
          >
            {article.subheadline}
          </p>
        )}

        <div style={{ height: "1px", background: ink, opacity: 0.5, marginBottom: "10px", position: "relative", zIndex: 2 }} />

        <div
          ref={clipRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            ref={innerRef}
            style={{
              width: "100%",
              height: "100%",
              transformOrigin: "top left",
              columnCount: numCols,
              columnGap: "18px",
              columnFill: "balance",
            }}
          >
            <div
              style={{
                borderTop: `1px solid ${ink}`,
                borderBottom: `1px solid ${ink}`,
                padding: "4px 0 5px",
                marginBottom: "10px",
                breakInside: "avoid",
                breakAfter: "avoid",
              }}
            >
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                {article.location || "NEW DELHI"} Pub.
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "10px", marginTop: "1px" }}>
                by {article.author || "Our Special Correspondent"}
              </div>
            </div>

            {segments.map((seg, i) => renderSeg(seg, i))}
          </div>
        </div>
      </div>
    );
  }
);

export default NewspaperView;
