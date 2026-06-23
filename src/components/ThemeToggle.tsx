"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";
import { analytics } from "@/lib/analytics";

type ThemeChoice = "light" | "dark";

const STORAGE_KEY = "newsx_theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(choice: ThemeChoice) {
  document.documentElement.dataset.theme = choice;
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Migrate older "system" choice (or first visit) to a concrete theme.
    const initial: ThemeChoice =
      stored === "light" || stored === "dark" ? stored : systemPrefersDark() ? "dark" : "light";
    setChoice(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const pick = useCallback((next: ThemeChoice) => {
    setChoice(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    analytics.themeChanged(next);
  }, []);

  // Avoid hydration mismatch: render an inert shell until mounted.
  if (!mounted) {
    return <div className="theme-toggle" aria-hidden style={{ visibility: "hidden" }} />;
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => pick(value)}
          className={`theme-toggle-btn ${choice === value ? "active" : ""}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
