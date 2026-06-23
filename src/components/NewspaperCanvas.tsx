"use client";

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import html2canvas from "html2canvas";
import NewspaperView from "./NewspaperView";
import { useResolvedImages } from "@/lib/useResolvedImages";
import { analytics } from "@/lib/analytics";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ArticleImage {
  src: string;
  caption?: string;
  ratio?: string; // e.g. "4/3", "1/1", "16/9"
}

export interface Article {
  id?: string;
  headline: string;
  subheadline: string;
  /** Body text. Use {image1}, {image2}, {pullq1} as inline placement tokens,
   *  and <highlight>...</highlight> to mark text for emphasis / match cuts. */
  content: string;
  date: string;
  author: string;
  location?: string;
  /** Number of body columns, 1–3. Default 2. */
  columns?: number;
  /** Canvas aspect-ratio preset key. Default "portrait". */
  articleRatio?: string;
  /** Enlarge the first character of the body (newspaper drop cap). */
  dropCap?: boolean;
  /** Images keyed by token name, e.g. { "image1": { src, caption, ratio } } */
  images?: Record<string, ArticleImage>;
  /** Pull-quote texts keyed by token name, e.g. { "pullq1": "Quote text" } */
  pullQuotes?: Record<string, string>;
  // Legacy single-image fields (kept for backward compat)
  image?: string;
  imageCaption?: string;
  imageRatio?: string;
  quote?: string;
  theme?: string;
  layout?: string;
  price?: string;
  category?: string;
  newspaperName?: string;
  pageNumber?: string;
}

export interface NewspaperCanvasHandle {
  download: () => Promise<void>;
}

interface NewspaperCanvasProps {
  article: Article;
  onExportSuccess?: (dataUrl: string) => void;
  isGenerating?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const CANVAS_PRESETS: Record<string, [number, number]> = {
  portrait: [550, 778],
  square: [600, 600],
  landscape: [778, 550],
  story: [550, 980],
};

// ── Component ─────────────────────────────────────────────────────────────────

const NewspaperCanvas = forwardRef<NewspaperCanvasHandle, NewspaperCanvasProps>(
  function NewspaperCanvas({ article, onExportSuccess, isGenerating = false }, ref) {
    const exportRef = useRef<HTMLDivElement>(null);
    const previewWrapperRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);
    const [mounted, setMounted] = useState(false);
    const resolvedImages = useResolvedImages(article.images);

    const [canvasW, canvasH] = CANVAS_PRESETS[article.articleRatio ?? "portrait"] ?? CANVAS_PRESETS.portrait;

    useEffect(() => {
      setMounted(true);
    }, []);

    // Scale preview to fit the available preview area. A ResizeObserver keeps it
    // correct when the layout reflows (e.g. the nav rail collapses/expands).
    useEffect(() => {
      const wrap = previewWrapperRef.current;
      const compute = () => {
        const availW = (wrap?.clientWidth ?? window.innerWidth - 740) - 32;
        const availH = window.innerHeight - 160;
        const next = Math.min(availW / canvasW, availH / canvasH, 1.05);
        setScale(next > 0.1 ? next : 0.1);
      };
      compute();
      const ro = wrap && "ResizeObserver" in window ? new ResizeObserver(compute) : null;
      if (wrap && ro) ro.observe(wrap);
      window.addEventListener("resize", compute);
      return () => {
        window.removeEventListener("resize", compute);
        ro?.disconnect();
      };
    }, [canvasW, canvasH]);

    const handleDownload = async () => {
      if (!exportRef.current) return;
      const meta = {
        theme: article.theme,
        columns: article.columns,
        article_ratio: article.articleRatio,
        image_count: Object.keys(article.images ?? {}).length,
        pull_quote_count: Object.keys(article.pullQuotes ?? {}).length,
        headline_length: article.headline.length,
        content_length: article.content.length,
      };
      analytics.exportStarted(meta);
      try {
        await new Promise((r) => setTimeout(r, 300));
        const canvas = await html2canvas(exportRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
          logging: false,
        });
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.download = `newspaper-${article.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}.png`;
        a.href = dataUrl;
        a.click();
        analytics.exportSucceeded(meta);
        onExportSuccess?.(dataUrl);
      } catch (err) {
        console.error(err);
        analytics.exportFailed(err instanceof Error ? err.message : "unknown");
        alert("Export failed. Check your image URL and try again.");
      }
    };

    useImperativeHandle(ref, () => ({ download: handleDownload }));

    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Scaled live preview */}
        <div
          ref={previewWrapperRef}
          className="w-full flex justify-center items-center overflow-hidden"
          style={{
            height: `${canvasH * scale + 32}px`,
            transition: "height 0.2s ease",
            padding: "16px",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border-color)",
            background: "var(--bg-inset)",
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              width: `${canvasW}px`,
              height: `${canvasH}px`,
              flexShrink: 0,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.3s ease",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <NewspaperView article={article} resolvedImages={resolvedImages} isExporting={false} />
          </div>
        </div>

        {/* Hidden high-res export element */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div style={{ width: `${canvasW}px`, height: `${canvasH}px` }}>
            <NewspaperView ref={exportRef} article={article} resolvedImages={resolvedImages} isExporting={true} />
          </div>
        </div>
      </div>
    );
  }
);

export default NewspaperCanvas;
