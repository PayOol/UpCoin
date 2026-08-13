"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Download,
  FileCheck2,
  Headphones,
  Home,
  LoaderCircle,
  Moon,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS,
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentLanguage,
  type PaymentOutcome,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import {
  isConfirmedPayment,
  isRejectedPayment,
  parsePaymentReturn,
  parsePendingPaymentCheckout,
  type NormalizedPaymentReturn,
} from "@/app/lib/payments/payment-return";
import {
  finalizePaymentHistory,
  findPaymentHistoryEntry,
  paymentHistoryEntryToCheckout,
  paymentHistoryHref,
  rememberPendingPayment,
  type PaymentHistoryEntry,
} from "@/app/lib/payments/payment-history";
import {
  generatePaymentReceipt,
  loadPaymentReceiptBrandAssets,
  safeReceiptFilename,
} from "@/app/lib/payments/payment-receipt";
import { sendOrderEmail } from "@/app/lib/payments/send-order-email";
import {
  fetchSebPayPayment,
  type SebPayPayment,
} from "@/app/lib/payments/sebpay-contract";

type Theme = "light" | "dark";
type ReturnPhase = "loading" | "received" | "missing" | "invalid";

type PaymentCheckoutReturnProps = {
  outcome: PaymentOutcome;
};

type ReturnState = {
  phase: ReturnPhase;
  paymentReturn: NormalizedPaymentReturn | null;
  pendingCheckout: PendingPaymentCheckout | null;
  resolvedOutcome: PaymentOutcome | null;
  confirmed: boolean;
};

type StoredReturnSnapshot = {
  version: 1;
  outcome: PaymentOutcome;
  paymentReturn: NormalizedPaymentReturn | null;
  pendingCheckout: PendingPaymentCheckout;
};

const copy = {
  fr: {
    brandLabel: "UpCoin — Packs de pièces TikTok",
    back: "Retour à la boutique",
    loadingTitle: "Finalisation de votre commande…",
    loadingMessage: "Nous préparons le récapitulatif de votre paiement.",
    successKicker: "Commande enregistrée",
    successTitle: "Paiement réussi !",
    successMessage: "Merci pour votre achat !",
    deliveryMessage: "Si vous avez saisi les identifiants réels de votre compte TikTok, vous recevrez vos pièces dans un délai de 10 minutes. Si vous ne recevez pas vos pièces dans ce délai, veuillez contacter notre service client sur",
    whatsapp: "WhatsApp",
    missingKicker: "Commande indisponible",
    missingTitle: "Commande introuvable",
    missingMessage: "Nous ne retrouvons pas les informations de cette commande dans cette session.",
    pendingKicker: "Paiement en attente",
    pendingTitle: "Transaction en cours",
    pendingMessage: "Cette tentative de paiement n’a pas encore reçu de statut final.",
    failureKicker: "Paiement interrompu",
    failureTitle: "Paiement non abouti",
    failureMessage: "Le paiement a été annulé ou n’a pas pu être finalisé. Vous pouvez réessayer sans créer de doublon.",
    detailsTitle: "Détails de la commande",
    detailsSubtitle: "Les informations utiles de votre achat",
    orderNumber: "N° de commande",
    reference: "Référence de transaction",
    account: "Compte TikTok",
    recharge: "Recharge",
    amount: "Montant de la commande",
    orderedAt: "Date de commande",
    notAvailable: "Non disponible",
    coins: "pièces",
    download: "Télécharger le reçu PDF",
    generating: "Création du reçu…",
    downloadError: "Le reçu n’a pas pu être généré. Veuillez réessayer.",
    home: "Retour à l’accueil",
    retry: "Réessayer le paiement",
    support: "Contacter l’assistance",
    secure: "Paiement sécurisé",
    dataProtected: "Données protégées",
    fastSupport: "Assistance réactive",
    contactWhatsapp: "Contacter UpCoin sur WhatsApp",
    keepReceipt: "Gardez votre reçu",
    keepReceiptMessage: "Il contient les références utiles pour toute demande d’assistance.",
    enableDark: "Activer le mode sombre",
    enableLight: "Activer le mode clair",
  },
  en: {
    brandLabel: "UpCoin — TikTok coin packs",
    back: "Back to the store",
    loadingTitle: "Finalizing your order…",
    loadingMessage: "We are preparing your payment summary.",
    successKicker: "Order recorded",
    successTitle: "Payment successful!",
    successMessage: "Thank you for your purchase!",
    deliveryMessage: "If you entered your real TikTok account credentials, you will receive your coins within 10 minutes. If you do not receive them within that time, please contact our customer service on",
    whatsapp: "WhatsApp",
    missingKicker: "Order unavailable",
    missingTitle: "Order not found",
    missingMessage: "We cannot find this order's information in this session.",
    pendingKicker: "Payment pending",
    pendingTitle: "Transaction in progress",
    pendingMessage: "This payment attempt has not received a final status yet.",
    failureKicker: "Payment interrupted",
    failureTitle: "Payment not completed",
    failureMessage: "The payment was cancelled or could not be completed. You can try again without creating a duplicate.",
    detailsTitle: "Order details",
    detailsSubtitle: "Useful information about your purchase",
    orderNumber: "Order number",
    reference: "Transaction reference",
    account: "TikTok account",
    recharge: "Recharge",
    amount: "Order amount",
    orderedAt: "Order date",
    notAvailable: "Not available",
    coins: "coins",
    download: "Download PDF receipt",
    generating: "Creating receipt…",
    downloadError: "The receipt could not be generated. Please try again.",
    home: "Back to home",
    retry: "Try payment again",
    support: "Contact support",
    secure: "Secure payment",
    dataProtected: "Protected data",
    fastSupport: "Responsive support",
    contactWhatsapp: "Contact UpCoin on WhatsApp",
    keepReceipt: "Keep your receipt",
    keepReceiptMessage: "It contains the references needed for any support request.",
    enableDark: "Enable dark mode",
    enableLight: "Enable light mode",
  },
} as const;

