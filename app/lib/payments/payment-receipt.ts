import { getAssetPath } from "@/app/lib/asset-path";
import type { PaymentLanguage } from "@/app/lib/payments/payment-contract";

export type PaymentReceiptData = {
  language: PaymentLanguage;
  orderId: string;
  transactionReference: string | null;
  username: string;
  coins: number;
  amount: number;
  currency: string;
  orderedAt: string;
  confirmed: boolean;
  brand: PaymentReceiptBrandAssets;
};

export type PaymentReceiptBrandAssets = {
  mark: Uint8Array;
  wordmark: Uint8Array;
};

const COLORS = {
  ink: [20, 17, 35] as const,
  muted: [120, 115, 132] as const,
  line: [227, 224, 234] as const,
  cyan: [10, 200, 232] as const,
  blue: [82, 89, 237] as const,
  violet: [138, 67, 224] as const,
  green: [34, 171, 94] as const,
  greenSoft: [235, 249, 240] as const,
  surface: [247, 246, 250] as const,
  white: [255, 255, 255] as const,
};

const localeFor = (language: PaymentLanguage) => language === "fr" ? "fr-FR" : "en-US";

function formatNumber(value: number, language: PaymentLanguage): string {
  return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ");
}

function formatAmount(value: number, currency: string, language: PaymentLanguage): string {
  const suffix = currency === "XAF" ? "FCFA" : currency;
  return `${formatNumber(value, language)} ${suffix}`;
}

function formatDate(value: string, language: PaymentLanguage): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function safeReceiptFilename(orderId: string): string {
  const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "commande";
  return `recu-upcoin-${safeOrderId}.pdf`;
}

