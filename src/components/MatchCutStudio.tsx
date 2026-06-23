"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import { Article, CANVAS_PRESETS } from "./NewspaperCanvas";
import NewspaperView from "./NewspaperView";
import { articleHighlights } from "@/lib/content";
import { rowToArticle } from "@/lib/csvArticle";
import { Row, reviewRow } from "@/lib/csvReview";
import CsvReviewTable from "./CsvReviewTable";
import { NEWSPAPER_THEMES, getNewspaperTheme } from "@/lib/newspaperThemes";
import { workerDelay } from "@/lib/workerClock";
import {
  PreparedFrame,
  MatchCutOptions,
  MatchCutAudio,
  drawFrame,
  recordMatchCut,
  highlightProgress,
} from "@/lib/matchcut";
import { ExportFormat, webmToMp4, webmToGif } from "@/lib/videoExport";
import { sliceAudioBuffer } from "@/lib/audioTrim";
import WaveformTrim from "./AudioTrim";
import { analytics } from "@/lib/analytics";
import {
  Film,
  Upload,
  Play,
  Pause,
  Loader2,
  Music,
  Volume2,
  Download,
  Layers,
  AlertTriangle,
  Wand2,
  FileVideo,
  X,
} from "lucide-react";

interface MatchCutStudioProps {
  libraryArticles: Article[];
}

const OUT_WIDTH = 720;

// Output (video) aspect-ratio presets for popular platforms.
// `original` follows the source article's own ratio.
type OutFmt = { label: string; w?: number; h?: number };
const OUTPUT_FORMATS: Record<string, OutFmt> = {
  original: { label: "Source" },
  reels: { label: "9:16 Reels / Shorts", w: 720, h: 1280 },
  ig_portrait: { label: "4:5 Portrait", w: 1024, h: 1280 },
  ig_square: { label: "1:1 Square", w: 1080, h: 1080 },
  youtube: { label: "16:9 YouTube", w: 1280, h: 720 },
};

// A fixed sample article used only for the newspaper-theme hover preview,
// rendered at a 9:16 ratio so users can see exactly what each theme looks like.
const LOREM_ARTICLE: Article = {
  headline: "Lorem Ipsum Dolor Sit Amet Consectetur",
  subheadline: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  content:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis <highlight>nostrud exercitation</highlight> ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n{pullq1}\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  pullQuotes: { pullq1: "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet." },
  date: "Monday, June 22, 2026",
  author: "Lorem Correspondent",
  location: "IPSUM",
  columns: 2,
  articleRatio: "portrait",
  theme: "classic",
};

async function resolveArticleImages(art: Article): Promise<Record<string, string>> {
  const imgs = art.images ?? {};
  const out: Record<string, string> = {};
  await Promise.all(
    Object.entries(imgs).map(async ([key, img]) => {
      if (!img.src) return;
      if (img.src.startsWith("data:") || img.src.startsWith("blob:")) {
        out[key] = img.src;
        return;
      }
      try {
        const r = await fetch(`/api/proxy-image?url=${encodeURIComponent(img.src)}`);
        const d = r.ok ? await r.json() : null;
        out[key] = d?.dataUrl || img.src;
      } catch {
        out[key] = img.src;
      }
    })
  );
  return out;
}

