"use client";

import React from "react";
import { analyticsConfigured } from "@/lib/analytics/config";
import { useConsent } from "./ConsentContext";

// Lightweight bottom banner. Shown only when analytics is configured and the
// user has not yet made a choice.
export default function ConsentBanner() {
  const { consent, ready, accept, decline } = useConsent();
  if (!ready || consent !== "unset" || !analyticsConfigured()) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "16px",
        zIndex: 1000,
        maxWidth: "560px",
        margin: "0 auto",
        padding: "16px 18px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        background: "var(--bg-inset)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p style={{ flex: "1 1 240px", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
        We use Google Analytics and Microsoft Clarity to understand how the studio
        is used. No analytics load until you accept.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={decline} className="btn-secondary py-1.5 px-3 text-xs">
          Decline
        </button>
        <button type="button" onClick={accept} className="btn-primary py-1.5 px-3 text-xs">
          Accept
        </button>
      </div>
    </div>
  );
}
