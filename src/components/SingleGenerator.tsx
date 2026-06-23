"use client";

import React, { useState, useRef, useCallback } from "react";
import { Article, ArticleImage } from "./NewspaperCanvas";
import { NEWSPAPER_THEMES, DEFAULT_THEME_ID } from "@/lib/newspaperThemes";
import { Shuffle, Image as ImageIcon, Upload, Highlighter, Quote } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface SingleGeneratorProps {
  onArticleChange: (article: Article) => void;
  currentArticle: Article;
}

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

// ── Preset stories ─────────────────────────────────────────────────────────────

const STORIES: Partial<Article>[] = [
  {
    headline: "E20 Fuel Begins Rollout in India",
    subheadline: "Coverage for the petrol blend targeted within one year",
    content: `India has commenced the distribution of E20, a blend of 20% ethanol and 80% petrol, marking a significant step in the country's ambition to reduce dependence on imported crude oil.\n\n{image1}\n\nThe nationwide rollout is expected to achieve full coverage within one year. Government officials said the ethanol blending programme would benefit the environment and the economy.\n\n{pullq1}\n\nThe government stressed that lower-emission fuels, improved air quality targets, and green energy support all formed part of a broader strategy.\n\nConsumers can expect a modest reduction in fuel efficiency with E20. However, the price differential is expected to result in comparable cost-per-kilometre figures for most users.`,
    images: {
      image1: {
        src: "https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=800&q=80",
        caption: "A motorist refuels using the new E20 petrol blend at a Delhi fuel station.",
        ratio: "4/3",
      },
    },
    pullQuotes: {
      pullq1: "The ethanol blending programme is expected to cut emissions and save foreign exchange.",
    },
    location: "NEW DELHI",
    author: "Our Special Correspondent",
    columns: 2,
    articleRatio: "portrait",
  },
  {
    headline: "Scientists Discover Ancient Ocean Beneath Antarctic Ice",
    subheadline: "Brine lake found three kilometres deep may harbour extremophile life forms",
    content: `A team of glaciologists has confirmed the existence of a liquid water lake beneath the Antarctic ice sheet, fed by geothermal heat and shielded from the surface by more than three kilometres of compacted ice.\n\n{image1}\n\nThe water, sealed from the atmosphere for millions of years, is highly saline and exists at temperatures below the normal freezing point. Such conditions mirror those believed to exist on the moons of Jupiter and Saturn.\n\n{pullq1}\n\nSamples extracted from the borehole are currently being analysed for microbial life. The discovery adds to a growing body of evidence that liquid water is far more widespread in the solar system than once assumed.`,
    images: {
      image1: {
        src: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=800&q=80",
        caption: "Drill cores from the borehole reveal layered ice dating back hundreds of thousands of years.",
        ratio: "4/3",
      },
    },
    pullQuotes: {
      pullq1: "This is the first direct evidence that liquid water can persist at such extreme depths for geological timescales.",
    },
    location: "GENEVA",
    author: "Our Science Correspondent",
    columns: 2,
    articleRatio: "portrait",
  },
  {
    headline: "Central Bank Signals End to Rate-Rise Cycle",
    subheadline: "Governor indicates data supports pivot as inflation nears target",
    content: `The central bank governor indicated that the prolonged cycle of interest rate increases may be drawing to a close, citing evidence that inflationary pressures are abating more quickly than anticipated.\n\n{pullq1}\n\nConsumer price inflation has fallen from its peak of more than ten percent to within a percentage point of the official target.\n\n{image1}\n\nThe path to rate cuts is likely to be gradual, the governor stressed, emphasising that the bank would need to see sustained evidence before loosening financial conditions. Mortgage markets reacted immediately, with lenders revising their fixed-rate offerings downward.`,
    images: {
      image1: {
        src: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
        caption: "The governor addresses assembled economists at the annual central banking symposium.",
        ratio: "3/2",
      },
    },
    pullQuotes: {
      pullq1: "The data gives us confidence, but confidence is not certainty. We will not declare victory prematurely.",
    },
    location: "LONDON",
    author: "Our Economics Editor",
    columns: 2,
    articleRatio: "portrait",
  },
  {
    headline: "Summit Ends With Landmark Climate Finance Deal",
    subheadline: "Developed nations pledge record funds for green transition in emerging economies",
    content: `World leaders concluded three days of intensive negotiations with an agreement that many observers called historic, though sceptics warned that the gap between pledges and action remains as wide as ever.\n\n{image1}\n\nThe deal was brokered in the early hours of the final morning after talks ran well past their scheduled conclusion.\n\n{image2}\n\n{pullq1}\n\nEnvironmental groups gave the agreement a cautious welcome while stressing that the pledged sums fall short of what scientists say is necessary. Financial markets reacted with muted optimism.`,
    images: {
      image1: {
        src: "https://images.unsplash.com/photo-1550353175-a3611868086b?auto=format&fit=crop&w=800&q=80",
        caption: "Delegates sign the final agreement at the concluding ceremony.",
        ratio: "16/9",
      },
      image2: {
        src: "https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?auto=format&fit=crop&w=800&q=80",
        caption: "Protestors outside the venue call for bolder commitments.",
        ratio: "4/3",
      },
    },
    pullQuotes: {
      pullq1: "History will judge this agreement not by its words, but by whether the money actually arrives.",
    },
    location: "PARIS",
    author: "Our Foreign Correspondent",
    columns: 3,
    articleRatio: "portrait",
  },
  {
    headline: "Home Side Clinches Championship in Final Minute",
    subheadline: "Dramatic stoppage-time goal seals title after decade-long wait",
    content: `A goal scored in the second minute of added time delivered the championship title to a side that had not won the league in eleven years, sending the stadium into scenes of extraordinary jubilation.\n\n{image1}\n\nThe scorer, a substitute who had been on the pitch for fewer than ten minutes, described the moment as the most significant of his career.\n\n{pullq1}\n\nRivals who had led the standings for much of the year were unable to overturn the deficit. The club's board announced a public parade through the city centre for the following weekend.`,
    images: {
      image1: {
        src: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
        caption: "The triumphant captain lifts the trophy before an ecstatic home crowd.",
        ratio: "1/1",
      },
    },
    pullQuotes: {
      pullq1: "Eleven years. Eleven long years. I am so proud of every person in that dressing room.",
    },
    location: "MANCHESTER",
    author: "Our Sports Correspondent",
    columns: 2,
    articleRatio: "portrait",
  },
];