export default function MatchCutStudio({ libraryArticles }: MatchCutStudioProps) {
  // Source selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Row[]>([]);
  const [csvFields, setCsvFields] = useState<string[]>([]);
  const [csvName, setCsvName] = useState("");

  // Validate rows live; only rows without blocking issues become frames.
  const csvReviews = useMemo(() => csvRows.map(reviewRow), [csvRows]);
  const csvArticles = useMemo(
    () =>
      csvRows
        .filter((_, i) => csvReviews[i]?.usable)
        .map((r, i) => rowToArticle(r, i)),
    [csvRows, csvReviews]
  );
  const csvUsable = csvReviews.filter((r) => r.usable).length;

  // Preparation
  const [frames, setFrames] = useState<PreparedFrame[]>([]);
  const [prepQueue, setPrepQueue] = useState<Article[]>([]);
  const [prepCursor, setPrepCursor] = useState<number | null>(null);
  const [prepArticle, setPrepArticle] = useState<Article | null>(null);
  const [prepResolved, setPrepResolved] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  // Options
  const [holdMs, setHoldMs] = useState(900);
  const [hPos, setHPos] = useState(0.5);
  const [vPos, setVPos] = useState(0.5);
  const [zoomMode, setZoomMode] = useState<"match" | "fit">("match");
  const [matchWidthFrac, setMatchWidthFrac] = useState(0.7);
  const [outputFormat, setOutputFormat] = useState<keyof typeof OUTPUT_FORMATS>("original");
  // Newspaper theme override: "keep" uses each source article's own theme.
  const [mcTheme, setMcTheme] = useState<string>("keep");

  // Growing highlight (typewriter-style reveal of each frame's highlight)
  const [growHighlight, setGrowHighlight] = useState(false);

  // Theme hover preview
  const [hoverTheme, setHoverTheme] = useState<{ id: string; rect: DOMRect } | null>(null);

  // Audio
  const [sfxBuffer, setSfxBuffer] = useState<AudioBuffer | null>(null);
  const [sfxName, setSfxName] = useState("");
  const [sfxOn, setSfxOn] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [sfxStart, setSfxStart] = useState(0);
  const [bgBuffer, setBgBuffer] = useState<AudioBuffer | null>(null);
  const [bgName, setBgName] = useState("");
  const [bgOn, setBgOn] = useState(true);
  const [bgVolume, setBgVolume] = useState(0.6);
  const [bgStart, setBgStart] = useState(0);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recProgress, setRecProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [format, setFormat] = useState<ExportFormat>("webm");
  const [videoExt, setVideoExt] = useState<ExportFormat>("webm");
  const [converting, setConverting] = useState(false);
  const [convProgress, setConvProgress] = useState(0);

  const hiddenRef = useRef<HTMLDivElement>(null);
  const hiddenPlainRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Right-hand preview stage (rendered by the page, filled here via portal).
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setStage(document.getElementById("matchcut-stage"));
  }, []);

  // Preview playback — scrub through prepared frames like a video.
  const [playing, setPlaying] = useState(false);
  const playheadRef = useRef(0); // ms within the sequence
  const seekRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  // Preview audio uses plain HTMLAudio (reliable for speaker output), separate
  // from the Web Audio path used inside the recorder.
  const lastIdxRef = useRef<number>(-1);
  const sfxOnRef = useRef(sfxOn);
  sfxOnRef.current = sfxOn;
  const sfxVolRef = useRef(sfxVolume);
  sfxVolRef.current = sfxVolume;
  // Trim windows (seconds) used by the live preview; kept in refs so the
  // stable playback callbacks always read the latest values.
  const sfxStartRef = useRef(0);
  const sfxEndRef = useRef(0);
  const bgStartRef = useRef(0);
  const bgEndRef = useRef(0);
  const sfxUrlRef = useRef<string>(""); // object URL for the cut SFX
  const bgElRef = useRef<HTMLAudioElement | null>(null); // looping bg track
  const bgUrlRef = useRef<string>(""); // object URL for the bg track
  // A context purely for decoding uploads into buffers the recorder needs.
  const decodeCtxRef = useRef<AudioContext | null>(null);

  const ensureDecodeCtx = useCallback(() => {
    if (!decodeCtxRef.current || decodeCtxRef.current.state === "closed") {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      decodeCtxRef.current = new Ctx();
    }
    return decodeCtxRef.current;
  }, []);

  // Fire the cut SFX once (a fresh element each time so cuts can overlap).
  const playCutSfx = useCallback(() => {
    if (!sfxOnRef.current || !sfxUrlRef.current) return;
    try {
      const a = new Audio(sfxUrlRef.current);
      a.volume = sfxVolRef.current;
      const start = sfxStartRef.current;
      const win = Math.max(0.02, sfxEndRef.current - start);
      const begin = () => {
        try {
          a.currentTime = start;
        } catch {
          /* ignore seek errors */
        }
        void a.play().catch(() => {});
        window.setTimeout(() => {
          try {
            a.pause();
          } catch {
            /* ignore */
          }
        }, win * 1000);
      };
      if (a.readyState >= 1) begin();
      else a.addEventListener("loadedmetadata", begin, { once: true });
    } catch {
      /* ignore */
    }
  }, []);

  const togglePlay = () => setPlaying((p) => !p);

  // Keep the looping background element's volume in sync with the slider.
  useEffect(() => {
    if (bgElRef.current) bgElRef.current.volume = bgVolume;
  }, [bgVolume, bgName]);

  // Clean up on unmount.
  useEffect(
    () => () => {
      bgElRef.current?.pause();
      if (sfxUrlRef.current) URL.revokeObjectURL(sfxUrlRef.current);
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      void decodeCtxRef.current?.close();
    },
    []
  );

  // Newspaper page size for offscreen rendering — always the article's own ratio.
  const firstRatio = (frames[0] && prepQueue[0]?.articleRatio) || "portrait";
  const [pw, phh] = CANVAS_PRESETS[firstRatio] ?? CANVAS_PRESETS.portrait;

  // Output (video) dimensions — either follow the source ratio or a social preset.
  const fmt = OUTPUT_FORMATS[outputFormat];
  const outW = fmt.w ?? OUT_WIDTH;
  const outH = fmt.h ?? Math.round((OUT_WIDTH * phh) / pw);

  // Letterbox colour matches the newspaper paper so exposed edges blend
  // seamlessly when the page is offset near a frame edge.
  const mcBg =
    mcTheme !== "keep"
      ? getNewspaperTheme(mcTheme).paper
      : getNewspaperTheme(prepQueue[0]?.theme).paper;

  const opts: MatchCutOptions = {
    outW,
    outH,
    holdMs,
    fps: 30,
    hPos,
    vPos,
    zoomMode,
    matchWidthFrac,
    bg: mcBg,
    growHighlight,
  };

  // ── Source articles (selected library, in click order, + CSV) ──
  const libById = new Map(libraryArticles.map((a) => [a.id, a]));
  const sourceArticles: Article[] = [
    ...selectedIds.map((id) => libById.get(id)).filter(Boolean as unknown as (a: Article | undefined) => a is Article),
    ...csvArticles,
  ];

  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      analytics.articleToggled(next.includes(id));
      return next;
    });
  };

  // ── CSV upload ──
  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as Row[];
        const fields = (res.meta.fields ?? Object.keys(rows[0] ?? {})).filter(Boolean);
        const usable = rows.filter((r) => reviewRow(r).usable).length;
        analytics.csvUploaded(file.name, rows.length, usable);
        if (usable === 0) analytics.csvUploadEmpty(file.name);
        setCsvFields(fields);
        setCsvRows(rows);
      },
    });
  };

  // ── Audio upload ──
  const handleAudio = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "sfx" | "bg"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      // Decode to an AudioBuffer for the recorder (Web Audio), and keep an
      // object URL for reliable HTMLAudio preview playback.
      const ctx = ensureDecodeCtx();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      if (kind === "sfx") {
        if (sfxUrlRef.current) URL.revokeObjectURL(sfxUrlRef.current);
        sfxUrlRef.current = url;
        setSfxBuffer(buf);
        setSfxName(file.name);
        // Start the trim window at the beginning of the clip.
        setSfxStart(0);
      } else {
        bgElRef.current?.pause();
        if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
        bgUrlRef.current = url;
        const el = new Audio(url);
        // Looping is handled manually so playback stays inside the trim window.
        el.loop = false;
        el.volume = bgVolume;
        bgElRef.current = el;
        setBgBuffer(buf);
        setBgName(file.name);
        setBgStart(0);
      }
      analytics.audioUploaded(kind, file);
    } catch {
      URL.revokeObjectURL(url);
      analytics.audioUploadFailed(kind);
      setStatus("Could not decode that audio file.");
    }
  };

  // ── Remove an attached audio clip ──
  const removeAudio = (kind: "sfx" | "bg") => {
    if (kind === "sfx") {
      if (sfxUrlRef.current) URL.revokeObjectURL(sfxUrlRef.current);
      sfxUrlRef.current = "";
      setSfxBuffer(null);
      setSfxName("");
      setSfxStart(0);
    } else {
      bgElRef.current?.pause();
      bgElRef.current = null;
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      bgUrlRef.current = "";
      setBgBuffer(null);
      setBgName("");
      setBgStart(0);
    }
  };

  // ── Prepare frames ──
  const startPrepare = () => {
    const list = sourceArticles.filter((a) => articleHighlights(a).length > 0);
    if (list.length < 2) {
      analytics.prepareRejected(list.length);
      setStatus("Pick at least 2 articles that contain highlighted text.");
      return;
    }
    analytics.prepareStarted(list.length, mcTheme);
    setVideoUrl("");
    setFrames([]);
    setPlaying(false);
    playheadRef.current = 0;
    // Apply the theme override (or keep each article's own theme).
    const themed = mcTheme === "keep" ? list : list.map((a) => ({ ...a, theme: mcTheme }));
    setPrepQueue(themed);
    setPrepCursor(0);
  };

  useEffect(() => {
    if (prepCursor === null) return;
    if (prepCursor >= prepQueue.length) {
      setStatus(`Ready — ${prepQueue.length} frames prepared.`);
      setPrepCursor(null);
      setPrepArticle(null);
      return;
    }
    const art = prepQueue[prepCursor];
    setStatus(`Preparing frame ${prepCursor + 1} / ${prepQueue.length}…`);

    const run = async () => {
      const resolved = await resolveArticleImages(art);
      setPrepArticle(art);
      setPrepResolved(resolved);
      await workerDelay(500);

      const container = hiddenRef.current;
      if (!container) {
        setPrepCursor((c) => (c !== null ? c + 1 : null));
        return;
      }
      try {
        const bitmap = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
          logging: false,
        });
        const contRect = container.getBoundingClientRect();
        const hlEl = container.querySelector(".nx-highlight") as HTMLElement | null;
        let hl = { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
        if (hlEl) {
          const r = hlEl.getBoundingClientRect();
          const s = bitmap.width / contRect.width; // html2canvas scale factor
          hl = {
            x: (r.left - contRect.left) * s,
            y: (r.top - contRect.top) * s,
            w: r.width * s,
            h: r.height * s,
          };
        }
        // For the growing-highlight effect, also capture a "plain" version of
        // the same page (no yellow marker) to reveal the marker over.
        let plainBitmap: HTMLCanvasElement | undefined;
        if (growHighlight && hiddenPlainRef.current) {
          try {
            plainBitmap = await html2canvas(hiddenPlainRef.current, {
              scale: 2,
              useCORS: true,
              allowTaint: false,
              backgroundColor: null,
              logging: false,
            });
          } catch (e) {
            console.error("Plain frame prep failed:", e);
          }
        }

        const label = articleHighlights(art)[0] || art.headline;
        setFrames((prev) => [...prev, { bitmap, plainBitmap, hl, label }]);
      } catch (err) {
        console.error("Frame prep failed:", err);
      } finally {
        setPrepCursor((c) => (c !== null ? c + 1 : null));
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepCursor]);

  // ── Live preview ──
  const totalMs = Math.max(1, frames.length * holdMs);
  const holdSec = holdMs / 1000;
  const totalSec = totalMs / 1000;

  // Effective trim windows. The selection length is fixed: per-frame time for
  // the cut SFX, full video length for the background track (clamped to the
  // clip). Dragging the waveform box only moves the start.
  const sfxDur = sfxBuffer?.duration ?? 0;
  const sfxWin = sfxDur > 0 ? Math.min(holdSec, sfxDur) : 0;
  const sfxStartEff = Math.min(Math.max(0, sfxStart), Math.max(0, sfxDur - sfxWin));
  const sfxEndEff = Math.min(sfxDur, sfxStartEff + sfxWin);

  const bgDur = bgBuffer?.duration ?? 0;
  const bgWin = bgDur > 0 ? Math.min(totalSec, bgDur) : 0;
  const bgStartEff = Math.min(Math.max(0, bgStart), Math.max(0, bgDur - bgWin));
  const bgEndEff = Math.min(bgDur, bgStartEff + bgWin);

  sfxStartRef.current = sfxStartEff;
  sfxEndRef.current = sfxEndEff;
  bgStartRef.current = bgStartEff;
  bgEndRef.current = bgEndEff;

  // Draw the frame that corresponds to a point in time (ms into the sequence).
  const drawAt = useCallback(
    (ms: number) => {
      const cv = previewRef.current;
      if (!cv || frames.length === 0) return;
      cv.width = outW;
      cv.height = outH;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const idx = Math.min(frames.length - 1, Math.max(0, Math.floor(ms / holdMs)));
      // Global reveal across the whole sequence (0% at first frame → 100% at last).
      const prog = growHighlight ? highlightProgress(ms, totalMs) : 1;
      drawFrame(ctx, frames[idx], opts, prog);
      if (captionRef.current) {
        captionRef.current.textContent = `Frame ${idx + 1} of ${frames.length} · ${(ms / 1000).toFixed(1)}s / ${(totalMs / 1000).toFixed(1)}s`;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [frames, hPos, vPos, zoomMode, matchWidthFrac, outW, outH, holdMs, totalMs, growHighlight]
  );

  // Redraw the current frame when the canvas (re)mounts — after prep finishes
  // (prepCursor → null), the portal stage appears, or an option changes.
  useEffect(() => {
    drawAt(playheadRef.current);
    if (seekRef.current) seekRef.current.value = String(playheadRef.current);
  }, [drawAt, prepCursor, stage]);

  // Playback loop — advances the playhead in real time, loops, and fires the
  // cut SFX whenever the visible frame changes.
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let raf = 0;
    let last = performance.now();
    lastIdxRef.current = Math.min(frames.length - 1, Math.floor(playheadRef.current / holdMs));
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      let ms = playheadRef.current + dt;
      if (ms >= totalMs) ms -= totalMs;
      playheadRef.current = ms;
      drawAt(ms);
      if (seekRef.current) seekRef.current.value = String(ms);

      const idx = Math.min(frames.length - 1, Math.floor(ms / holdMs));
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        playCutSfx();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames.length, totalMs, holdMs, drawAt, playCutSfx]);

  // Background track — loops within its trim window while playing.
  useEffect(() => {
    const el = bgElRef.current;
    if (!playing || !bgOn || !el || frames.length < 2) return;
    try {
      el.currentTime = bgStartRef.current;
    } catch {
      /* ignore seek errors */
    }
    void el.play().catch(() => {});
    const onTime = () => {
      const end = bgEndRef.current;
      if (end > 0 && el.currentTime >= end) {
        try {
          el.currentTime = bgStartRef.current;
        } catch {
          /* ignore */
        }
        void el.play().catch(() => {});
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
    };
  }, [playing, bgOn, bgName, frames.length]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ms = Math.min(totalMs, Math.max(0, parseFloat(e.target.value)));
    playheadRef.current = ms;
    drawAt(ms);
  };

  // ── Record ──
  const handleRecord = async () => {
    if (frames.length < 2) return;
    setRecording(true);
    setRecProgress(0);
    setConvProgress(0);
    setVideoUrl("");
    const startedAt = Date.now();
    analytics.recordStarted({
      frame_count: frames.length,
      requested_format: format,
      sfx_on: sfxOn,
      bg_on: bgOn,
      duration_ms: totalMs,
    });
    try {
      // Apply the trim windows before recording (per-frame cap for SFX,
      // video-length cap for BG — both already baked into sfxTrim/bgTrim).
      const ctx = ensureDecodeCtx();
      const sfxClip = sfxBuffer ? sliceAudioBuffer(ctx, sfxBuffer, sfxStartEff, sfxEndEff) : null;
      const bgClip = bgBuffer ? sliceAudioBuffer(ctx, bgBuffer, bgStartEff, bgEndEff) : null;
      const audio: MatchCutAudio = {
        sfxBuffer: sfxClip,
        bgBuffer: bgClip,
        sfxOn,
        bgOn,
        sfxVolume,
        bgVolume,
      };
      const wantMp4 = format === "mp4";
      const wantGif = format === "gif";
      const { blob, mime } = await recordMatchCut(frames, opts, audio, setRecProgress, wantMp4);

      let finalBlob = blob;
      let ext: ExportFormat = mime.includes("mp4") ? "mp4" : "webm";

      // If the user asked for MP4 but the browser recorded WebM, transcode.
      if (wantMp4 && ext === "webm") {
        setConverting(true);
        analytics.mp4ConversionStarted();
        setStatus("Converting to MP4… (first run downloads the converter)");
        try {
          finalBlob = await webmToMp4(blob, setConvProgress);
          ext = "mp4";
        } catch (convErr) {
          console.error(convErr);
          analytics.mp4ConversionFailed();
          setStatus("MP4 conversion failed — saved as WebM instead.");
        } finally {
          setConverting(false);
        }
      }

      // GIF: convert the recorded WebM to an animated GIF (no audio).
      if (wantGif) {
        setConverting(true);
        setStatus("Converting to GIF… (first run downloads the converter)");
        try {
          finalBlob = await webmToGif(blob, setConvProgress);
          ext = "gif";
        } catch (convErr) {
          console.error(convErr);
          setStatus("GIF conversion failed — saved as WebM instead.");
        } finally {
          setConverting(false);
        }
      }

      const url = URL.createObjectURL(finalBlob);
      setVideoUrl(url);
      setVideoExt(ext);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matchcut-${Date.now()}.${ext}`;
      a.click();
      analytics.recordSucceeded({
        format: ext,
        frame_count: frames.length,
        file_size_kb: Math.round(finalBlob.size / 1024),
        elapsed_ms: Date.now() - startedAt,
      });
      if (!status.includes("failed")) setStatus(`Match-cut video exported as ${ext.toUpperCase()}.`);
    } catch (err) {
      console.error(err);
      analytics.recordFailed(err instanceof Error ? err.message : "unknown");
      setStatus("Recording failed — see console.");
    } finally {
      setRecording(false);
    }
  };

  const preparing = prepCursor !== null;
  const prepTotal = prepQueue.length;
  const prepPercent =
    preparing && prepTotal > 0
      ? Math.min(100, Math.round(((prepCursor ?? 0) / prepTotal) * 100))
      : 0;
  const eligibleLib = libraryArticles.filter((a) => articleHighlights(a).length > 0);

  return (
    <div className="form-section">
      <div className="flex items-center gap-2 mb-1">
        <Film className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Match Cut Studio</h3>
      </div>
      <p style={{ fontSize: "11px", color: "var(--text-secondary, #9ca3af)", lineHeight: 1.5 }}>
        Sequences articles into a video, anchoring each one&apos;s{" "}
        <strong style={{ color: "var(--text-primary, #e5e7eb)" }}>&lt;highlight&gt;</strong> text to the
        same spot for a match-cut effect.
      </p>

      {/* ── Source: Library ── */}
      <div className="form-group">
        <label className="form-label">From Library ({eligibleLib.length} with highlights)</label>
        {eligibleLib.length === 0 ? (
          <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            No saved articles with highlighted text yet. Add <code>&lt;highlight&gt;</code> tags in Compose, save, or upload a CSV below.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
            {eligibleLib.map((a) => {
              const order = selectedIds.indexOf(a.id!) ;
              const active = order > -1;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleSelect(a.id)}
                  className="flex items-center gap-3 text-left rounded-lg p-2.5 transition-all"
                  style={{
                    border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
                    background: active ? "var(--accent-glow)" : "var(--bg-card)",
                  }}
                >
                  <span
                    className="flex items-center justify-center text-[10px] font-bold rounded-md shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      background: active ? "var(--accent)" : "var(--bg-inset)",
                      color: active ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {active ? order + 1 : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-gray-200 truncate">{a.headline}</span>
                    <span className="block text-[10px] text-gray-500 truncate">
                      “{articleHighlights(a)[0]}”
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Source: CSV ── */}
      <div className="form-group">
        <label className="form-label">Or Upload CSV</label>
        <div className="file-upload-dropzone py-4" onClick={() => document.getElementById("mc-csv")?.click()}>
          <input id="mc-csv" type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          <Upload className="w-6 h-6 text-gray-500 opacity-60 mb-1" />
          {csvName ? (
            <div className="text-xs font-bold text-blue-400">
              {csvName} · {csvUsable}/{csvRows.length} usable
            </div>
          ) : (
            <p className="text-[11px] text-gray-500">CSV rows with a <code>highlight</code> column</p>
          )}
        </div>
      </div>

      {/* ── CSV review / fix table ── */}
      {csvRows.length > 0 && (
        <CsvReviewTable rows={csvRows} fields={csvFields} onChange={setCsvRows} />
      )}

      {/* ── Newspaper theme override ── */}
      <div className="form-group">
        <label className="form-label">Newspaper Theme</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[{ id: "keep", label: "Per source", paper: "var(--bg-card)", ink: "var(--text-secondary)" }, ...NEWSPAPER_THEMES].map(
            (t) => {
              const active = mcTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMcTheme(t.id)}
                  onMouseEnter={(e) =>
                    t.id !== "keep" &&
                    setHoverTheme({ id: t.id, rect: e.currentTarget.getBoundingClientRect() })
                  }
                  onMouseLeave={() => setHoverTheme((h) => (h?.id === t.id ? null : h))}
                  title={t.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "6px 11px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
                    background: active ? "var(--accent-glow)" : "var(--bg-card)",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "4px",
                      background: t.paper,
                      border: `1.5px solid ${t.ink}`,
                      flexShrink: 0,
                    }}
                  />
                  {t.label}
                </button>
              );
            }
          )}
        </div>
        <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: 4 }}>
          Applied when you prepare frames. Hover a theme to preview it.
        </p>
      </div>

      {/* ── Growing highlight toggle ── */}
      <div className="form-group">
        <label className="form-label">Highlight Reveal</label>
        <button
          type="button"
          onClick={() => setGrowHighlight((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 11px",
            borderRadius: 9,
            cursor: "pointer",
            textAlign: "left",
            border: `1px solid ${growHighlight ? "var(--accent)" : "var(--border-color)"}`,
            background: growHighlight ? "var(--accent-glow)" : "var(--bg-card)",
          }}
        >
          <span
            style={{
              width: 34,
              height: 19,
              borderRadius: 999,
              flexShrink: 0,
              background: growHighlight ? "var(--accent)" : "var(--bg-inset)",
              border: "1px solid var(--border-color)",
              position: "relative",
              transition: "background 0.2s var(--ease)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 1,
                left: growHighlight ? 16 : 1,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s var(--ease)",
              }}
            />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e5e7eb)" }}>
              Grow highlight {growHighlight ? "on" : "off"}
            </span>
            <span style={{ display: "block", fontSize: 10, color: "var(--text-secondary)" }}>
              Highlight fills like a progress bar across the whole sequence (0% at the first frame → 100% at the last).
            </span>
          </span>
        </button>
      </div>

      {/* ── Prepare ── */}
      <button
        type="button"
        onClick={startPrepare}
        disabled={preparing}
        className="btn-primary w-full"
        style={
          preparing
            ? {
                background: `linear-gradient(to right, var(--accent) 0 ${prepPercent}%, color-mix(in srgb, var(--accent) 50%, #7c8a83) ${prepPercent}% 100%)`,
                opacity: 1,
                cursor: "default",
                transition: "background 0.3s var(--ease)",
              }
            : undefined
        }
      >
        {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {preparing
          ? `Preparing ${(prepCursor ?? 0) + 1} / ${prepTotal} · ${prepPercent}%`
          : `Prepare ${sourceArticles.length || ""} Frames`}
      </button>
      {status && !preparing && (
        <p style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center" }}>{status}</p>
      )}

      {/* ── Preview + controls (after frames ready) ── */}
      {frames.length >= 2 && !preparing && (
        <>
          {/* Output aspect ratio */}
          <div className="form-group">
            <label className="form-label">Aspect Ratio</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(OUTPUT_FORMATS).map(([key, f]) => {
                const active = outputFormat === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOutputFormat(key)}
                    style={{
                      padding: "6px 11px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      borderRadius: 9,
                      cursor: "pointer",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
                      background: active ? "var(--accent-glow)" : "var(--bg-card)",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: 4 }}>
              Output {outW}×{outH}px · the page is scaled and centered onto this frame.
            </p>
          </div>

          {/* Position sliders */}
          <div className="form-group">
            <label className="form-label">Highlight Position</label>
            <div className="flex flex-col gap-2">
              <Slider label="Horizontal" value={hPos} onChange={setHPos} />
              <Slider label="Vertical" value={vPos} onChange={setVPos} />
              <button
                type="button"
                className="btn-secondary text-xs py-1.5"
                onClick={() => {
                  setHPos(0.5);
                  setVPos(0.5);
                }}
              >
                Center
              </button>
            </div>
          </div>

          {/* Zoom mode */}
          <div className="form-group">
            <label className="form-label">Zoom Match</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill label="Match highlight size" active={zoomMode === "match"} onClick={() => setZoomMode("match")} />
              <Pill label="Fit page" active={zoomMode === "fit"} onClick={() => setZoomMode("fit")} />
            </div>
            {zoomMode === "match" && (
              <div className="mt-2 flex flex-col gap-1.5">
                <Slider
                  label={`Highlight zoom ${Math.round(matchWidthFrac * 100)}% ${matchWidthFrac <= 0.35 ? "(panned out)" : matchWidthFrac >= 1 ? "(zoomed in)" : ""}`}
                  value={matchWidthFrac}
                  min={0.1}
                  max={1.5}
                  onChange={setMatchWidthFrac}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <Pill label="Pan out" active={false} onClick={() => setMatchWidthFrac((v) => Math.max(0.1, +(v - 0.15).toFixed(2)))} />
                  <Pill label="Reset" active={false} onClick={() => setMatchWidthFrac(0.7)} />
                  <Pill label="Zoom in" active={false} onClick={() => setMatchWidthFrac((v) => Math.min(1.5, +(v + 0.15).toFixed(2)))} />
                </div>
              </div>
            )}
          </div>

          {/* Timing */}
          <div className="form-group">
            <label className="form-label">Hold per Frame: {(holdMs / 1000).toFixed(2)}s</label>
            <input
              type="range"
              min={50}
              max={2500}
              step={10}
              value={holdMs}
              onChange={(e) => setHoldMs(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Audio */}
          <div className="form-group">
            <label className="form-label">Audio</label>
            <AudioRow
              icon={<Volume2 className="w-3.5 h-3.5" />}
              title="Cut SFX (per switch)"
              name={sfxName}
              on={sfxOn}
              onToggle={() => setSfxOn((v) => !v)}
              inputId="mc-sfx"
              onFile={(e) => handleAudio(e, "sfx")}
              volume={sfxVolume}
              onVolume={setSfxVolume}
              onRemove={() => removeAudio("sfx")}
              trim={{
                buffer: sfxBuffer,
                duration: sfxDur,
                start: sfxStartEff,
                windowSec: sfxWin,
                windowLabel: "per frame",
                onChange: setSfxStart,
              }}
            />
            <AudioRow
              icon={<Music className="w-3.5 h-3.5" />}
              title="Background track (loop)"
              name={bgName}
              on={bgOn}
              onToggle={() => setBgOn((v) => !v)}
              inputId="mc-bg"
              onFile={(e) => handleAudio(e, "bg")}
              volume={bgVolume}
              onVolume={setBgVolume}
              onRemove={() => removeAudio("bg")}
              trim={{
                buffer: bgBuffer,
                duration: bgDur,
                start: bgStartEff,
                windowSec: bgWin,
                windowLabel: "video length",
                onChange: setBgStart,
              }}
            />
          </div>

          {/* Export format */}
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <FileVideo className="w-3.5 h-3.5" /> Export Format
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill label="WebM" active={format === "webm"} onClick={() => { analytics.videoFormatChanged("webm"); setFormat("webm"); }} />
              <Pill label="MP4" active={format === "mp4"} onClick={() => { analytics.videoFormatChanged("mp4"); setFormat("mp4"); }} />
              <Pill label="GIF" active={format === "gif"} onClick={() => { analytics.videoFormatChanged("gif"); setFormat("gif"); }} />
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
              {format === "mp4"
                ? "MP4 is widely compatible (social, editors). If your browser can't record it directly, NewsX converts in-browser the first time."
                : format === "gif"
                ? "GIF is a silent, looping animation (no audio) — great for embeds and chats. Converted in-browser the first time."
                : "WebM records fastest and natively in most browsers."}
            </p>
          </div>

          {/* Record */}
          <button type="button" onClick={handleRecord} disabled={recording} className="btn-primary w-full">
            {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {converting
              ? `Converting to ${format.toUpperCase()}… ${Math.round(convProgress * 100)}%`
              : recording
              ? `Recording… ${Math.round(recProgress * 100)}%`
              : `Generate ${format.toUpperCase()} Match-Cut`}
          </button>
          {recording && (
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(converting ? convProgress : recProgress) * 100}%` }}
              />
            </div>
          )}

          {videoUrl && (
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5 text-green-400">
                <Download className="w-3.5 h-3.5" /> Exported · {videoExt.toUpperCase()}
              </label>
              {videoExt === "gif" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={videoUrl} alt="Match-cut GIF" className="w-full rounded-lg" style={{ background: "#000" }} />
              ) : (
                <video src={videoUrl} controls loop className="w-full rounded-lg" style={{ background: "#000" }} />
              )}
              <a href={videoUrl} download={`matchcut-${Date.now()}.${videoExt}`} className="btn-secondary w-full mt-2 text-xs">
                <Download className="w-3.5 h-3.5" /> Save .{videoExt} again
              </a>
            </div>
          )}
        </>
      )}

      {sourceArticles.length > 0 && sourceArticles.every((a) => articleHighlights(a).length === 0) && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg flex gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>None of the selected articles contain &lt;highlight&gt; text, which the match cut needs.</div>
        </div>
      )}

      {/* Live preview — rendered into the right-hand stage panel via portal */}
      {stage &&
        createPortal(
          frames.length >= 2 && !preparing ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                width: "100%",
              }}
            >
              <div className="preview-chip">
                <span className="pulse-indicator" />
                Match Cut Preview
              </div>
              <canvas
                ref={previewRef}
                style={{
                  maxHeight: "min(70vh, 820px)",
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  aspectRatio: `${outW} / ${outH}`,
                  borderRadius: 8,
                  boxShadow: "var(--shadow-md)",
                  background: "#15110c",
                }}
              />

              {/* Play / pause / seek */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "min(100%, 520px)",
                }}
              >
                <button
                  type="button"
                  onClick={togglePlay}
                  className="btn-secondary"
                  style={{ padding: "8px 12px", flexShrink: 0 }}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <input
                  ref={seekRef}
                  type="range"
                  min={0}
                  max={totalMs}
                  step={10}
                  defaultValue={0}
                  onChange={handleSeek}
                  style={{ flex: 1 }}
                  aria-label="Seek"
                />
              </div>

              <p ref={captionRef} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Frame 1 of {frames.length} · 0.0s / {(totalMs / 1000).toFixed(1)}s
              </p>
            </div>
          ) : (
            <div className="preview-empty-inner">
              <span className="preview-empty-icon">
                <Layers className="w-7 h-7" />
              </span>
              <p className="preview-empty-title">Match Cut</p>
              <p className="preview-empty-text">
                {preparing
                  ? "Preparing frames… the preview appears here when ready."
                  : "Prepare frames to see the match-cut preview here."}
              </p>
            </div>
          ),
          stage
        )}

      {/* Theme hover preview — a 9:16 sample article in the hovered theme */}
      {hoverTheme &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const pw2 = 230;
            const ph2 = Math.round((pw2 * 16) / 9);
            const left = Math.min(
              Math.max(8, hoverTheme.rect.left + hoverTheme.rect.width / 2 - pw2 / 2),
              window.innerWidth - pw2 - 8
            );
            const top = Math.max(8, hoverTheme.rect.top - ph2 - 12);
            return (
              <div
                style={{
                  position: "fixed",
                  left,
                  top,
                  width: pw2,
                  zIndex: 9999,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.55))",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                    textAlign: "center",
                  }}
                >
                  {getNewspaperTheme(hoverTheme.id).label} preview
                </div>
                <div
                  style={{
                    width: pw2,
                    height: ph2,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <NewspaperView
                    key={hoverTheme.id}
                    article={{ ...LOREM_ARTICLE, theme: hoverTheme.id }}
                    resolvedImages={{}}
                    isExporting={false}
                  />
                </div>
              </div>
            );
          })(),
          document.body
        )}

      {/* Hidden render target(s) for frame preparation */}
      {prepArticle && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div style={{ width: `${pw}px`, height: `${phh}px` }}>
            <NewspaperView ref={hiddenRef} article={prepArticle} resolvedImages={prepResolved} isExporting={true} noGrain />
          </div>
          {growHighlight && (
            <div style={{ width: `${pw}px`, height: `${phh}px` }}>
              <NewspaperView ref={hiddenPlainRef} article={prepArticle} resolvedImages={prepResolved} isExporting={true} noGrain noHighlight />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Small UI helpers ────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "7px 10px",
        fontSize: "11.5px",
        fontWeight: 600,
        borderRadius: 9,
        cursor: "pointer",
        border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
        background: active ? "var(--accent-glow)" : "var(--bg-card)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

function AudioRow({
  icon,
  title,
  name,
  on,
  onToggle,
  inputId,
  onFile,
  volume,
  onVolume,
  onRemove,
  trim,
}: {
  icon: React.ReactNode;
  title: string;
  name: string;
  on: boolean;
  onToggle: () => void;
  inputId: string;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  volume: number;
  onVolume: (v: number) => void;
  onRemove: () => void;
  trim?: {
    buffer: AudioBuffer | null;
    duration: number;
    start: number;
    windowSec: number;
    windowLabel: string;
    onChange: (start: number) => void;
  };
}) {
  const hasFile = !!name;
  return (
    <div
      className="flex flex-col gap-2 p-2 rounded-lg mb-2"
      style={{ background: "var(--bg-inset)", border: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-md flex items-center justify-center"
          style={{
            width: 26,
            height: 26,
            background: on ? "var(--accent)" : "var(--bg-card)",
            color: on ? "#fff" : "var(--text-secondary)",
            border: "1px solid var(--border-color)",
          }}
          title={on ? "Enabled" : "Disabled"}
        >
          {icon}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-gray-300">{title}</div>
          <div className="text-[10px] text-gray-500 truncate">{name || "No file"}</div>
        </div>
        <label
          className="btn-secondary text-[11px] py-1 px-2 cursor-pointer shrink-0"
          htmlFor={inputId}
        >
          <Upload className="w-3 h-3" /> File
        </label>
        {hasFile && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-md flex items-center justify-center text-gray-400 hover:text-red-400"
            style={{ width: 26, height: 26, border: "1px solid var(--border-color)", background: "var(--bg-card)" }}
            title="Remove audio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <input id={inputId} type="file" accept="audio/*" className="hidden" onChange={onFile} />
      </div>

      {hasFile && (
        <label className="flex items-center gap-2 pl-1">
          <Volume2 className="w-3 h-3 text-gray-500 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(parseFloat(e.target.value))}
            disabled={!on}
            style={{ flex: 1, opacity: on ? 1 : 0.4 }}
            aria-label={`${title} volume`}
          />
          <span className="text-[10px] text-gray-500 shrink-0" style={{ width: 30, textAlign: "right" }}>
            {Math.round(volume * 100)}%
          </span>
        </label>
      )}

      {hasFile && trim && trim.buffer && trim.duration > 0 && (
        <WaveformTrim
          buffer={trim.buffer}
          duration={trim.duration}
          start={trim.start}
          windowSec={trim.windowSec}
          windowLabel={trim.windowLabel}
          disabled={!on}
          onChange={trim.onChange}
        />
      )}
    </div>
  );
}
