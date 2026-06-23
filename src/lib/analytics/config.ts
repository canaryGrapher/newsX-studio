// Analytics IDs come from env (client-side, so NEXT_PUBLIC_*).
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "";

// localStorage key for the user's consent choice.
export const CONSENT_KEY = "newsx_analytics_consent";

export const gaEnabled = () => GA_ID.length > 0;
export const clarityEnabled = () => CLARITY_ID.length > 0;
export const analyticsConfigured = () => gaEnabled() || clarityEnabled();
