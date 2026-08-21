"use client";

import { useRef, useState } from "react";
import {
  PAYMENT_EMAIL_DATA_KEY,
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentEmailData,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import { rememberPendingPayment } from "@/app/lib/payments/payment-history";
import { getAssetPath } from "@/app/lib/asset-path";
import type { PaymentLanguage } from "@/app/lib/payments/payment-contract";

type LeekPayCheckoutProps = {
  language: PaymentLanguage;
  amount: number;
  orderId: string;
  description: string;
  username: string;
  whatsapp: string;
  password?: string;
  dialCode?: string;
  email: string;
  coins: number;
  isEmailValid?: boolean;
  onRequireEmail?: () => void;
};

const LEEKPAY_PROXY_URL =
  "https://upcoin-leekpay.sebpay-proxy.workers.dev/api/leekpay";

export class LeekPayClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeekPayClientError";
  }
}

export function LeekPayCheckout({
  language,
  amount,
  orderId,
  description,
  username,
  whatsapp,
  password,
  dialCode,
  email,
  coins,
  isEmailValid,
  onRequireEmail,
}: LeekPayCheckoutProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionStartedRef = useRef(false);

  function rememberPendingCheckout(): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      provider: "leekpay",
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
      window.localStorage.setItem(
        PAYMENT_PENDING_CHECKOUT_KEY,
        JSON.stringify(pendingCheckout),
      );
      window.sessionStorage.removeItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    } catch {
      // Storage availability must never prevent the checkout.
    }

    const emailData: PaymentEmailData = {
      orderId,
      tiktokPassword: password ?? "",
      clientEmail: email,
      clientWhatsapp: `${dialCode} ${whatsapp}`,
    };
    try {
      window.sessionStorage.setItem(
        PAYMENT_EMAIL_DATA_KEY,
        JSON.stringify(emailData),
      );
      window.localStorage.setItem(
        PAYMENT_EMAIL_DATA_KEY,
        JSON.stringify(emailData),
      );
    } catch {
      // Storage availability must never prevent the checkout.
    }

    rememberPendingPayment(pendingCheckout);
  }

  async function handleCheckout(): Promise<void> {
    if (isEmailValid === false) {
      onRequireEmail?.();
      return;
    }

    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    setIsSubmitting(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const successPaymentData = JSON.stringify({
        status: "SUCCESS",
        success: true,
        order_id: orderId,
      });
      const successUrl = `${origin}${getAssetPath("/payment/success")}?provider=leekpay&order=${encodeURIComponent(orderId)}&payment_data=${encodeURIComponent(successPaymentData)}`;
      const failureUrl = `${origin}${getAssetPath("/payment/failed")}?provider=leekpay&order=${encodeURIComponent(orderId)}`;

      // Enregistrer le pending checkout et les données d'email immédiatement
      rememberPendingCheckout();

      const response = await fetch(`${LEEKPAY_PROXY_URL}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "XOF",
          description,
          return_url: successUrl,
          cancel_url: failureUrl,
          customer_email: email,
          customer_name: `${username} | ${whatsapp}`,
          metadata: { orderId, username, coins },
        }),
      });

      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        data?: { payment_url?: string; id?: string };
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.success || !payload.data?.payment_url) {
        throw new LeekPayClientError(
          payload?.message ?? payload?.error ?? `Erreur LeekPay (${response.status})`,
        );
      }

      // Rediriger vers la page de paiement LeekPay
      window.location.href = payload.data.payment_url;
    } catch (err) {
      const message = err instanceof LeekPayClientError
        ? err.message
        : err instanceof TypeError && err.message === "Failed to fetch"
          ? language === "fr"
            ? "Impossible de joindre le serveur LeekPay. Vérifiez votre connexion."
            : "Unable to reach LeekPay server. Check your connection."
          : language === "fr"
            ? "Une erreur est survenue. Réessayez."
            : "An error occurred. Please try again.";

      setError(message);
      setIsSubmitting(false);
      submissionStartedRef.current = false;
    }
  }

  return (
    <div className="leekpay-checkout">
      <button
        className="soleaspay-checkout-submit leekpay-checkout-submit"
        type="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={() => void handleCheckout()}
      >
        {isSubmitting && <span className="soleaspay-checkout-spinner" aria-hidden="true" />}
        <span>
          {isSubmitting
            ? language === "fr" ? "Redirection vers LeekPay…" : "Redirecting to LeekPay…"
            : language === "fr" ? "Payer avec LeekPay" : "Pay with LeekPay"}
        </span>
      </button>
      {error && (
        <p className="leekpay-checkout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
