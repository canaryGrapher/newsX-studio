// Low-level wrappers around the GA (gtag) and Microsoft Clarity globals.
// Every call is a safe no-op when the global isn't present or the ID is unset.
import { clarityEnabled, gaEnabled } from "./config";

type Params = Record<string, unknown>;

const hasGtag = () =>
  typeof window !== "undefined" && typeof window.gtag === "function" && gaEnabled();

const hasClarity = () =>
  typeof window !== "undefined" && typeof window.clarity === "function" && clarityEnabled();

// ── Google Analytics ──
export function gaEvent(action: string, params: Params = {}) {
  if (!hasGtag()) return;
  window.gtag("event", action, params);
}

export function gaPageView(path: string, title?: string) {
  if (!hasGtag()) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
  });
}

export function gaConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const v = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    analytics_storage: v,
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
  });
}

// ── Microsoft Clarity ──
export function clarityEvent(name: string) {
  if (!hasClarity()) return;
  window.clarity("event", name);
}

// Custom tags are filterable dimensions in the Clarity dashboard.
export function claritySet(key: string, value: string | string[]) {
  if (!hasClarity()) return;
  window.clarity("set", key, value);
}

export function clarityIdentify(id: string) {
  if (!hasClarity()) return;
  window.clarity("identify", id);
}

export function clarityConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;
  window.clarity("consent", granted);
}

// Upgrade a recorded session to a higher-priority playback bucket.
export function clarityUpgrade(reason: string) {
  if (!hasClarity()) return;
  window.clarity("upgrade", reason);
}
