export type PaymentOutcome = "success" | "failure";
export type PaymentLanguage = "fr" | "en";
export type PaymentProvider = "leekpay" | "soleaspay" | "sebpay";

/**
 * Activation des moyens de paiement.
 * Pour réactiver un fournisseur, repasser sa valeur à `true`.
 * (LeekPay désactivé temporairement — le code et le worker sont conservés.)
 */
export const PAYMENT_PROVIDERS_ENABLED: Record<PaymentProvider, boolean> = {
  leekpay: false,
  soleaspay: true,
  sebpay: true,
};

export const isPaymentProviderEnabled = (provider: PaymentProvider) =>
  PAYMENT_PROVIDERS_ENABLED[provider];

/**
 * Fournisseur sélectionné par défaut et marqué « Recommandé » :
 * le premier activé dans cet ordre de priorité.
 */
export const DEFAULT_PAYMENT_PROVIDER: PaymentProvider =
  (["leekpay", "sebpay", "soleaspay"] as const).find(isPaymentProviderEnabled) ?? "sebpay";

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
