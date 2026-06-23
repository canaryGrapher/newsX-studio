// Persistent browser storage for the saved-articles library.
// Uses localStorage so the library survives reloads, tab closes, and full
// device restarts (unlike sessionStorage, which is cleared when the tab closes).

const ARTICLES_KEY = "newsx_saved_articles";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or storage unavailable — ignore */
  }
}

export function loadSavedArticles<T>(fallback: T): T {
  return read<T>(ARTICLES_KEY, fallback);
}

export function storeSavedArticles(value: unknown): void {
  write(ARTICLES_KEY, value);
}

// Explicit wipe of all NewsX saved data.
export function clearSessionData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ARTICLES_KEY);
  } catch {
    /* ignore */
  }
}
