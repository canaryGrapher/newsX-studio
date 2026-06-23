// On-demand WebM -> MP4 transcoding using ffmpeg.wasm (single-thread core,
// loaded from CDN only when the user first asks for an MP4). Kept out of the
// main bundle via dynamic import so the rest of the app stays light.

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type ExportFormat = "webm" | "mp4" | "gif";

// Single-thread core matched to @ffmpeg/ffmpeg 0.12.x. No SharedArrayBuffer /
// COOP-COEP headers required, so it works on a plain static host.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

// Lazily create and load a single shared ffmpeg instance.
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;

  ffmpegPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ff;
  })();

  return ffmpegPromise;
}

// True only when the browser's MediaRecorder can emit MP4 directly,
// letting us skip transcoding entirely (e.g. Safari).
export function canRecordMp4Natively(): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  return (
    MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac") ||
    MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2") ||
    MediaRecorder.isTypeSupported("video/mp4")
  );
}

// Transcode a WebM blob into an MP4 blob. onProgress reports 0..1.
export async function webmToMp4(
  input: Blob,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", progressHandler);

  try {
    const bytes = new Uint8Array(await input.arrayBuffer());
    await ff.writeFile("in.webm", bytes);

    await ff.exec([
      "-i", "in.webm",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "192k",
      "out.mp4",
    ]);

    const data = await ff.readFile("out.mp4");
    const buf = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    // Copy into a fresh ArrayBuffer so the Blob is independent of ffmpeg's heap.
    const copy = new Uint8Array(buf.length);
    copy.set(buf);
    return new Blob([copy], { type: "video/mp4" });
  } finally {
    ff.off("progress", progressHandler);
    // Best-effort cleanup of the virtual FS.
    try {
      await ff.deleteFile("in.webm");
      await ff.deleteFile("out.mp4");
    } catch {
      /* ignore */
    }
  }
}

// Transcode a WebM blob into an animated GIF. Uses a two-pass palette so colour
// stays clean. `fps` keeps the file reasonable; width scales preserving ratio.
export async function webmToGif(
  input: Blob,
  onProgress?: (p: number) => void,
  fps = 15
): Promise<Blob> {
  const ff = await getFFmpeg();

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", progressHandler);

  try {
    const bytes = new Uint8Array(await input.arrayBuffer());
    await ff.writeFile("in.webm", bytes);

    // Pass 1: generate an optimal 256-colour palette from the source.
    await ff.exec([
      "-i", "in.webm",
      "-vf", `fps=${fps},palettegen=stats_mode=diff`,
      "palette.png",
    ]);

    // Pass 2: render the GIF using that palette with dithering.
    await ff.exec([
      "-i", "in.webm",
      "-i", "palette.png",
      "-lavfi", `fps=${fps} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`,
      "out.gif",
    ]);

    const data = await ff.readFile("out.gif");
    const buf = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const copy = new Uint8Array(buf.length);
    copy.set(buf);
    return new Blob([copy], { type: "image/gif" });
  } finally {
    ff.off("progress", progressHandler);
    try {
      await ff.deleteFile("in.webm");
      await ff.deleteFile("palette.png");
      await ff.deleteFile("out.gif");
    } catch {
      /* ignore */
    }
  }
}
