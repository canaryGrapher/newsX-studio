import type { Article } from "@/components/NewspaperCanvas";
import { hasHighlight } from "./content";

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const truthy = (v: unknown) =>
  ["1", "true", "yes", "y", "on"].includes(String(v ?? "").trim().toLowerCase());

// Map a raw CSV row (header-keyed) to the current Article schema.
// Supported columns: headline, subheadline, content, image, imageCaption,
// imageRatio, pullquote, highlight, dropcap, columns, location, author, date,
// articleRatio.
export function rowToArticle(row: Record<string, string>, i: number): Article {
  let content = (row.content || "").trim();

  // Wrap a requested phrase in <highlight> if it isn't already marked.
  const highlight = (row.highlight || "").trim();
  if (highlight && !hasHighlight(content) && content.includes(highlight)) {
    content = content.replace(highlight, `<highlight>${highlight}</highlight>`);
  }

  const article: Article = {
    id: `csv-${Date.now()}-${i}`,
    headline: row.headline || `Breaking News #${i + 1}`,
    subheadline: row.subheadline || "",
    content,
    date: row.date || new Date().toLocaleDateString("en-US", DATE_OPTS),
    author: row.author || "Staff Reporter",
    location: row.location || "NEW DELHI",
    columns: parseInt(row.columns, 10) || 2,
    articleRatio: (row.articleRatio || "portrait").trim().toLowerCase(),
    dropCap: truthy(row.dropcap),
  };

  // Single image column -> {image1} token + images map.
  const imgSrc = (row.image || "").trim();
  if (imgSrc) {
    article.images = {
      image1: {
        src: imgSrc,
        caption: row.imageCaption || "",
        ratio: (row.imageRatio || "4/3").trim(),
      },
    };
    if (!/\{image1\}/.test(content)) {
      const paras = content.split(/\n\n+/);
      paras.splice(Math.min(1, paras.length), 0, "{image1}");
      article.content = paras.join("\n\n");
    }
  }

  // Pull quote column -> {pullq1} token + pullQuotes map.
  const pq = (row.pullquote || row.quote || "").trim();
  if (pq) {
    article.pullQuotes = { pullq1: pq };
    if (!/\{pullq1\}/.test(article.content)) {
      article.content = `${article.content}\n\n{pullq1}`;
    }
  }

  return article;
}
