import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import { Article } from "@/components/NewspaperCanvas";
import ClientArticleWrapper from "@/components/ClientArticleWrapper";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;

  const filePath = path.join(process.cwd(), "src", "data", "articles.json");

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const articles: Article[] = JSON.parse(fileContent || "[]");
    const article = articles.find((a) => a.id === id);

    if (!article) {
      return notFound();
    }

    return <ClientArticleWrapper article={article} />;
  } catch (error) {
    console.error("Error loading article on server:", error);
    return notFound();
  }
}
