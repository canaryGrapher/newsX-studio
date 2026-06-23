"use client";

import React, { useRef } from "react";
import { Download } from "lucide-react";
import SingleGenerator from "@/components/SingleGenerator";
import SidebarHeader from "@/components/SidebarHeader";
import NewspaperCanvas, { NewspaperCanvasHandle } from "@/components/NewspaperCanvas";
import { useWorkspace } from "@/components/WorkspaceProvider";

export default function ComposePage() {
  const canvasRef = useRef<NewspaperCanvasHandle>(null);
  const { currentArticle, setCurrentArticle, handleExportSuccess } = useWorkspace();

  return (
    <>
      <section className="sidebar-panel">
        <SidebarHeader title="Compose" />

        <div className="flex-1 overflow-y-auto">
          <SingleGenerator currentArticle={currentArticle} onArticleChange={setCurrentArticle} />
        </div>

        <div className="sidebar-footer">
          <button onClick={() => canvasRef.current?.download()} className="btn-primary w-full">
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>
      </section>

      <section className="preview-panel">
        <div className="flex flex-col gap-4 items-center w-full">
          <div className="preview-chip">
            <span className="pulse-indicator" />
            Live Preview
          </div>
          <NewspaperCanvas ref={canvasRef} article={currentArticle} onExportSuccess={handleExportSuccess} />
        </div>
      </section>
    </>
  );
}
