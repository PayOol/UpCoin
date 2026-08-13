export type SoleasPayLanguage = "fr" | "en";

export type SoleasPayFeeBearer = "CUSTOMER" | "MERCHANT";

export type SoleasPayCheckoutV3Customer = {
  name: string;
  email: string;
};

export type SoleasPayCheckoutV3Payload = {
  apiKey: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  shopName: string;
  successUrl: string;
  failureUrl: string;
  customer: SoleasPayCheckoutV3Customer;
  line?: "up";
  area?: string;
  feeBearer: "CUSTOMER";
};

export const SOLEASPAY_PENDING_CHECKOUT_KEY = "upcoin-soleaspay-checkout-v3";

export type SoleasPayPendingCheckout = {
  version: 1;
  orderId: string;
  username: string;
  coins: number;
  amount: number;
  currency: "XAF";
  submittedAt: string;
};
