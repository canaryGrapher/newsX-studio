import type { Metadata } from "next";
import { Inter, Cinzel, Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/analytics/Analytics";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-next",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-title-next",
  weight: ["400", "700", "900"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-body-next",
  style: ["normal", "italic"],
});

const siteUrl = "https://newsx.vercel.app";
const siteName = "NewsX — Newspaper Studio";
const siteDescription =
  "Turn any story into a realistic vintage or modern newspaper graphic, then sequence those pages into a scroll-stopping match-cut video for Reels, Shorts, and TikTok. Single or bulk, live preview, all in the browser.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s · NewsX",
  },
  description: siteDescription,
  applicationName: "NewsX",
  authors: [{ name: "NewsX" }],
  creator: "NewsX",
  publisher: "NewsX",
  keywords: [
    "newspaper generator",
    "vintage newspaper maker",
    "fake newspaper template",
    "newspaper graphic",
    "match cut video",
    "Reels editor",
    "TikTok newspaper effect",
    "newspaper headline maker",
    "newspaper studio",
    "NewsX",
  ],
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "NewsX",
    title: siteName,
    description: siteDescription,
    locale: "en_US",
    // og:image is generated automatically from app/opengraph-image.png
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    // twitter:image is generated automatically from app/twitter-image.png
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set the theme before first paint to avoid a flash of the wrong mode.
  const themeScript = `(function(){try{var t=localStorage.getItem('newsx_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "NewsX",
    url: siteUrl,
    description: siteDescription,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires a modern web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${montserrat.variable} ${inter.variable} ${cinzel.variable} ${playfair.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
