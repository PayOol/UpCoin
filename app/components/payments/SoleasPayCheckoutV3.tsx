"use client";

import { type FormEvent, useRef, useState, useSyncExternalStore } from "react";
import {
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import {
  type SoleasPayLanguage,
} from "@/app/lib/payments/soleaspay-contract";

type SoleasPayCheckoutV3Props = {
  language: SoleasPayLanguage;
  amount: number;
  orderId: string;
  description: string;
  username: string;
  whatsapp: string;
  password?: string;
  email: string;
  coins: number;
};

const CHECKOUT_URL = "https://pay.soleaspay.com";
const SOLEASPAY_API_KEY = "SP6a7cdb9fd6efev3FO30BqaWDh9pU58H_eMkxJBC07WZv7oXsPI8r02-8AP";
const subscribeToOrigin = () => () => {};

export function SoleasPayCheckoutV3({
  language,
  amount,
  orderId,
  description,
  username,
  whatsapp,
  password = "",
  email,
  coins,
}: SoleasPayCheckoutV3Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionStartedRef = useRef(false);
  const allowNativeSubmitRef = useRef(false);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => "",
  );

  const successUrl = origin ? `${origin}/payment/success` : "";
  const failureUrl = origin ? `${origin}/payment/failure` : "";
  const customerName = `${username} | ${password} | ${whatsapp}`;

  function rememberPendingCheckout(): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      orderId,
      username: username.trim().replace(/^@/, ""),
      coins,
      amount,
      currency: "XAF",
      submittedAt: new Date().toISOString(),
    };

    try {
      window.sessionStorage.setItem(
        PAYMENT_PENDING_CHECKOUT_KEY,
        JSON.stringify(pendingCheckout),
      );
      window.sessionStorage.removeItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    } catch {
      // Storage availability must never prevent the native checkout POST.
    }
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>): void {
    if (allowNativeSubmitRef.current) return;

    event.preventDefault();
    if (submissionStartedRef.current) return;

    submissionStartedRef.current = true;
    rememberPendingCheckout();
    setIsSubmitting(true);

    const form = event.currentTarget;
    window.setTimeout(() => {
      if (!form.isConnected) return;
      allowNativeSubmitRef.current = true;
      form.requestSubmit();
    }, 80);
  }

  return (
    <form
      id="soleaspay-checkout-v3"
      className="soleaspay-checkout-form"
      method="POST"
      action={CHECKOUT_URL}
      onSubmit={submitCheckout}
    >
      <input type="hidden" name="apiKey" value={SOLEASPAY_API_KEY} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="currency" value="XAF" />
      <input type="hidden" name="line" value="up" />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="shopName" value="UpCoin" />
      <input type="hidden" name="successUrl" value={successUrl} />
      <input type="hidden" name="failureUrl" value={failureUrl} />
      <input type="hidden" name="customer[name]" value={customerName} />
      <input type="hidden" name="customer[email]" value={email} />
      <input type="hidden" name="feeBearer" value="CUSTOMER" />

      <button
        className="soleaspay-checkout-submit"
        type="submit"
        disabled={!origin || !email || isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting && <span className="soleaspay-checkout-spinner" aria-hidden="true" />}
        <span>
          {isSubmitting
            ? language === "fr" ? "Ouverture de SoleasPay…" : "Opening SoleasPay…"
            : language === "fr" ? "Payer avec SoleasPay" : "Pay with SoleasPay"}
        </span>
      </button>
    </form>
  );
}