const localeFor = (language: PaymentLanguage) => language === "fr" ? "fr-FR" : "en-US";
const PREFERENCE_CHANGE_EVENT = "upcoin-preference-change";
const subscribeToPreferences = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);
  };
};

function getLanguagePreference(): PaymentLanguage {
  try {
    const savedLanguage = window.localStorage.getItem("upcoin-language");
    if (savedLanguage === "fr" || savedLanguage === "en") return savedLanguage;
  } catch {
    // Browser preferences are optional on a payment return page.
  }

  return window.navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function getThemePreference(): Theme {
  try {
    const savedTheme = window.localStorage.getItem("upcoin-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // Browser preferences are optional on a payment return page.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPendingCheckout(): PendingPaymentCheckout | null {
  const keys = [PAYMENT_PENDING_CHECKOUT_KEY, ...LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS];

  for (const key of keys) {
    try {
      const pendingCheckout = parsePendingPaymentCheckout(window.sessionStorage.getItem(key));
      if (pendingCheckout) return pendingCheckout;
    } catch {
      return null;
    }
  }

  return null;
}

function removePendingCheckouts(): void {
  try {
    window.sessionStorage.removeItem(PAYMENT_PENDING_CHECKOUT_KEY);
    for (const key of LEGACY_PAYMENT_PENDING_CHECKOUT_KEYS) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage cleanup must not prevent the page from rendering.
  }
}

function readStoredSnapshot(outcome: PaymentOutcome): StoredReturnSnapshot | null {
  try {
    const rawSnapshot = window.sessionStorage.getItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    if (!rawSnapshot) return null;
    const value: unknown = JSON.parse(rawSnapshot);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const snapshot = value as Partial<StoredReturnSnapshot>;
    const pendingCheckout = parsePendingPaymentCheckout(
      snapshot.pendingCheckout ? JSON.stringify(snapshot.pendingCheckout) : null,
    );

    if (snapshot.version !== 1 || snapshot.outcome !== outcome || !pendingCheckout) return null;
    const paymentReturn = snapshot.paymentReturn;
    const validPaymentReturn = paymentReturn === null || (
      typeof paymentReturn === "object" &&
      paymentReturn !== null &&
      (typeof paymentReturn.reference === "string" || paymentReturn.reference === null) &&
      (typeof paymentReturn.status === "string" || paymentReturn.status === null) &&
      (typeof paymentReturn.successful === "boolean" || paymentReturn.successful === null) &&
      (typeof paymentReturn.orderId === "string" || paymentReturn.orderId === null)
    );
    if (!validPaymentReturn) return null;

    return {
      version: 1,
      outcome,
      paymentReturn: paymentReturn ?? null,
      pendingCheckout,
    };
  } catch {
    return null;
  }
}

function storeSnapshot(snapshot: StoredReturnSnapshot): void {
  try {
    window.sessionStorage.setItem(PAYMENT_RETURN_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // The in-memory state remains fully functional without storage.
  }
}

function paymentReturnFromHistory(entry: PaymentHistoryEntry): NormalizedPaymentReturn {
  return {
    reference: entry.transactionReference,
    status: entry.providerStatus,
    successful: entry.status === "failure" ? false : entry.confirmed ? true : null,
    orderId: entry.orderId,
  };
}

function returnStateFromHistory(entry: PaymentHistoryEntry): ReturnState {
  return {
    phase: "received",
    paymentReturn: paymentReturnFromHistory(entry),
    pendingCheckout: paymentHistoryEntryToCheckout(entry),
    resolvedOutcome: entry.status === "pending" ? null : entry.status,
    confirmed: entry.confirmed,
  };
}

function canonicalizeHistoryEntry(entry: PaymentHistoryEntry): void {
  const href = paymentHistoryHref(entry);
  if (!href || `${window.location.pathname}${window.location.search}` === href) return;
  window.history.replaceState(null, "", href);
}

function canonicalizePendingEntry(entry: PaymentHistoryEntry): void {
  const href = `${window.location.pathname}?provider=${encodeURIComponent(entry.provider)}&order=${encodeURIComponent(entry.orderId)}`;
  if (`${window.location.pathname}${window.location.search}` === href) return;
  window.history.replaceState(null, "", href);
}

function restoreSnapshotEntry(snapshot: StoredReturnSnapshot): PaymentHistoryEntry {
  const snapshotIsConfirmed = isConfirmedPayment(snapshot.paymentReturn);
  if (snapshot.outcome === "success" && !snapshotIsConfirmed) {
    return rememberPendingPayment(snapshot.pendingCheckout, {
      transactionReference: snapshot.paymentReturn?.reference,
      providerStatus: snapshot.paymentReturn?.status,
    });
  }

  return finalizePaymentHistory(
    snapshot.pendingCheckout,
    snapshot.outcome,
    {
      transactionReference: snapshot.paymentReturn?.reference,
      providerStatus: snapshot.paymentReturn?.status,
      confirmed: snapshotIsConfirmed,
    },
  );
}

function canonicalizeRestoredEntry(entry: PaymentHistoryEntry): void {
  if (entry.status === "pending") canonicalizePendingEntry(entry);
  else canonicalizeHistoryEntry(entry);
}

function formatNumber(value: number, language: PaymentLanguage): string {
  return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);
}

function formatAmount(value: number, currency: string, language: PaymentLanguage): string {
  return `${formatNumber(value, language)} ${currency === "XAF" ? "FCFA" : currency}`;
}

function formatDate(value: string, language: PaymentLanguage): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function PaymentCheckoutReturn({ outcome }: PaymentCheckoutReturnProps) {
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguagePreference,
    (): PaymentLanguage => "fr",
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemePreference,
    (): Theme => "light",
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState(false);
  const [returnState, setReturnState] = useState<ReturnState>({
    phase: "loading",
    paymentReturn: null,
    pendingCheckout: null,
    resolvedOutcome: null,
    confirmed: false,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("provider") !== "sebpay") return;

    const requestedOrderId = searchParams.get("order")?.trim() ?? "";
    const sessionCheckout = readPendingCheckout();
    const historyEntry = requestedOrderId
      ? findPaymentHistoryEntry(requestedOrderId)
      : null;
    const checkout = sessionCheckout?.provider === "sebpay" &&
      sessionCheckout.orderId === requestedOrderId
      ? sessionCheckout
      : historyEntry?.provider === "sebpay"
        ? paymentHistoryEntryToCheckout(historyEntry)
        : null;

    if (!requestedOrderId || !checkout) {
      window.queueMicrotask(() => setReturnState({
        phase: "missing",
        paymentReturn: null,
        pendingCheckout: null,
        resolvedOutcome: null,
        confirmed: false,
      }));
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let pollCount = 0;
    const maximumPolls = 30;

    const commitPending = (payment?: SebPayPayment) => {
      const authoritativeCheckout: PendingPaymentCheckout = payment
        ? {
            ...checkout,
            coins: payment.coins,
            amount: payment.amount,
            currency: payment.currency,
          }
        : checkout;
      const pendingEntry = rememberPendingPayment(authoritativeCheckout, {
        transactionReference: payment?.transactionId,
        providerStatus: payment?.providerStatus ?? payment?.status ?? "pending",
      });
      canonicalizePendingEntry(pendingEntry);
      setReturnState({
        phase: "received",
        paymentReturn: {
          reference: payment?.transactionId ?? null,
          status: payment?.providerStatus ?? payment?.status ?? "pending",
          successful: null,
          orderId: checkout.orderId,
        },
        pendingCheckout: authoritativeCheckout,
        resolvedOutcome: null,
        confirmed: false,
      });
    };

    const reconcile = async (): Promise<void> => {
      try {
        const payment = await fetchSebPayPayment(requestedOrderId);
        if (cancelled) return;

        if (payment.status === "pending") {
          commitPending(payment);
          pollCount += 1;
          if (pollCount < maximumPolls) {
            pollTimer = window.setTimeout(() => void reconcile(), 4_000);
          }
          return;
        }

        const resolvedOutcome: PaymentOutcome = payment.status === "approved"
          ? "success"
          : "failure";
        const authoritativeCheckout: PendingPaymentCheckout = {
          ...checkout,
          coins: payment.coins,
          amount: payment.amount,
          currency: payment.currency,
        };
        const finalizedEntry = finalizePaymentHistory(authoritativeCheckout, resolvedOutcome, {
          transactionReference: payment.transactionId,
          providerStatus: payment.providerStatus ?? payment.status,
          confirmed: payment.status === "approved",
          authoritative: true,
        });
        const paymentReturn = paymentReturnFromHistory(finalizedEntry);
        storeSnapshot({
          version: 1,
          outcome: resolvedOutcome,
          paymentReturn,
          pendingCheckout: authoritativeCheckout,
        });
        removePendingCheckouts();
        canonicalizeHistoryEntry(finalizedEntry);
        setReturnState(returnStateFromHistory(finalizedEntry));
      } catch {
        if (cancelled) return;
        commitPending();
        pollCount += 1;
        if (pollCount < maximumPolls) {
          pollTimer = window.setTimeout(() => void reconcile(), 6_000);
        }
      }
    };

    window.queueMicrotask(() => {
      if (cancelled) return;
      commitPending();
      void reconcile();
    });

    return () => {
      cancelled = true;
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
  }, [outcome]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("provider") === "sebpay") return;
    const rawPaymentData = searchParams.get("payment_data") ?? searchParams.get("soleaspay_data");
    const requestedOrderId = searchParams.get("order")?.trim() ?? "";
    const parsedReturn = parsePaymentReturn(rawPaymentData);
    const sessionPendingCheckout = readPendingCheckout();
    const callbackOrderId = parsedReturn.data?.orderId;
    const callbackPendingEntry = !sessionPendingCheckout &&
      typeof callbackOrderId === "string"
      ? findPaymentHistoryEntry(callbackOrderId)
      : null;
    const pendingCheckout = sessionPendingCheckout ?? (
      callbackPendingEntry?.status === "pending"
        ? paymentHistoryEntryToCheckout(callbackPendingEntry)
        : null
    );
    const storedSnapshot = readStoredSnapshot(outcome);
    const requestedEntry = requestedOrderId
      ? findPaymentHistoryEntry(requestedOrderId)
      : null;
    const isLiveReturn = pendingCheckout !== null &&
      (rawPaymentData !== null || !requestedOrderId) &&
      (!requestedOrderId || requestedOrderId === pendingCheckout.orderId);

    const commitState = (nextState: ReturnState) => {
      window.queueMicrotask(() => setReturnState(nextState));
    };

    if (requestedEntry && !isLiveReturn) {
      canonicalizeHistoryEntry(requestedEntry);
      commitState(returnStateFromHistory(requestedEntry));
      return;
    }

    if (requestedOrderId && !isLiveReturn) {
      if (storedSnapshot?.pendingCheckout.orderId === requestedOrderId) {
        const restoredEntry = restoreSnapshotEntry(storedSnapshot);
        canonicalizeRestoredEntry(restoredEntry);
        commitState(returnStateFromHistory(restoredEntry));
        return;
      }

      if (rawPaymentData) {
        searchParams.delete("payment_data");
        searchParams.delete("soleaspay_data");
        const remainingSearch = searchParams.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}`,
        );
      }
      commitState({
        phase: "missing",
        paymentReturn: null,
        pendingCheckout: null,
        resolvedOutcome: null,
        confirmed: false,
      });
      return;
    }

    if (pendingCheckout && isLiveReturn) {
      const callbackOrderMismatch = typeof callbackOrderId === "string" &&
        callbackOrderId !== pendingCheckout.orderId;
      const callbackIsInvalid = parsedReturn.phase === "invalid";

      if (callbackOrderMismatch) {
        const pendingEntry = rememberPendingPayment(pendingCheckout, {
          providerStatus: "ORDER_MISMATCH",
        });
        removePendingCheckouts();
        canonicalizePendingEntry(pendingEntry);
        commitState(returnStateFromHistory(pendingEntry));
        return;
      }

      const callbackConfirmsPayment = parsedReturn.phase === "received" &&
        isConfirmedPayment(parsedReturn.data);
      const callbackRejectsPayment = isRejectedPayment(parsedReturn.data);

      if (outcome === "success" && !callbackIsInvalid && !callbackRejectsPayment && !callbackConfirmsPayment) {
        const pendingEntry = rememberPendingPayment(pendingCheckout, {
          transactionReference: parsedReturn.data?.reference,
          providerStatus: parsedReturn.data?.status,
        });
        removePendingCheckouts();
        canonicalizePendingEntry(pendingEntry);
        commitState(returnStateFromHistory(pendingEntry));
        return;
      }

      const resolvedOutcome: PaymentOutcome = callbackIsInvalid ||
        outcome === "failure" ||
        callbackRejectsPayment
        ? "failure"
        : "success";
      const confirmed = resolvedOutcome === "success" &&
        !callbackIsInvalid &&
        callbackConfirmsPayment;
      const finalizedEntry = finalizePaymentHistory(pendingCheckout, resolvedOutcome, {
        transactionReference: callbackIsInvalid ? null : parsedReturn.data?.reference,
        providerStatus: callbackIsInvalid ? null : parsedReturn.data?.status,
        confirmed,
      });
      const finalizedOutcome = finalizedEntry.status === "pending"
        ? resolvedOutcome
        : finalizedEntry.status;
      const finalizedPaymentReturn = paymentReturnFromHistory(finalizedEntry);

      storeSnapshot({
        version: 1,
        outcome: finalizedOutcome,
        paymentReturn: finalizedPaymentReturn,
        pendingCheckout,
      });
      removePendingCheckouts();
      canonicalizeHistoryEntry(finalizedEntry);
      commitState(returnStateFromHistory(finalizedEntry));
      return;
    }

    if (
      storedSnapshot &&
      (!pendingCheckout || storedSnapshot.pendingCheckout.orderId === pendingCheckout.orderId)
    ) {
      const restoredEntry = restoreSnapshotEntry(storedSnapshot);
      canonicalizeRestoredEntry(restoredEntry);
      commitState(returnStateFromHistory(restoredEntry));
      return;
    }

    if (rawPaymentData) {
      searchParams.delete("payment_data");
      searchParams.delete("soleaspay_data");
      const remainingSearch = searchParams.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}`,
      );
    }

    commitState({
      phase: parsedReturn.phase,
      paymentReturn: parsedReturn.data,
      pendingCheckout: null,
      resolvedOutcome: null,
      confirmed: false,
    });
  }, [outcome]);

  useEffect(() => {
    if (
      returnState.phase === "received" &&
      returnState.resolvedOutcome === "success" &&
      returnState.confirmed &&
      returnState.pendingCheckout
    ) {
      sendOrderEmail(returnState.pendingCheckout);
    }
  }, [returnState]);

  const t = copy[language];
  const isLoading = returnState.phase === "loading";
  const hasOrder = returnState.pendingCheckout !== null;
  const isSuccess = returnState.resolvedOutcome === "success";
  const isPendingOrder = hasOrder && returnState.resolvedOutcome === null;
  const statusTone = isLoading || isPendingOrder ? "pending" : isSuccess ? "success" : "failure";
  const shouldReturnHome = isSuccess || isPendingOrder || !hasOrder;
  const canDownloadReceipt = isSuccess && hasOrder && returnState.phase !== "invalid";
  const displayTitle = isLoading
    ? t.loadingTitle
    : !hasOrder
      ? t.missingTitle
      : isPendingOrder
        ? t.pendingTitle
        : isSuccess ? t.successTitle : t.failureTitle;
  const displayMessage = isLoading
    ? t.loadingMessage
    : !hasOrder
      ? t.missingMessage
      : isPendingOrder
        ? t.pendingMessage
        : isSuccess ? t.successMessage : t.failureMessage;

  function updateTheme(nextTheme: Theme): void {
    try {
      window.localStorage.setItem("upcoin-theme", nextTheme);
      window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
    } catch {
      // The current system preference remains in use when storage is unavailable.
    }
  }

  async function downloadReceipt(): Promise<void> {
    if (!returnState.pendingCheckout || !canDownloadReceipt || isGeneratingReceipt) return;

    setReceiptError(false);
    setIsGeneratingReceipt(true);
    try {
      const checkout = returnState.pendingCheckout;
      const brand = await loadPaymentReceiptBrandAssets();
      const blob = await generatePaymentReceipt({
        language,
        orderId: checkout.orderId,
        transactionReference: returnState.paymentReturn?.reference ?? null,
        username: checkout.username,
        coins: checkout.coins,
        amount: checkout.amount,
        currency: checkout.currency,
        orderedAt: checkout.submittedAt,
        confirmed: returnState.confirmed,
        brand,
      });
      downloadBlob(blob, safeReceiptFilename(checkout.orderId));
    } catch {
      setReceiptError(true);
    } finally {
      setIsGeneratingReceipt(false);
    }
  }

  const checkout = returnState.pendingCheckout;
  const transactionReference = returnState.paymentReturn?.reference;

  return (
    <main className="payment-return-page" data-theme={theme}>
      <header className="payment-return-header">
        <Link className="payment-return-brand" href="/" aria-label={t.brandLabel}>
          <Image src="/logo.png" alt="UpCoin" width={34} height={34} priority />
          <span className="brand-title" aria-hidden="true">
            <span className="brand-p">p</span>
            <span className="brand-coin">Coin</span>
          </span>
        </Link>

        <div className="payment-return-header-actions">
          <Link className="payment-return-back" href="/#packs">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{t.back}</span>
          </Link>
          <button
            type="button"
            className="payment-return-theme-toggle"
            onClick={() => updateTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? t.enableDark : t.enableLight}
            title={theme === "light" ? t.enableDark : t.enableLight}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </header>

      <section className="payment-return-hero" aria-live="polite">
        <div className="payment-return-orb payment-return-orb-one" aria-hidden="true" />
        <div className="payment-return-orb payment-return-orb-two" aria-hidden="true" />

        <div className="payment-return-shell">
          <section className={`payment-return-status ${statusTone}`}>
            <div className="payment-return-status-main">
              <span className="payment-return-status-icon" aria-hidden="true">
                {isLoading
                  ? <LoaderCircle className="payment-return-spinner" />
                  : isPendingOrder ? <Clock3 /> : isSuccess ? <CheckCircle2 /> : <XCircle />}
              </span>
              <div className="payment-return-status-copy">
                <span className="payment-return-kicker">
                  {isLoading
                    ? t.secure
                    : !hasOrder
                      ? t.missingKicker
                      : isPendingOrder
                        ? t.pendingKicker
                        : isSuccess ? t.successKicker : t.failureKicker}
                </span>
                <h1>{displayTitle}</h1>
                <p>{displayMessage}</p>
                {!isLoading && isSuccess && hasOrder && (
                  <p className="payment-return-delivery-message">
                    {t.deliveryMessage}{" "}
                    <a
                      href="https://wa.me/237690928237"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.whatsapp}
                    </a>.
                  </p>
                )}
              </div>
            </div>

            {!isLoading && (
              <div className="payment-return-status-actions">
                {canDownloadReceipt && (
                  <button
                    type="button"
                    className="payment-return-primary-action"
                    onClick={downloadReceipt}
                    disabled={isGeneratingReceipt}
                  >
                    {isGeneratingReceipt
                      ? <LoaderCircle className="payment-return-spinner" aria-hidden="true" />
                      : <Download size={18} aria-hidden="true" />}
                    <span>{isGeneratingReceipt ? t.generating : t.download}</span>
                  </button>
                )}
                <Link
                  className={canDownloadReceipt ? "payment-return-secondary-action" : "payment-return-primary-action"}
                  href={shouldReturnHome ? "/" : "/#packs"}
                >
                  {shouldReturnHome ? <Home size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
                  <span>{shouldReturnHome ? t.home : t.retry}</span>
                </Link>
              </div>
            )}

            {receiptError && <p className="payment-return-download-error" role="alert">{t.downloadError}</p>}
          </section>

          {checkout && (
            <section className="payment-return-details">
              <div className="payment-return-section-heading">
                <span className="payment-return-section-icon"><ReceiptText size={19} /></span>
                <span>
                  <strong>{t.detailsTitle}</strong>
                  <small>{t.detailsSubtitle}</small>
                </span>
              </div>

              <div className="payment-return-detail-grid">
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><FileCheck2 size={18} /></span>
                  <span><small>{t.orderNumber}</small><strong>{checkout.orderId}</strong></span>
                </div>
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><WalletCards size={18} /></span>
                  <span><small>{t.reference}</small><strong>{transactionReference ?? t.notAvailable}</strong></span>
                </div>
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><UserRound size={18} /></span>
                  <span><small>{t.account}</small><strong>@{checkout.username}</strong></span>
                </div>
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><Coins size={18} /></span>
                  <span><small>{t.recharge}</small><strong>{formatNumber(checkout.coins, language)} {t.coins}</strong></span>
                </div>
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><ReceiptText size={18} /></span>
                  <span><small>{t.amount}</small><strong>{formatAmount(checkout.amount, checkout.currency, language)}</strong></span>
                </div>
                <div className="payment-return-detail-item">
                  <span className="payment-return-detail-icon"><Clock3 size={18} /></span>
                  <span><small>{t.orderedAt}</small><strong>{formatDate(checkout.submittedAt, language)}</strong></span>
                </div>
              </div>

              {isSuccess && (
                <div className="payment-return-keep-receipt">
                  <span><Check size={17} /></span>
                  <span><strong>{t.keepReceipt}</strong><small>{t.keepReceiptMessage}</small></span>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      <footer className="payment-return-footer">
        <span><ShieldCheck size={15} /> {t.secure}</span>
        <span><CheckCircle2 size={15} /> {t.dataProtected}</span>
        <a href="https://wa.me/237690928237" target="_blank" rel="noopener noreferrer">
          <Headphones size={15} /> {t.fastSupport}
        </a>
      </footer>

      <a
        className="whatsapp-float"
        href="https://wa.me/237690928237"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.contactWhatsapp}
        title={t.contactWhatsapp}
      >
        <FaWhatsapp className="whatsapp-brand-icon" aria-hidden="true" />
        <span>WhatsApp</span>
      </a>
    </main>
  );
}
