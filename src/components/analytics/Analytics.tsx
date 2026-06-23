"use client";

import React, { Suspense } from "react";
import { ConsentProvider } from "./ConsentContext";
import AnalyticsScripts from "./AnalyticsScripts";
import RouteTracker from "./RouteTracker";
import ConsentBanner from "./ConsentBanner";

// Single entry point: consent-gated GA + Clarity, route-change pageviews,
// and the consent banner. Safe to render even when no IDs are set.
export default function Analytics() {
  return (
    <ConsentProvider>
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
      <ConsentBanner />
    </ConsentProvider>
  );
}
