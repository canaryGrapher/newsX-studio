// Match-cut frame compositing + WebM recording (canvas + MediaRecorder).

import { createWorkerInterval, workerDelay } from "./workerClock";

export interface HLRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreparedFrame {
  bitmap: HTMLCanvasElement; // rendered newspaper (html2canvas)
  plainBitmap?: HTMLCanvasElement; // same page rendered WITHOUT the highlight mark
  hl: HLRect; // highlight box in bitmap pixels
  label: string;
}

// Global reveal progress (0..1) of the growing highlight, measured across the
// ENTIRE sequence: 0 at the start of the first frame, 1 at the end of the last.
// The current frame's highlight word is revealed left-to-right to this fraction,
// so it reads like a single progress bar advancing over the whole match cut.
export function highlightProgress(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

export interface MatchCutOptions {
  outW: number;
  outH: number;
  holdMs: number;
  fps: number;
  hPos: number; // 0..1 target center X for the highlight
  vPos: number; // 0..1 target center Y for the highlight
  zoomMode: "match" | "fit";
  matchWidthFrac: number; // highlight width as a fraction of frame width (match mode)
  bg: string;
  growHighlight?: boolean; // reveal the highlight marker progressively per frame
}

export interface MatchCutAudio {
  bgBuffer?: AudioBuffer | null;
  sfxBuffer?: AudioBuffer | null;
  bgOn: boolean;
  sfxOn: boolean;
  bgVolume?: number; // 0..1
  sfxVolume?: number; // 0..1
}

// Position one frame so its highlight lands on the target point.
// `hlProgress` (0..1) only matters when `opts.growHighlight` is on and the frame
// carries a `plainBitmap`: the highlight marker is then revealed left-to-right.
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: PreparedFrame,
  opts: MatchCutOptions,
  hlProgress = 1
) {
  const { outW, outH } = opts;
  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, outW, outH);

  const bw = frame.bitmap.width;
  const bh = frame.bitmap.height;
  const cx = frame.hl.x + frame.hl.w / 2;
  const cy = frame.hl.y + frame.hl.h / 2;

  const scale =
    opts.zoomMode === "match" && frame.hl.w > 0
      ? (outW * opts.matchWidthFrac) / frame.hl.w
      : outW / bw;

  const tx = outW * opts.hPos - scale * cx;
  const ty = outH * opts.vPos - scale * cy;

  ctx.imageSmoothingQuality = "high";

  const grow = opts.growHighlight && frame.plainBitmap;
  // Base layer: the un-highlighted page when growing, else the final page.
  const base = grow ? frame.plainBitmap! : frame.bitmap;
  ctx.drawImage(base, 0, 0, bw, bh, tx, ty, bw * scale, bh * scale);

  if (grow && hlProgress > 0) {
    // Overlay the revealed slice of the highlighted page on top of the plain one
    // so the yellow marker appears to be drawn on left-to-right.
    ctx.save();
    const dx = tx + frame.hl.x * scale;
    const dy = ty + frame.hl.y * scale;
    ctx.beginPath();
    ctx.rect(dx, dy, frame.hl.w * scale * hlProgress, frame.hl.h * scale);
    ctx.clip();
    ctx.drawImage(frame.bitmap, 0, 0, bw, bh, tx, ty, bw * scale, bh * scale);
    ctx.restore();
  }
}

function pickMime(preferMp4 = false): string {
  const mp4 = [
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
  ];
  const webm = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  const candidates = preferMp4 ? [...mp4, ...webm] : webm;
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export interface RecordResult {
  blob: Blob;
  mime: string;
}

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const buf = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();
  return decoded;
}

// Record the sequence in real time, return a WebM blob.
export async function recordMatchCut(
  frames: PreparedFrame[],
  opts: MatchCutOptions,
  audio: MatchCutAudio,
  onProgress?: (p: number) => void,
  preferMp4 = false
): Promise<RecordResult> {
  const canvas = document.createElement("canvas");
  canvas.width = opts.outW;
  canvas.height = opts.outH;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(opts.fps);

  const useAudio =
    (audio.bgOn && audio.bgBuffer) || (audio.sfxOn && audio.sfxBuffer);
  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  if (useAudio) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
    dest = audioCtx.createMediaStreamDestination();
    const track = dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
  }

  const mime = pickMime(preferMp4);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((res) => {
    rec.onstop = () => res();
  });

  const holdSec = opts.holdMs / 1000;
  const total = frames.length * holdSec;

  // Draw first frame before recording starts so frame 0 is present.
  drawFrame(ctx, frames[0], opts, opts.growHighlight ? 0 : 1);
  rec.start();
  const startPerf = performance.now();

  if (audioCtx && dest) {
    const t0 = audioCtx.currentTime + 0.08;
    if (audio.bgOn && audio.bgBuffer) {
      const src = audioCtx.createBufferSource();
      src.buffer = audio.bgBuffer;
      src.loop = true;
      const gain = audioCtx.createGain();
      gain.gain.value = audio.bgVolume ?? 1;
      src.connect(gain);
      gain.connect(dest);
      src.start(t0);
      src.stop(t0 + total + 0.25);
    }
    if (audio.sfxOn && audio.sfxBuffer) {
      const sfxGain = audioCtx.createGain();
      sfxGain.gain.value = audio.sfxVolume ?? 1;
      sfxGain.connect(dest);
      for (let i = 0; i < frames.length; i++) {
        const s = audioCtx.createBufferSource();
        s.buffer = audio.sfxBuffer;
        s.connect(sfxGain);
        s.start(t0 + i * holdSec);
      }
    }
  }

  // Drive the draw loop from a worker timer so recording keeps progressing
  // even when the tab is in the background (rAF is paused while hidden).
  await new Promise<void>((resolve) => {
    const stop = createWorkerInterval(Math.max(8, Math.round(1000 / opts.fps)), () => {
      const elapsed = (performance.now() - startPerf) / 1000;
      const idx = Math.min(frames.length - 1, Math.floor(elapsed / holdSec));
      // Reveal is global across the whole sequence, not per frame.
      const prog = opts.growHighlight ? highlightProgress(elapsed, total) : 1;
      drawFrame(ctx, frames[idx], opts, prog);
      onProgress?.(Math.min(1, elapsed / total));
      if (elapsed >= total) {
        stop();
        resolve();
      }
    });
  });

  // Hold the last frame briefly so it isn't truncated.
  await workerDelay(120);
  rec.stop();
  await stopped;
  if (audioCtx) await audioCtx.close();

  return { blob: new Blob(chunks, { type: mime }), mime };
}
