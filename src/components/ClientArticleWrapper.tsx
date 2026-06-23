"use client";

import React, { useEffect } from "react";
import NewspaperCanvas, { Article } from "./NewspaperCanvas";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";

interface ClientArticleWrapperProps {
  article: Article;
}

export default function ClientArticleWrapper({ article }: ClientArticleWrapperProps) {
  useEffect(() => {
    track("shared_article_viewed", { article_id: article.id, theme: article.theme });
  }, [article.id, article.theme]);

  return (
    <div
      className="flex flex-col items-center justify-center relative"
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        backgroundColor: "var(--bg-dash)",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, var(--accent-glow), transparent 70%), radial-gradient(var(--border-color) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 22px 22px",
      }}
    >
      {/* Top Floating Bar */}
      <div className="w-full max-w-[550px] flex justify-between items-center mb-6">
        <Link href="/" className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Studio
        </Link>
        <span
          className="text-[10px] uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "0.16em", fontWeight: 600 }}
        >
          NewsX Shared Press
        </span>
      </div>

      {/* Render the Canvas (which has the download button built-in) */}
      <div
        className="w-full max-w-[550px]"
        style={{
          padding: "10px",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <NewspaperCanvas article={article} />
      </div>

      <footer className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        <p>A simulated newspaper layout composed in NewsX.</p>
      </footer>
    </div>
  );
}
