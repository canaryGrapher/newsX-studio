"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Article } from "./NewspaperCanvas";
import { loadSavedArticles, storeSavedArticles } from "@/lib/sessionStore";
import { analytics } from "@/lib/analytics";

const INITIAL_ARTICLE: Article = {
  headline: "E20 Fuel Begins Rollout in India",
  subheadline: "Coverage for the petrol blend targeted within one year",
  content: `India has commenced the distribution of E20, a blend of 20% ethanol and 80% petrol, marking a significant step in the country's ambition to reduce dependence on imported crude oil and cut vehicular emissions.\n\n{image1}\n\nThe nationwide rollout is expected to achieve full coverage within one year. Government officials said the ethanol blending programme would benefit the environment and the economy, reducing carbon dioxide emissions while supporting domestic sugarcane and grain industries.\n\n{pullq1}\n\nThe government stressed that lower-emission fuels, improved air quality targets, and green energy support all formed part of a broader strategy to reduce the country's carbon footprint.\n\nConsumers can expect a modest reduction in fuel efficiency with E20, as ethanol contains less energy per litre than petrol. However, the price differential is expected to result in comparable cost-per-kilometre figures for most users.\n\nIndia is one of several major economies pursuing mandatory blending targets as an intermediate step toward electrification.`,
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
  date: "Sunday, June 22, 2026",
  author: "Our Special Correspondent",
  location: "NEW DELHI",
  columns: 2,
  articleRatio: "portrait",
  theme: "classic",
};

interface WorkspaceCtx {
  currentArticle: Article;
  setCurrentArticle: (a: Article) => void;
  savedArticles: Article[];
  deleteArticle: (id: string) => void;
  editArticle: (a: Article) => void;
  handleExportSuccess: (dataUrl: string) => void;
  navCollapsed: boolean;
  setNavCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentArticle, setCurrentArticle] = useState<Article>(INITIAL_ARTICLE);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    setSavedArticles(loadSavedArticles<Article[]>([]));
  }, []);

  const saveArticlesList = (list: Article[]) => {
    setSavedArticles(list);
    storeSavedArticles(list);
  };

  const deleteArticle = (id: string) => {
    analytics.articleDeleted(id);
    saveArticlesList(savedArticles.filter((a) => a.id !== id));
  };

  const editArticle = (a: Article) => {
    analytics.articleEdited(a.id);
    setCurrentArticle(a);
  };

  const handleExportSuccess = () => {
    const toSave: Article = { ...currentArticle, id: currentArticle.id || `single-${Date.now()}` };
    const idx = savedArticles.findIndex((a) => a.id === toSave.id);
    const updated = idx > -1 ? savedArticles.map((a, i) => (i === idx ? toSave : a)) : [toSave, ...savedArticles];
    analytics.articleSaved({
      article_id: toSave.id,
      theme: toSave.theme,
      is_update: idx > -1,
      library_size: updated.length,
    });
    saveArticlesList(updated);
  };

  return (
    <Ctx.Provider
      value={{
        currentArticle,
        setCurrentArticle,
        savedArticles,
        deleteArticle,
        editArticle,
        handleExportSuccess,
        navCollapsed,
        setNavCollapsed,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
