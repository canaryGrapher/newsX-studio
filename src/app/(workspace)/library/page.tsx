"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Newspaper } from "lucide-react";
import SavedGallery from "@/components/SavedGallery";
import SidebarHeader from "@/components/SidebarHeader";
import type { Article } from "@/components/NewspaperCanvas";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { analytics } from "@/lib/analytics";

export default function LibraryPage() {
  const router = useRouter();
  const { savedArticles, setCurrentArticle, deleteArticle } = useWorkspace();

  const handleEdit = (a: Article) => {
    analytics.articleEdited(a.id);
    setCurrentArticle(a);
    router.push("/compose");
  };

  return (
    <>
      <section className="sidebar-panel">
        <SidebarHeader title="Library" />
        <div className="flex-1 overflow-y-auto">
          <SavedGallery
            articles={savedArticles}
            onSelectArticle={setCurrentArticle}
            onDeleteArticle={deleteArticle}
            onEditArticle={handleEdit}
          />
        </div>
      </section>

      <section className="preview-panel preview-empty">
        <div className="preview-empty-inner">
          <span className="preview-empty-icon">
            <Newspaper className="w-7 h-7" />
          </span>
          <p className="preview-empty-title">Library</p>
          <p className="preview-empty-text">Select an article to edit it in Compose.</p>
        </div>
      </section>
    </>
  );
}
