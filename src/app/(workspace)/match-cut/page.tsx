"use client";

import React from "react";
import MatchCutStudio from "@/components/MatchCutStudio";
import SidebarHeader from "@/components/SidebarHeader";
import { useWorkspace } from "@/components/WorkspaceProvider";

export default function MatchCutPage() {
  const { savedArticles } = useWorkspace();

  return (
    <>
      <section className="sidebar-panel">
        <SidebarHeader title="Match Cut" />
        <div className="flex-1 overflow-y-auto">
          <MatchCutStudio libraryArticles={savedArticles} />
        </div>
      </section>

      {/* MatchCutStudio fills this stage with its preview via portal. */}
      <section className="preview-panel">
        <div
          id="matchcut-stage"
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        />
      </section>
    </>
  );
}
