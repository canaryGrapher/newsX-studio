"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics/config";
import { clarityConsent, gaConsent } from "@/lib/analytics/core";

export type Consent = "unset" | "granted" | "denied";

interface ConsentCtx {
  consent: Consent;
  ready: boolean;
  accept: () => void;
  decline: () => void;
}

const Ctx = createContext<ConsentCtx | null>(null);

export function useConsent(): ConsentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>("unset");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "granted" || stored === "denied") setConsent(stored);
    } catch {
      // ignore storage errors
    }
    setReady(true);
  }, []);

  const accept = useCallback(() => {
    setConsent("granted");
    try {
      localStorage.setItem(CONSENT_KEY, "granted");
    } catch {
      // ignore
    }
    gaConsent(true);
    clarityConsent(true);
  }, []);

  const decline = useCallback(() => {
    setConsent("denied");
    try {
      localStorage.setItem(CONSENT_KEY, "denied");
    } catch {
      // ignore
    }
    gaConsent(false);
    clarityConsent(false);
  }, []);

  return <Ctx.Provider value={{ consent, ready, accept, decline }}>{children}</Ctx.Provider>;
}
