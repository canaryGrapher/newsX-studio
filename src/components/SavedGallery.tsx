"use client";

import React from "react";
import { Article } from "./NewspaperCanvas";
import { Trash2, Download, Edit3, Image as ImageIcon, Sparkles } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface SavedGalleryProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  onEditArticle: (article: Article) => void;
}

export default function SavedGallery({
  articles,
  onSelectArticle,
  onDeleteArticle,
  onEditArticle,
}: SavedGalleryProps) {
  if (articles.length === 0) {
    return (
      <div className="form-section flex flex-col items-center justify-center py-12 text-center text-gray-500">
        <Sparkles className="w-12 h-12 mb-4 text-gray-600 opacity-60" />
        <p className="font-bold text-gray-400">No Saved Articles Yet</p>
        <p className="text-xs max-w-xs mt-1">
          Create articles using the Single Generator form or upload a CSV file to generate them in bulk.
        </p>
      </div>
    );
  }

  return (
    <div className="form-section">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Saved Articles ({articles.length})</h3>
      </div>

      <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
        {articles.map((art) => {
          const defaultTitle = art.newspaperName || 
            (art.theme === "vintage" ? "THE DAILY CHRONICLE" :
             art.theme === "tabloid" ? "THE DAILY SPITFIRE" :
             art.theme === "cyberpunk" ? "NEO-TOKYO SHIMBUN" :
             "THE VINTAGE GAZETTE");

          return (
            <div
              key={art.id}
              onClick={() => {
                analytics.articleSelected(art.id);
                onSelectArticle(art);
              }}
              className="bg-black/30 border border-white/5 hover:border-blue-500/40 rounded-lg p-4 cursor-pointer transition-all duration-200 group flex flex-col gap-3"
            >
              {/* Header Info */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">
                    {defaultTitle}
                  </span>
                  <h4 className="text-sm font-bold text-gray-200 leading-snug truncate group-hover:text-blue-400 transition-colors" title={art.headline}>
                    {art.headline}
                  </h4>
                </div>
                <span className={`badge badge-${art.theme} shrink-0`}>
                  {art.theme}
                </span>
              </div>

              {/* Summary / Body Preview */}
              <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed italic">
                "{art.content.substring(0, 100)}..."
              </p>

              {/* Footer Meta & Actions */}
              <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                <div className="flex flex-col text-[10px] text-gray-500">
                  <span>By {art.author || "Staff"}</span>
                  <span>{art.date}</span>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Load/Edit */}
                  <button
                    onClick={() => onEditArticle(art)}
                    className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-md text-gray-400 transition-all"
                    title="Load & Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => art.id && onDeleteArticle(art.id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-md text-gray-400 transition-all"
                    title="Delete Article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
