export type PaymentOutcome = "success" | "failure";
export type PaymentLanguage = "fr" | "en";

export const PAYMENT_PENDING_CHECKOUT_KEY = "upcoin-payment-checkout";
export const PAYMENT_RETURN_SNAPSHOT_KEY = "upcoin-payment-return";

export const LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS = [
  "upcoin-soleaspay-checkout-v3",
] as const;

export type PendingPaymentCheckout = {
  version: 1;
  orderId: string;
  username: string;
  coins: number;
  amount: number;
  currency: "XAF";
  submittedAt: string;
};
