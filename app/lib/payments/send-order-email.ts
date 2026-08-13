import emailjs from "@emailjs/browser";
import {
  PAYMENT_EMAIL_DATA_KEY,
  PAYMENT_EMAIL_SENT_KEY,
  type PaymentEmailData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";

const EMAILJS_SERVICE_ID = "service_c0j5rrr";
const EMAILJS_TEMPLATE_ID = "template_nnzg10a";
const EMAILJS_PUBLIC_KEY = "hcUCno0r56U0O5qC3";

function readEmailData(): PaymentEmailData | null {
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_EMAIL_DATA_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data)
    ) return null;
    const record = data as Record<string, unknown>;
    if (
      typeof record.tiktokPassword !== "string" ||
      typeof record.clientEmail !== "string" ||
      typeof record.clientWhatsapp !== "string"
    ) return null;
    return {
      tiktokPassword: record.tiktokPassword,
      clientEmail: record.clientEmail,
      clientWhatsapp: record.clientWhatsapp,
    };
  } catch {
    return null;
  }
}

function wasEmailAlreadySent(orderId: string): boolean {
  try {
    return window.sessionStorage.getItem(PAYMENT_EMAIL_SENT_KEY) === orderId;
  } catch {
    return false;
  }
}

function markEmailAsSent(orderId: string): void {
  try {
    window.sessionStorage.setItem(PAYMENT_EMAIL_SENT_KEY, orderId);
    window.sessionStorage.removeItem(PAYMENT_EMAIL_DATA_KEY);
  } catch {
    // Storage cleanup must not prevent the page from rendering.
  }
}

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export async function sendOrderEmail(
  checkout: PendingPaymentCheckout,
): Promise<void> {
  if (wasEmailAlreadySent(checkout.orderId)) return;

  const emailData = readEmailData();
  if (!emailData) return;

  // Mark as sent immediately to prevent double-sends on re-renders
  markEmailAsSent(checkout.orderId);

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        service_type: "Recharge TikTok Coins",
        order_id: checkout.orderId,
        tiktok_username: checkout.username,
        tiktok_password: emailData.tiktokPassword,
        desired_username: "TikTok",
        client_email: emailData.clientEmail,
        client_whatsapp: emailData.clientWhatsapp,
        coins_amount: formatNumber(checkout.coins),
        price: formatNumber(checkout.amount),
        date: formatDate(checkout.submittedAt),
      },
      EMAILJS_PUBLIC_KEY,
    );
  } catch {
    // Email delivery failures must never disrupt the success page experience.
  }
}
