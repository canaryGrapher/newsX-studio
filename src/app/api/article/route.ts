import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Article } from "@/components/NewspaperCanvas";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const FILE_PATH = path.join(DATA_DIR, "articles.json");

// Helper to ensure data directory and file exist
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([]));
  }
}

export async function POST(request: NextRequest) {
  try {
    initDatabase();
    const article: Article = await request.json();

    if (!article.headline || !article.content) {
      return NextResponse.json(
        { error: "Headline and content are required" },
        { status: 400 }
      );
    }

    // Generate unique ID if not provided
    const id = article.id || `art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newArticle = { ...article, id };

    // Read existing articles
    const fileContent = fs.readFileSync(FILE_PATH, "utf-8");
    const articles: Article[] = JSON.parse(fileContent || "[]");

    // Check if it already exists, update it if so, otherwise append
    const existingIndex = articles.findIndex((a) => a.id === id);
    if (existingIndex > -1) {
      articles[existingIndex] = newArticle;
    } else {
      articles.push(newArticle);
    }

    // Write back
    fs.writeFileSync(FILE_PATH, JSON.stringify(articles, null, 2));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article to server database" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    initDatabase();
    const fileContent = fs.readFileSync(FILE_PATH, "utf-8");
    const articles: Article[] = JSON.parse(fileContent || "[]");
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error getting articles:", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