async function fetchBrandAsset(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load brand asset: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchOptimizedPng(path: string, size: number): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load brand asset: ${path}`);
  const sourceBlob = await response.blob();

  if (typeof createImageBitmap !== "function") {
    return new Uint8Array(await sourceBlob.arrayBuffer());
  }

  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return new Uint8Array(await sourceBlob.arrayBuffer());
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  return optimizedBlob
    ? new Uint8Array(await optimizedBlob.arrayBuffer())
    : new Uint8Array(await sourceBlob.arrayBuffer());
}

export async function loadPaymentReceiptBrandAssets(): Promise<PaymentReceiptBrandAssets> {
  const [mark, wordmark] = await Promise.all([
    fetchOptimizedPng(getAssetPath("/logo.png"), 512),
    fetchBrandAsset(getAssetPath("/upcoin-text.png")),
  ]);

  return { mark, wordmark };
}

export async function generatePaymentReceipt(data: PaymentReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const isFrench = data.language === "fr";

  document.setProperties({
    title: `${isFrench ? "Reçu UpCoin" : "UpCoin receipt"} - ${data.orderId}`,
    subject: isFrench ? "Récapitulatif de commande UpCoin" : "UpCoin order summary",
    author: "UpCoin",
    creator: "UpCoin",
  });

  document.setFillColor(...COLORS.surface);
  document.rect(0, 0, 210, 297, "F");
  document.setFillColor(...COLORS.cyan);
  document.rect(0, 0, 70, 4, "F");
  document.setFillColor(...COLORS.blue);
  document.rect(70, 0, 70, 4, "F");
  document.setFillColor(...COLORS.violet);
  document.rect(140, 0, 70, 4, "F");

  document.setFillColor(...COLORS.white);
  document.rect(0, 4, 210, 46, "F");
  document.addImage(data.brand.mark, "PNG", 17, 14, 15, 15, "upcoin-mark", "FAST");
  document.addImage(data.brand.wordmark, "PNG", 35, 17, 42, 11, "upcoin-wordmark", "FAST");
  document.setTextColor(...COLORS.muted);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.text(isFrench ? "Recharge de pièces TikTok" : "TikTok coin recharge", 35, 34);

  document.setTextColor(...COLORS.muted);
  document.setFont("helvetica", "bold");
  document.setFontSize(8);
  document.text(isFrench ? "REÇU DE COMMANDE" : "ORDER RECEIPT", 190, 22, { align: "right" });
  document.setTextColor(...COLORS.ink);
  document.setFontSize(10.5);
  document.text(data.orderId, 190, 29, { align: "right" });

  document.setFillColor(...COLORS.white);
  document.roundedRect(16, 61, 178, 150, 5, 5, "F");
  document.setDrawColor(...COLORS.line);
  document.roundedRect(16, 61, 178, 150, 5, 5, "S");

  document.setFillColor(...COLORS.greenSoft);
  document.roundedRect(22, 69, 166, 28, 4, 4, "F");
  document.setFillColor(...COLORS.green);
  document.circle(35, 83, 7, "F");
  document.setDrawColor(...COLORS.white);
  document.setLineWidth(1.2);
  document.line(31.8, 83, 34, 85.2);
  document.line(34, 85.2, 38.5, 80.6);
  document.setTextColor(...COLORS.green);
  document.setFont("helvetica", "bold");
  document.setFontSize(11.5);
  document.text(
    data.confirmed
      ? (isFrench ? "Paiement accepté" : "Payment accepted")
      : (isFrench ? "Commande enregistrée" : "Order recorded"),
    47,
    80.5,
  );
  document.setTextColor(...COLORS.muted);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.3);
  document.text(
    isFrench ? "Merci pour votre achat sur UpCoin." : "Thank you for your UpCoin purchase.",
    47,
    87,
  );

  const labels = isFrench
    ? {
        order: "NUMÉRO DE COMMANDE",
        reference: "RÉFÉRENCE DE TRANSACTION",
        account: "COMPTE TIKTOK",
        recharge: "RECHARGE",
        amount: "MONTANT DE LA COMMANDE",
        date: "DATE DE COMMANDE",
      }
    : {
        order: "ORDER NUMBER",
        reference: "TRANSACTION REFERENCE",
        account: "TIKTOK ACCOUNT",
        recharge: "RECHARGE",
        amount: "ORDER AMOUNT",
        date: "ORDER DATE",
      };

  const drawDetail = (label: string, value: string, x: number, y: number, maxWidth = 72) => {
    document.setTextColor(...COLORS.muted);
    document.setFont("helvetica", "bold");
    document.setFontSize(7.2);
    document.text(label, x, y);
    document.setTextColor(...COLORS.ink);
    document.setFontSize(10.5);
    const lines = document.splitTextToSize(value, maxWidth) as string[];
    document.text(lines.slice(0, 2), x, y + 7);
  };

  drawDetail(labels.order, data.orderId, 26, 113);
  drawDetail(labels.reference, data.transactionReference ?? data.orderId, 108, 113, 76);
  document.setDrawColor(...COLORS.line);
  document.line(26, 137, 184, 137);
  drawDetail(labels.account, `@${data.username}`, 26, 151);
  drawDetail(
    labels.recharge,
    `${formatNumber(data.coins, data.language)} ${isFrench ? "pièces" : "coins"}`,
    108,
    151,
  );
  document.line(26, 175, 184, 175);
  drawDetail(labels.amount, formatAmount(data.amount, data.currency, data.language), 26, 189);
  drawDetail(labels.date, formatDate(data.orderedAt, data.language), 108, 189, 76);

  document.setFillColor(241, 240, 247);
  document.roundedRect(16, 220, 178, 31, 4, 4, "F");
  document.setTextColor(...COLORS.ink);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text(isFrench ? "À conserver" : "Keep this receipt", 24, 231);
  document.setTextColor(...COLORS.muted);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.2);
  const note = isFrench
    ? "Ce reçu récapitule votre commande UpCoin. Utilisez son numéro pour toute demande d'assistance."
    : "This receipt summarizes your UpCoin order. Use its number for any support request.";
  document.text(document.splitTextToSize(note, 154), 24, 238);

  document.setTextColor(...COLORS.muted);
  document.setFontSize(8);
  document.text("UpCoin", 16, 274);
  document.text("WhatsApp : +237 690 928 237", 105, 274, { align: "center" });
  document.text(
    isFrench ? "Généré électroniquement" : "Electronically generated",
    194,
    274,
    { align: "right" },
  );
  document.setDrawColor(...COLORS.line);
  document.line(16, 266, 194, 266);

  return document.output("blob");
}
