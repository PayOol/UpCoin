import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UpCoin — Acheter des pièces TikTok",
  description: "Achetez directement vos pièces TikTok avec Mobile Money sur UpCoin.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "UpCoin — Acheter des pièces TikTok",
    description: "Choisissez votre pack et payez avec Mobile Money.",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 943,
        alt: "UpCoin — Fais monter ton live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UpCoin — Acheter des pièces TikTok",
    description: "Choisissez votre pack et payez avec Mobile Money.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05030D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
