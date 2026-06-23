"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { gaPageView } from "@/lib/analytics/core";
import { useConsent } from "./ConsentContext";

// GA's config sends the first page_view on load; this fires a page_view on
// every subsequent client-side route change. Clarity tracks SPA routes itself.
export default function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { consent } = useConsent();
  const first = useRef(true);

  useEffect(() => {
    if (consent !== "granted") return;
    if (first.current) {
      first.current = false;
      return;
    }
    const qs = search?.toString();
    gaPageView(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, search, consent]);

  return null;
}
