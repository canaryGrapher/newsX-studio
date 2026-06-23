"use client";

import { useMemo, useRef, useState } from "react";

// Down-sample a decoded buffer into `bars` normalized peak heights (0..1).
function computePeaks(buffer: AudioBuffer, bars: number): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(data.length / bars));
  const step = Math.max(1, Math.floor(block / 48)); // sample a subset per block
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    const s = i * block;
    const e = Math.min(data.length, s + block);
    let max = 0;
    for (let j = s; j < e; j += step) {
      const v = Math.abs(data[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const norm = Math.max(0.01, ...peaks);
  return peaks.map((p) => p / norm);
}

const BARS = 120;

// Waveform-based trim/crop selector. A fixed-width window (= video length, or
// per-frame time for the cut SFX) is dragged across the waveform to choose
// which slice of the imported audio is used.
export default function WaveformTrim({
  buffer,
  duration,
  start,
  windowSec,
  windowLabel,
  disabled,
  onChange,
}: {
  buffer: AudioBuffer;
  duration: number;
  start: number;
  windowSec: number;
  windowLabel: string;
  disabled?: boolean;
  onChange: (start: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const grabOffsetRef = useRef(0); // px between cursor and box's left edge
  const [grabbing, setGrabbing] = useState(false);

  const peaks = useMemo(() => computePeaks(buffer, BARS), [buffer]);

  if (duration <= 0) return null;

  const win = Math.min(windowSec, duration);
  const maxStart = Math.max(0, duration - win);
  const startEff = Math.min(Math.max(0, start), maxStart);
  const endEff = Math.min(duration, startEff + win);
  const leftFrac = startEff / duration;
  const widthFrac = win / duration;
  const movable = maxStart > 0.001 && !disabled;

  const applyFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - grabOffsetRef.current;
    const frac = rect.width > 0 ? px / rect.width : 0;
    const s = Math.max(0, Math.min(maxStart, frac * duration));
    onChange(s);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!movable) return;
    const el = trackRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const cursor = e.clientX - rect.left;
    const boxLeft = leftFrac * rect.width;
    const boxWidth = widthFrac * rect.width;
    // Grab the box where clicked; clicking outside re-centers it on the cursor.
    grabOffsetRef.current =
      cursor >= boxLeft && cursor <= boxLeft + boxWidth ? cursor - boxLeft : boxWidth / 2;
    draggingRef.current = true;
    setGrabbing(true);
    el.setPointerCapture(e.pointerId);
    applyFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    applyFromClientX(e.clientX);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setGrabbing(false);
    trackRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span className="font-semibold uppercase tracking-wide text-gray-400">Trim</span>
        <span className="ml-auto">
          {startEff.toFixed(2)}s → {endEff.toFixed(2)}s · {win.toFixed(2)}s ({windowLabel})
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: "relative",
          height: 64,
          padding: "0 2px",
          borderRadius: 10,
          background: "var(--bg-inset)",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
          touchAction: "none",
          cursor: movable ? (grabbing ? "grabbing" : "grab") : "default",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Waveform bars */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "0 4px",
            pointerEvents: "none",
          }}
        >
          {peaks.map((p, i) => {
            const t = (i + 0.5) / BARS;
            const inside = t >= leftFrac && t <= leftFrac + widthFrac;
            return (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(6, p * 100)}%`,
                  borderRadius: 999,
                  background: inside ? "var(--accent)" : "var(--text-muted)",
                  opacity: inside ? 0.95 : 0.5,
                }}
              />
            );
          })}
        </div>

        {/* Draggable selection window */}
        <div
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: `${leftFrac * 100}%`,
            width: `${widthFrac * 100}%`,
            borderRadius: 8,
            border: "2px solid var(--accent)",
            background: "color-mix(in srgb, var(--accent) 16%, transparent)",
            boxShadow: "0 0 0 100vmax color-mix(in srgb, var(--bg-inset) 40%, transparent)",
            pointerEvents: "none",
          }}
        >
          {/* Edge grips */}
          <span style={gripStyle("left")} />
          <span style={gripStyle("right")} />
        </div>
      </div>
    </div>
  );
}

function gripStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: -1,
    transform: "translateY(-50%)",
    width: 3,
    height: 18,
    borderRadius: 999,
    background: "var(--accent)",
  };
}