// ── Pill button helper ─────────────────────────────────────────────────────────

function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: "12px",
        fontWeight: 600,
        borderRadius: "9999px",
        border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
        background: active ? "var(--accent-glow)" : "var(--bg-card)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SingleGenerator({ onArticleChange, currentArticle }: SingleGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "config">("content");
  const [dragActiveKey, setDragActiveKey] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const update = useCallback((field: keyof Article, value: unknown) =>
    onArticleChange({ ...currentArticle, [field]: value }), [currentArticle, onArticleChange]);

  // Discrete layout/style controls: track the change, then apply it.
  const changeConfig = (field: keyof Article, value: string | number | boolean) => {
    analytics.configChanged(String(field), value as string | number);
    update(field, value);
  };

  // Wrap the current textarea selection in <highlight>…</highlight>.
  const wrapHighlight = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    if (s === e) return; // nothing selected
    const next = `${value.slice(0, s)}<highlight>${value.slice(s, e)}</highlight>${value.slice(e)}`;
    analytics.highlightWrapped();
    update("content", next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s, e + "<highlight></highlight>".length);
    });
  };

  const handleRandomize = () => {
    const story = STORIES[Math.floor(Math.random() * STORIES.length)];
    analytics.articleRandomized(currentArticle.theme);
    onArticleChange({ ...currentArticle, ...story, date: TODAY });
  };

  // Image helpers
  const updateImage = (key: string, field: keyof ArticleImage, value: string) => {
    onArticleChange({
      ...currentArticle,
      images: {
        ...(currentArticle.images ?? {}),
        [key]: { ...(currentArticle.images?.[key] ?? { src: "" }), [field]: value },
      },
    });
  };

  const processImageFile = (key: string, file: File) => {
    analytics.imageUploaded(key, file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") updateImage(key, "src", reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Pull-quote helpers
  const updatePullQuote = (key: string, value: string) => {
    onArticleChange({
      ...currentArticle,
      pullQuotes: { ...(currentArticle.pullQuotes ?? {}), [key]: value },
    });
  };

  // Detect tokens used in body
  const imageKeys = Array.from(new Set(
    (currentArticle.content.match(/\{(image\d+)\}/g) ?? []).map(t => t.slice(1, -1))
  )).sort();

  const pullqKeys = Array.from(new Set(
    (currentArticle.content.match(/\{(pullq\d+)\}/g) ?? []).map(t => t.slice(1, -1))
  )).sort();

  const CODE = (s: string) => (
    <code style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "1px 6px", borderRadius: "5px", fontSize: "10.5px", fontWeight: 600 }}>{s}</code>
  );

  return (
    <div className="form-section">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Article</h3>
        <button type="button" onClick={handleRandomize} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
          <Shuffle className="w-3.5 h-3.5" />
          Randomize
        </button>
      </div>

      {/* ── Inner tabs ── */}
      <div style={{
        display: "flex",
        gap: "3px",
        background: "var(--bg-inset)",
        borderRadius: "11px",
        padding: "4px",
      }}>
        {(["content", "config"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              analytics.composeTabChanged(tab);
              setActiveTab(tab);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: "12.5px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s var(--ease-soft)",
              background: activeTab === tab ? "var(--bg-card)" : "transparent",
              boxShadow: activeTab === tab ? "var(--shadow-sm)" : "none",
              color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
              letterSpacing: 0,
            }}
          >
            {tab === "content" ? "Content" : "Layout & Style"}
          </button>
        ))}
      </div>

      {/* ══════════════ CONTENT TAB ══════════════ */}
      {activeTab === "content" && (
        <>
          {/* Headline */}
          <div className="form-group">
            <label className="form-label">Headline</label>
            <input
              type="text"
              className="form-input font-bold"
              value={currentArticle.headline}
              onChange={e => update("headline", e.target.value)}
              placeholder="E20 Fuel Begins Rollout in India"
            />
          </div>

          {/* Subheadline */}
          <div className="form-group">
            <label className="form-label">Subheadline</label>
            <input
              type="text"
              className="form-input italic"
              value={currentArticle.subheadline}
              onChange={e => update("subheadline", e.target.value)}
              placeholder="Coverage for the petrol blend targeted within one year"
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <div className="flex justify-between items-center" style={{ marginBottom: "4px" }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Article Body</label>
              <button
                type="button"
                onClick={wrapHighlight}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5"
                title="Wrap the selected text in <highlight> tags"
              >
                <Highlighter className="w-3.5 h-3.5" />
                Highlight
              </button>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary, #9ca3af)", marginBottom: "6px", lineHeight: 1.5 }}>
              Use {CODE("{image1}")}, {CODE("{image2}")} and {CODE("{pullq1}")} inline to place images and pull quotes. Wrap text in {CODE("<highlight>…</highlight>")} to mark it (and to set match-cut targets).
            </p>
            <textarea
              ref={bodyRef}
              className="form-input form-textarea"
              style={{ minHeight: "200px" }}
              value={currentArticle.content}
              onChange={e => update("content", e.target.value)}
              placeholder={`Write your article here.\n\nSeparate paragraphs with a blank line.\n\nUse {image1} or {pullq1} for images and pull quotes, and <highlight>key phrase</highlight> to emphasize text.`}
            />
          </div>

          {/* Pull quotes — edited inline with the content that references them */}
          {pullqKeys.length > 0 && (
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5" /> Pull Quotes
              </label>
              {pullqKeys.map(key => (
                <div key={key} style={{ background: "var(--bg-inset)", borderRadius: "var(--r-md)", padding: "14px", border: "1px solid var(--border-color)", marginBottom: "12px" }}>
                  <label className="form-label" style={{ marginBottom: "8px" }}>
                    {CODE(`{${key}}`)} — Pull Quote {key.replace("pullq", "")}
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={currentArticle.pullQuotes?.[key] ?? ""}
                    onChange={e => updatePullQuote(key, e.target.value)}
                    placeholder="The quote that will appear inline..."
                  />
                </div>
              ))}
            </div>
          )}

          {/* Byline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input type="text" className="form-input" value={currentArticle.location || ""} onChange={e => update("location", e.target.value)} placeholder="NEW DELHI" />
            </div>
            <div className="form-group">
              <label className="form-label">Correspondent</label>
              <input type="text" className="form-input" value={currentArticle.author} onChange={e => update("author", e.target.value)} placeholder="Our Special Correspondent" />
            </div>
          </div>
        </>
      )}

      {/* ══════════════ CONFIG TAB ══════════════ */}
      {activeTab === "config" && (
        <>
          {/* Newspaper theme */}
          <div className="form-group">
            <label className="form-label">Newspaper Theme</label>
            <p style={{ fontSize: "11px", color: "var(--text-secondary, #9ca3af)", marginBottom: "8px" }}>
              Paper colour, ink, and photo treatment.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {NEWSPAPER_THEMES.map(t => {
                const active = (currentArticle.theme ?? DEFAULT_THEME_ID) === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changeConfig("theme", t.id)}
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
              })}
            </div>
          </div>

          {/* Columns */}
          <div className="form-group">
            <label className="form-label">Columns</label>
            <p style={{ fontSize: "11px", color: "var(--text-secondary, #9ca3af)", marginBottom: "8px" }}>
              Number of body columns. Content distributes evenly; byline stays in column 1.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4].map(n => (
                <PillButton key={n} label={`${n} col`} active={(currentArticle.columns ?? 2) === n} onClick={() => changeConfig("columns", n)} />
              ))}
            </div>
          </div>

          {/* Article ratio */}
          <div className="form-group">
            <label className="form-label">Canvas Size</label>
            <p style={{ fontSize: "11px", color: "var(--text-secondary, #9ca3af)", marginBottom: "8px" }}>
              Overall dimensions of the generated newspaper.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Portrait", sub: "550 × 778", value: "portrait" },
                { label: "Square", sub: "600 × 600", value: "square" },
                { label: "Wide", sub: "778 × 550", value: "landscape" },
                { label: "Story", sub: "550 × 980", value: "story" },
              ].map(({ label, sub, value }) => {
                const active = (currentArticle.articleRatio ?? "portrait") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeConfig("articleRatio", value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "9px",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
                      background: active ? "var(--accent-glow)" : "var(--bg-card)",
                      color: active ? "var(--accent)" : "var(--text-secondary, #9ca3af)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: "10px", opacity: 0.65, marginTop: "2px" }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop cap */}
          <div className="form-group">
            <label className="form-label">Drop Cap</label>
            <p style={{ fontSize: "11px", color: "var(--text-secondary, #9ca3af)", marginBottom: "8px" }}>
              Enlarge the first character of the body, like a traditional newspaper.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <PillButton label="On" active={!!currentArticle.dropCap} onClick={() => changeConfig("dropCap", true)} />
              <PillButton label="Off" active={!currentArticle.dropCap} onClick={() => changeConfig("dropCap", false)} />
            </div>
          </div>

          {/* Dynamic image sections */}
          {imageKeys.length > 0 && (
            <div className="form-group">
              <label className="form-label">Images</label>
            </div>
          )}
          {imageKeys.map(key => {
            const imgDef = currentArticle.images?.[key] ?? { src: "" };
            const isDragActive = dragActiveKey === key;

            return (
              <div key={key} style={{ background: "var(--bg-inset)", borderRadius: "var(--r-md)", padding: "14px", border: "1px solid var(--border-color)", marginBottom: "12px" }}>
                <label className="form-label" style={{ marginBottom: "10px" }}>
                  {CODE(`{${key}}`)} — Image {key.replace("image", "")}
                </label>

                <div
                  style={{
                    border: `2px dashed ${isDragActive ? "var(--accent)" : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    background: isDragActive ? "var(--accent-glow)" : "transparent",
                    marginBottom: "8px",
                    transition: "all 0.15s",
                  }}
                  onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragActiveKey(key); }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragActiveKey(null); }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation(); setDragActiveKey(null);
                    if (e.dataTransfer.files[0]) processImageFile(key, e.dataTransfer.files[0]);
                  }}
                  onClick={() => document.getElementById(`img-upload-${key}`)?.click()}
                >
                  <input id={`img-upload-${key}`} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) processImageFile(key, e.target.files[0]); }} />
                  {imgDef.src ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={imgDef.src} alt="" style={{ width: "100%", maxHeight: "120px", objectFit: "cover", borderRadius: "4px", filter: "grayscale(80%)" }} />
                      <span style={{ fontSize: "11px", color: "var(--accent)" }} className="flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Change photo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2" style={{ color: "var(--text-secondary)" }}>
                      <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                      <p style={{ fontSize: "12px", fontWeight: 600 }}>Drag & drop or click</p>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  className="form-input text-xs"
                  style={{ marginBottom: "8px" }}
                  value={imgDef.src?.startsWith("data:") ? "" : (imgDef.src ?? "")}
                  onChange={e => updateImage(key, "src", e.target.value)}
                  placeholder="Or paste image URL..."
                />

                <label className="form-label" style={{ marginBottom: "6px" }}>Photo Ratio</label>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {[["1:1", "1/1"], ["4:3", "4/3"], ["3:2", "3/2"], ["16:9", "16/9"], ["3:4", "3/4"], ["2:3", "2/3"]].map(([label, value]) => (
                    <PillButton key={value} label={label} active={(imgDef.ratio || "4/3") === value} onClick={() => updateImage(key, "ratio", value)} />
                  ))}
                </div>

                <input
                  type="text"
                  className="form-input text-xs"
                  value={imgDef.caption ?? ""}
                  onChange={e => updateImage(key, "caption", e.target.value)}
                  placeholder="Photo caption..."
                />
              </div>
            );
          })}

          {/* Hint when no image tokens in content */}
          {imageKeys.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--text-secondary, #9ca3af)" }}>
              <p style={{ fontSize: "12px", lineHeight: 1.5 }}>
                No images yet. Add {CODE("{image1}")} in the <strong style={{ color: "var(--text-primary, #e5e7eb)" }}>Content</strong> tab body to configure photos here. Pull quotes are edited in the Content tab.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
