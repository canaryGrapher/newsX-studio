// High-level, typed event helpers. Each call fans out to both GA and Clarity.
import { gaEvent, clarityEvent, claritySet, clarityUpgrade } from "./core";

type Params = Record<string, unknown>;

// Send one named event to GA, mirror it to Clarity, and surface scalar
// params as Clarity tags so they can be filtered in the dashboard.
export function track(name: string, params: Params = {}) {
  gaEvent(name, params);
  clarityEvent(name);
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      claritySet(k, String(v));
    }
  }
}

const kb = (bytes: number) => Math.round(bytes / 1024);

// Domain events grouped by feature area. Keep payloads rich but scalar.
export const analytics = {
  // ── Compose: article editing ──
  articleRandomized: (theme?: string) => track("article_randomized", { theme }),
  fieldEdited: (field: string) => track("field_edited", { field }),
  highlightWrapped: () => track("highlight_wrapped"),
  pullQuoteEdited: (key: string) => track("pull_quote_edited", { pull_quote: key }),
  imageUrlChanged: (key: string) => track("image_url_changed", { image_slot: key }),
  imageUploaded: (key: string, file: File) =>
    track("image_uploaded", {
      image_slot: key,
      file_type: file.type,
      file_size_kb: kb(file.size),
    }),
  configChanged: (setting: string, value: string | number) =>
    track("config_changed", { setting, value }),
  composeTabChanged: (tab: string) => track("compose_tab_changed", { tab }),

  // ── Export (PNG) ──
  exportStarted: (p: Params = {}) => track("export_started", { export_type: "png", ...p }),
  exportSucceeded: (p: Params = {}) => {
    track("export_succeeded", { export_type: "png", ...p });
    clarityUpgrade("export_succeeded");
  },
  exportFailed: (reason?: string) =>
    track("export_failed", { export_type: "png", reason }),

  // ── Library ──
  articleSaved: (p: Params = {}) => track("article_saved", p),
  articleSelected: (id?: string) => track("article_selected", { article_id: id }),
  articleEdited: (id?: string) => track("article_edited", { article_id: id }),
  articleDeleted: (id?: string) => track("article_deleted", { article_id: id }),

  // ── Appearance ──
  themeChanged: (theme: string) => track("theme_changed", { theme }),

  // ── Match Cut studio ──
  csvUploaded: (fileName: string, rows: number, valid: number) =>
    track("csv_uploaded", { file_name: fileName, row_count: rows, valid_count: valid }),
  csvUploadEmpty: (fileName: string) =>
    track("csv_upload_empty", { file_name: fileName }),
  audioUploaded: (kind: "sfx" | "bg", file: File) =>
    track("audio_uploaded", {
      audio_kind: kind,
      file_type: file.type,
      file_size_kb: kb(file.size),
    }),
  audioUploadFailed: (kind: "sfx" | "bg") =>
    track("audio_upload_failed", { audio_kind: kind }),
  articleToggled: (selected: boolean) =>
    track("matchcut_article_toggled", { selected }),
  prepareStarted: (count: number, theme: string) =>
    track("matchcut_prepare_started", { article_count: count, theme }),
  prepareRejected: (count: number) =>
    track("matchcut_prepare_rejected", { article_count: count }),
  recordStarted: (p: Params = {}) => track("matchcut_record_started", p),
  recordSucceeded: (p: Params = {}) => {
    track("matchcut_record_succeeded", p);
    clarityUpgrade("matchcut_record_succeeded");
  },
  recordFailed: (reason?: string) => track("matchcut_record_failed", { reason }),
  mp4ConversionStarted: () => track("mp4_conversion_started"),
  mp4ConversionFailed: () => track("mp4_conversion_failed"),
  videoFormatChanged: (format: string) =>
    track("matchcut_format_changed", { format }),
};

export type Analytics = typeof analytics;
