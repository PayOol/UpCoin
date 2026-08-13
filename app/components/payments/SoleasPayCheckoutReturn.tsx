"use client";

import { AlertTriangle, CheckCircle2, ReceiptText, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SOLEASPAY_PENDING_CHECKOUT_KEY,
  type SoleasPayPendingCheckout,
} from "@/app/lib/payments/soleaspay-contract";

type SoleasPayCheckoutReturnProps = {
  outcome: "success" | "failure";
};

type ReturnState = {
  phase: "loading" | "received" | "missing" | "invalid";
  reference: string | null;
  pendingCheckout: SoleasPayPendingCheckout | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPendingCheckout(): SoleasPayPendingCheckout | null {
  try {
    const rawPendingCheckout = window.sessionStorage.getItem(SOLEASPAY_PENDING_CHECKOUT_KEY);
    window.sessionStorage.removeItem(SOLEASPAY_PENDING_CHECKOUT_KEY);
    if (!rawPendingCheckout) return null;

    const value: unknown = JSON.parse(rawPendingCheckout);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.orderId !== "string" ||
      typeof value.username !== "string" ||
      typeof value.coins !== "number" ||
      typeof value.amount !== "number" ||
      value.currency !== "XAF" ||
      typeof value.submittedAt !== "string"
    ) {
      return null;
    }

    return value as SoleasPayPendingCheckout;
  } catch {
    return null;
  }
}

function readTransactionReference(payload: Record<string, unknown>): string | null {
  const nestedData = isRecord(payload.data) ? payload.data : null;
  const sources = nestedData ? [payload, nestedData] : [payload];

  for (const source of sources) {
    for (const field of ["transaction_reference", "transactionReference", "reference"]) {
      const value = source[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}

export function SoleasPayCheckoutReturn({ outcome }: SoleasPayCheckoutReturnProps) {
  const [returnState, setReturnState] = useState<ReturnState>({
    phase: "loading",
    reference: null,
    pendingCheckout: null,
  });

  useEffect(() => {
    let active = true;
    const pendingCheckout = readPendingCheckout();
    const rawSoleasPayData = new URLSearchParams(window.location.search).get("soleaspay_data");
    window.history.replaceState(null, "", window.location.pathname);
    let nextState: ReturnState;

    if (!rawSoleasPayData) {
      nextState = { phase: "missing", reference: null, pendingCheckout };
    } else if (rawSoleasPayData.length > 100_000) {
      nextState = { phase: "invalid", reference: null, pendingCheckout };
    } else {
      try {
        const payload: unknown = JSON.parse(rawSoleasPayData);
        nextState = isRecord(payload)
          ? {
              phase: "received",
              reference: readTransactionReference(payload),
              pendingCheckout,
            }
          : { phase: "invalid", reference: null, pendingCheckout };
      } catch {
        nextState = { phase: "invalid", reference: null, pendingCheckout };
      }
    }

    window.queueMicrotask(() => {
      if (active) setReturnState(nextState);
    });

    return () => {
      active = false;
    };
  }, []);

  const isSuccessReturn = outcome === "success";
  const isReadableReturn = returnState.phase === "received";
  const title = isSuccessReturn ? "Retour de paiement reçu" : "Paiement non finalisé";
  const message = isSuccessReturn
    ? isReadableReturn
      ? "SoleasPay a renvoyé les données de la transaction. Son statut doit être confirmé avant la livraison des pièces."
      : "Le retour SoleasPay ne contient pas de données de transaction exploitables. Aucune livraison n’a été lancée."
    : "Le paiement a échoué ou a été annulé. Aucune livraison n’a été lancée.";

  return (
    <main className="soleaspay-return-page">
      <section className="soleaspay-return-card" aria-live="polite">
        <span className="soleaspay-return-kicker">SoleasPay Checkout v3</span>
        <span
          className={`soleaspay-return-icon ${isSuccessReturn ? "success" : "failure"}`}
          aria-hidden="true"
        >
          {isSuccessReturn ? <CheckCircle2 /> : <XCircle />}
        </span>
        <h1>{returnState.phase === "loading" ? "Lecture du retour…" : title}</h1>
        <p>{returnState.phase === "loading" ? "Veuillez patienter." : message}</p>

        {returnState.pendingCheckout && (
          <div className="soleaspay-return-detail">
            <ReceiptText size={18} aria-hidden="true" />
            <span>Commande</span>
            <strong>{returnState.pendingCheckout.orderId}</strong>
          </div>
        )}

        {returnState.reference && (
          <div className="soleaspay-return-detail">
            <ReceiptText size={18} aria-hidden="true" />
            <span>Référence SoleasPay</span>
            <strong>{returnState.reference}</strong>
          </div>
        )}

        {isSuccessReturn && isReadableReturn && (
          <div className="soleaspay-return-warning">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>Retour reçu — vérification de la transaction requise.</span>
          </div>
        )}

        <Link className="soleaspay-return-link" href="/">
          Retour à UpCoin
        </Link>
      </section>
    </main>
  );
}
