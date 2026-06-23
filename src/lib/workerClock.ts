// Background-resilient timing.
//
// When a tab is hidden, browsers pause requestAnimationFrame entirely and clamp
// main-thread setTimeout/setInterval to ~1s (and worse under "intensive
// throttling"). Timers running inside a Web Worker are not subject to the same
// background throttling, so we drive long-running match-cut loops (frame
// preparation and recording) from a worker tick instead.

const WORKER_SRC = `
  let id = null;
  onmessage = (e) => {
    const d = e.data || {};
    if (d.cmd === 'start') {
      if (id !== null) clearInterval(id);
      id = setInterval(() => postMessage('tick'), d.ms);
    } else if (d.cmd === 'stop') {
      if (id !== null) clearInterval(id);
      id = null;
    }
  };
`;

/**
 * Run `onTick` every `ms` milliseconds using a Web Worker timer that keeps
 * firing while the tab is in the background. Returns a stop function.
 * Falls back to a regular interval if Workers are unavailable.
 */
export function createWorkerInterval(ms: number, onTick: () => void): () => void {
  if (typeof Worker === "undefined") {
    const id = setInterval(onTick, ms);
    return () => clearInterval(id);
  }

  let url: string | null = null;
  let worker: Worker | null = null;
  try {
    const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
    url = URL.createObjectURL(blob);
    worker = new Worker(url);
    worker.onmessage = () => onTick();
    worker.postMessage({ cmd: "start", ms });
  } catch {
    const id = setInterval(onTick, ms);
    return () => clearInterval(id);
  }

  const w = worker;
  const u = url;
  return () => {
    try {
      w.postMessage({ cmd: "stop" });
      w.terminate();
    } catch {
      /* already gone */
    }
    if (u) URL.revokeObjectURL(u);
  };
}

/** Background-resilient one-shot delay (worker-backed). */
export function workerDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const stop = createWorkerInterval(ms, () => {
      stop();
      resolve();
    });
  });
}
