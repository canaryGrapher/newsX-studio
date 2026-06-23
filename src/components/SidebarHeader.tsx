"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";

export default function SidebarHeader({ title }: { title: string }) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <span>
          <span className="brand-title">{title}</span>
          <span className="brand-sub">Newspaper Studio</span>
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
}
