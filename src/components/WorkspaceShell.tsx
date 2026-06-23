"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Sliders, Film, FolderHeart, PanelLeftClose, PanelLeft } from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";

const NAV_ITEMS = [
  { href: "/compose", label: "Compose", icon: Sliders },
  { href: "/match-cut", label: "Match Cut", icon: Film },
  { href: "/library", label: "Library", icon: FolderHeart },
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { navCollapsed, setNavCollapsed, savedArticles } = useWorkspace();

  return (
    <main className="dashboard-container" data-nav={navCollapsed ? "collapsed" : "expanded"}>
      {/* Column 1 — Navigation rail (collapsible) */}
      <aside className={`nav-rail ${navCollapsed ? "collapsed" : ""}`}>
        <div className="nav-rail-brand">
          <span className="brand-mark">
            <Layers className="w-5 h-5" />
          </span>
          {!navCollapsed && (
            <span>
              <span className="brand-title">NewsX</span>
              <span className="brand-sub">Studio</span>
            </span>
          )}
        </div>

        <nav className="nav-rail-items">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === "/compose" && pathname === "/");
            const count = href === "/library" ? savedArticles.length : 0;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? "active" : ""}`}
                style={{ alignItems: "center", textDecoration: "none" }}
                title={navCollapsed ? label : undefined}
              >
                <Icon className="w-4 h-4 nav-icon" />
                {!navCollapsed && <span className="nav-item-text">{label}</span>}
                {!navCollapsed && count > 0 && <span className="nav-count">{count}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="nav-collapse-btn"
          onClick={() => setNavCollapsed((c) => !c)}
          title={navCollapsed ? "Expand" : "Collapse"}
          aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {navCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!navCollapsed && <span className="nav-item-text">Collapse</span>}
        </button>
      </aside>

      {children}
    </main>
  );
}
