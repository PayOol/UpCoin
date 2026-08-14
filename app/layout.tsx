import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaInstallPrompt } from "@/app/components/pwa/PwaInstallPrompt";
import { PwaServiceWorker } from "@/app/components/pwa/PwaServiceWorker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const installPromptCaptureScript = `
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__upcoinInstallPrompt = event;
    window.dispatchEvent(new Event("upcoin-install-prompt-ready"));
  });
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://payool.github.io/UpCoin"),
  title: "UpCoin",
  description: "Achetez directement vos pièces TikTok avec Mobile Money sur UpCoin.",
  applicationName: "UpCoin",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "UpCoin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/pwa-192x192.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "UpCoin",
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
    title: "UpCoin",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: installPromptCaptureScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <PwaServiceWorker />
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}
