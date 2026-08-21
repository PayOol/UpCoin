export type PaymentOutcome = "success" | "failure";
export type PaymentLanguage = "fr" | "en";
export type PaymentProvider = "leekpay" | "soleaspay" | "sebpay";

export const PAYMENT_PENDING_CHECKOUT_KEY = "upcoin-payment-checkout";
export const PAYMENT_RETURN_SNAPSHOT_KEY = "upcoin-payment-return";

export const LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS = [
  "upcoin-soleaspay-checkout-v3",
] as const;

export type PendingPaymentCheckout = {
  version: 1;
  provider: PaymentProvider;
  orderId: string;
  username: string;
  coins: number;
  amount: number;
  currency: "XAF";
  submittedAt: string;
};

export const PAYMENT_EMAIL_DATA_KEY = "upcoin-payment-email-data";
export const PAYMENT_EMAIL_SENT_KEY = "upcoin-payment-email-sent";

export type PaymentEmailData = {
  orderId: string;
  tiktokPassword: string;
  clientEmail: string;
  clientWhatsapp: string;
};
