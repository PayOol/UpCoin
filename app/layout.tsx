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
  title: "UpCoin — Recharge tes TikTok Coins",
  description: "Une expérience simple et moderne pour recharger tes TikTok Coins avec Mobile Money.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "UpCoin — Fais monter ton live",
    description: "Choisis ton pack, paie avec ton mobile et reprends ton élan.",
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
    title: "UpCoin — Fais monter ton live",
    description: "La recharge TikTok qui suit ton rythme.",
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
