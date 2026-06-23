import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NewsX — Newspaper Studio",
    short_name: "NewsX",
    description:
      "Turn any story into a realistic vintage or modern newspaper graphic, then a scroll-stopping match-cut video. All in the browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3f1",
    theme_color: "#1f5640",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
