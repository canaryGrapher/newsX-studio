// Newspaper paper themes — control the rendered newspaper's colors and image
// treatment. Shared by Compose (SingleGenerator) and Match Cut.

export interface NewspaperTheme {
  id: string;
  label: string;
  paper: string; // page background
  ink: string; // text + rules
  highlight: string; // highlight mark background
  highlightInk: string; // text color inside a highlight
  imageFilter: string; // CSS filter applied to photos
  grain: boolean; // show the paper grain texture
  /** Match-cut letterbox background for this theme. */
  matchBg: string;
}

export const NEWSPAPER_THEMES: NewspaperTheme[] = [
  {
    id: "classic",
    label: "Classic",
    paper: "#f0e5cf",
    ink: "#1a1510",
    highlight: "#f6d24b",
    highlightInk: "#1a1510",
    imageFilter: "grayscale(100%) contrast(1.1)",
    grain: true,
    matchBg: "#15110c",
  },
  {
    id: "white",
    label: "Modern White",
    paper: "#ffffff",
    ink: "#141414",
    highlight: "#ffe24d",
    highlightInk: "#141414",
    imageFilter: "none",
    grain: false,
    matchBg: "#0f0f0f",
  },
  {
    id: "sepia",
    label: "Sepia",
    paper: "#e7d6b8",
    ink: "#3b2c1a",
    highlight: "#d6a23c",
    highlightInk: "#241a0e",
    imageFilter: "sepia(55%) contrast(1.05)",
    grain: true,
    matchBg: "#1c140a",
  },
  {
    id: "ink",
    label: "Night Ink",
    paper: "#16140f",
    ink: "#ece3d0",
    highlight: "#caa53a",
    highlightInk: "#16140f",
    imageFilter: "grayscale(100%) contrast(1.1) brightness(0.95)",
    grain: false,
    matchBg: "#000000",
  },
  {
    id: "bw",
    label: "Black & White",
    paper: "#ffffff",
    ink: "#000000",
    highlight: "#d4d4d4",
    highlightInk: "#000000",
    imageFilter: "grayscale(100%) contrast(1.3)",
    grain: false,
    matchBg: "#000000",
  },
];

export const DEFAULT_THEME_ID = "classic";

export function getNewspaperTheme(id?: string): NewspaperTheme {
  return NEWSPAPER_THEMES.find((t) => t.id === id) ?? NEWSPAPER_THEMES[0];
}
