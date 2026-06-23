import { useEffect, useState } from "react";
import type { ArticleImage } from "@/components/NewspaperCanvas";

// Resolve remote image URLs through the proxy so html2canvas can paint them
// without tainting the canvas (CORS). data:/blob: URLs pass through untouched.
export function useResolvedImages(images?: Record<string, ArticleImage>) {
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    const imgs = images ?? {};
    const entries = Object.entries(imgs).filter(([, v]) => !!v.src);
    if (entries.length === 0) {
      setResolved({});
      return;
    }

    let cancelled = false;
    const out: Record<string, string> = {};
    Promise.all(
      entries.map(async ([key, img]) => {
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
    ).then(() => {
      if (!cancelled) setResolved({ ...out });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(images)]);

  return resolved;
}
