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

export const metadata: Metadata = {
  title: "NewsX — Newspaper Studio",
  description: "A quiet studio for composing realistic vintage and modern newspaper layouts. Single or bulk, with a live preview.",
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${montserrat.variable} ${inter.variable} ${cinzel.variable} ${playfair.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
