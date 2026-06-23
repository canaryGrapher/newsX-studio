<div align="center">

# 🗞️ NewsX | Newspaper Studio

**Turn any story into a vintage newspaper graphic, then sequence those pages into a scroll-stopping match-cut video for Reels, Shorts, and TikTok. All in the browser.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_App-000?style=for-the-badge&logo=vercel)](https://newsx-studio.workvar.com)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/canaryGrapher/newsx)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![ffmpeg.wasm](https://img.shields.io/badge/ffmpeg.wasm-007808?logo=ffmpeg&logoColor=white)](https://ffmpegwasm.netlify.app)

</div>

<!-- Replace with a real screenshot or GIF. A 5-second match-cut GIF here converts browsers into stargazers. -->
<p align="center">
  <img src="docs/demo.gif" alt="NewsX match-cut demo" width="720">
</p>

---

## Why NewsX

Newspaper-style edits are everywhere on social media, but making them usually means a video editor, fiddly keyframes, and an afternoon you won't get back. NewsX does it in minutes: write the story, pick a paper theme, drop a `<highlight>` on the words that matter, and export a finished video. No timeline, no plugins, no account. Everything runs client-side, so your content never leaves your machine.

## What it does

**📝 Compose** a newspaper page with a live preview. Headlines, subheads, pull quotes, drop caps, multi-column layouts, captioned photos, and five paper themes (Classic, Modern White, Sepia, Night Ink, Black & White). Export a crisp PNG with one click.

**🎬 Match Cut Studio** sequences multiple pages into a video. Each page's `<highlight>` text is anchored to the exact same spot on screen, so the cut lands on the word and the eye stays locked while the story changes behind it. That anchoring is the whole trick behind the effect, and NewsX automates it.

**🗂️ Library** saves your articles locally and keeps them across reloads and restarts, so a session is never lost.

**📤 Export** to WebM instantly, or to MP4 transcoded in the browser via ffmpeg.wasm. No server, no upload, no watermark.

## The signature feature: highlight match-cut

The match cut is built around one idea: keep the highlighted phrase fixed while everything else changes.

- **Anchor** every frame's `<highlight>` to the same on-screen position and size, so successive pages snap together on the word.
- **Zoom match** scales each page so the highlight is always the same width, for a seamless punch between very different layouts.
- **Grow highlight** reveals the marker like a progress bar across the entire sequence, filling from 0% on the first frame to 100% on the last.
- **Cut SFX + background music**, each with its own volume, fired precisely on every switch.
- **Aspect ratios** for every platform: 9:16 Reels/Shorts, 4:5, 1:1, and 16:9.
- **Hold-per-frame** tunable from a punchy 0.05s up to 2.5s.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Rendering | `html2canvas` for page capture, Canvas 2D for compositing |
| Video | `MediaRecorder` (WebM) with on-demand `ffmpeg.wasm` MP4 transcode |
| Bulk input | `papaparse` for CSV import |
| Icons | `lucide-react` |
| Storage | `localStorage` (your data stays on-device) |

## Quick start

```bash
git clone https://github.com/canaryGrapher/newsx.git
cd newsx
npm install
npm run dev
```

Open http://localhost:3000 and you're composing.

```bash
npm run build   # production build
npm run start   # serve the build
npm run lint    # lint
```

## Configuration

NewsX runs with zero configuration. Analytics are optional: copy `.env.example` to `.env.local` and fill in the keys you want.

```env
NEXT_PUBLIC_GA_ID=        # Google Analytics 4 measurement ID (optional)
NEXT_PUBLIC_CLARITY_ID=   # Microsoft Clarity project ID (optional)
```

Leave them blank and no analytics load.

## How it works

NewsX is almost entirely a client app. A page is rendered as real DOM, captured to a canvas with `html2canvas`, and the position and size of its `<highlight>` element are measured in canvas pixels. For the video, each captured page is drawn onto an output canvas, transformed so its highlight lands on the shared anchor, and the canvas stream is recorded with `MediaRecorder`. MP4 export loads a single-thread `ffmpeg.wasm` core from a CDN only the first time you ask for it, so the rest of the app stays light and no special server headers are needed. It deploys as a static-friendly Next.js app and works on any plain host.

## Bulk mode

Have a spreadsheet of stories? Upload a CSV with a `highlight` column and NewsX turns every eligible row into a page, ready to drop straight into the Match Cut Studio.

## Roadmap

- [ ] More paper themes and editable type scales
- [ ] Per-frame highlight color overrides
- [ ] Audio waveform trimming for the background track
- [ ] Shareable project links
- [ ] Template gallery

Ideas and pull requests welcome.

## Contributing

Contributions of any size are appreciated. Open an issue to discuss a change, or send a pull request directly for small fixes. If NewsX saved you some editing time, a ⭐ helps more people find it.

## License

Released under the [MIT License](LICENSE). Build on it, ship with it, make something great.

---

<div align="center">

**If NewsX is useful to you, star the repo and follow along, more is coming.**

</div>
