// Audio trimming helpers for the match-cut studio.
// Slices a decoded AudioBuffer down to a [start, end] window (in seconds).

export function sliceAudioBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.min(buffer.length, Math.floor(startSec * sr)));
  const end = Math.max(start + 1, Math.min(buffer.length, Math.floor(endSec * sr)));
  const len = end - start;

  const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(start, end));
  }
  return out;
}

// Clamp a [start, end] trim window so it stays inside the clip and no longer
// than `maxWindow` seconds (per-frame time for SFX, video length for BG).
export function clampTrim(
  start: number,
  end: number,
  duration: number,
  maxWindow: number
): { start: number; end: number } {
  const s = Math.min(Math.max(0, start), Math.max(0, duration));
  const cap = Math.min(duration, s + Math.max(0.02, maxWindow));
  const e = Math.min(cap, Math.max(s + 0.02, end));
  return { start: s, end: e };
}
