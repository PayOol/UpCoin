"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import {
  PAYMENT_EMAIL_DATA_KEY,
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentEmailData,
  type PaymentLanguage,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import { rememberPendingPayment } from "@/app/lib/payments/payment-history";
import {
  fetchSebPayConfiguration,
  initiateSebPayPayment,
  SebPayClientError,
  type SebPayConfiguration,
  type SebPayPayment,
} from "@/app/lib/payments/sebpay-contract";

type SebPayCheckoutProps = {
  language: PaymentLanguage;
  packId: string;
  customCoins?: number;
  username: string;
  password?: string;
  email: string;
  whatsapp?: string;
  dialCode?: string;
};

const copy = {
  fr: {
    loading: "Chargement des moyens de paiement SebPay…",
    unavailable: "SebPay est momentanément indisponible.",
    retry: "Réessayer",
    operator: "Opérateur Mobile Money",
    selectOperator: "Choisir un opérateur",
    phone: "Numéro Mobile Money",
    phoneHint: "Format international, sans le signe +",
    otp: "Code OTP",
    otpPlaceholder: "Code reçu après la commande USSD",
    ussd: "Composez {code} sur le téléphone de paiement, puis saisissez le code reçu.",
    pay: "Payer avec SebPay",
    submitting: "Demande envoyée à SebPay…",
    secure: "Les clés SebPay restent protégées dans le Worker Cloudflare.",
    invalidPhone: "Saisissez un numéro international valide (8 à 15 chiffres).",
    invalidEmail: "Saisissez une adresse e-mail valide.",
    invalidOperator: "Choisissez votre opérateur Mobile Money.",
    otpRequired: "Le code OTP est obligatoire pour cet opérateur.",
  },
  en: {
    loading: "Loading SebPay payment methods…",
    unavailable: "SebPay is temporarily unavailable.",
    retry: "Try again",
    operator: "Mobile Money operator",
    selectOperator: "Choose an operator",
    phone: "Mobile Money number",
    phoneHint: "International format, without the + sign",
    otp: "OTP code",
    otpPlaceholder: "Code received after dialing the USSD code",
    ussd: "Dial {code} on the payment phone, then enter the code you receive.",
    pay: "Pay with SebPay",
    submitting: "Sending request to SebPay…",
    secure: "SebPay keys remain protected inside the Cloudflare Worker.",
    invalidPhone: "Enter a valid international number (8 to 15 digits).",
    invalidEmail: "Enter a valid email address.",
    invalidOperator: "Choose your Mobile Money operator.",
    otpRequired: "An OTP is required for this operator.",
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

function initialPaymentPhone(dialCode?: string, whatsapp?: string): string {
  const prefix = digitsOnly(dialCode ?? "");
  const localNumber = digitsOnly(whatsapp ?? "").replace(/^0+/, "");
  return localNumber ? `${prefix}${localNumber}`.slice(0, 15) : prefix;
}

export function SebPayCheckout({
  language,
  packId,
  customCoins,
  username,
  password,
  email,
  whatsapp,
  dialCode,
}: SebPayCheckoutProps) {
  const t = copy[language];
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [configuration, setConfiguration] = useState<SebPayConfiguration | null>(null);
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState(() => initialPaymentPhone(dialCode, whatsapp));
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedOperator = useMemo(
    () => configuration?.operators.find(
      (candidate) => candidate.code === operator || candidate.slug === operator,
    ) ?? null,
    [configuration, operator],
  );

  async function loadConfiguration(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const nextConfiguration = await fetchSebPayConfiguration();
      setConfiguration(nextConfiguration);
      setOperator((current) => current || nextConfiguration.operators[0]?.code || "");
      setPhone((current) => digitsOnly(whatsapp ?? "")
        ? current
        : digitsOnly(nextConfiguration.country.prefix));
    } catch (loadError) {
      setConfiguration(null);
      setError(
        loadError instanceof SebPayClientError
          ? loadError.message
          : t.unavailable,
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    window.queueMicrotask(() => void loadConfiguration());
    // The worker configuration is stable for the lifetime of this checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rememberPendingCheckout(payment: SebPayPayment): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      provider: "sebpay",
      orderId: payment.orderId,
      username: username.trim().replace(/^@/, ""),
      coins: payment.coins,
      amount: payment.amount,
      currency: payment.currency,
      submittedAt: new Date().toISOString(),
    };

    try {
      window.sessionStorage.setItem(
        PAYMENT_PENDING_CHECKOUT_KEY,
        JSON.stringify(pendingCheckout),
      );
      window.sessionStorage.removeItem(PAYMENT_RETURN_SNAPSHOT_KEY);
    } catch {
      // Browser storage is a UX cache; the Worker remains authoritative.
    }

    const emailData: PaymentEmailData = {
      orderId: payment.orderId,
      tiktokPassword: password ?? "",
      clientEmail: email,
      clientWhatsapp: `${dialCode ?? ""} ${whatsapp ?? ""}`.trim(),
    };
    try {
      window.sessionStorage.setItem(PAYMENT_EMAIL_DATA_KEY, JSON.stringify(emailData));
    } catch {
      // Email metadata must never block payment initiation.
    }

    rememberPendingPayment(pendingCheckout);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    const cleanedPhone = digitsOnly(phone);
    if (!selectedOperator) {
      setError(t.invalidOperator);
      return;
    }
    if (!/^\d{8,15}$/.test(cleanedPhone)) {
      setError(t.invalidPhone);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError(t.invalidEmail);
      return;
    }
    if (selectedOperator.otpRequired && !otpCode.trim()) {
      setError(t.otpRequired);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payment = await initiateSebPayPayment({
        idempotencyKey: idempotencyKeyRef.current,
        packId,
        ...(packId === "custom" && customCoins ? { customCoins } : {}),
        phone: cleanedPhone,
        operator: selectedOperator.code,
        ...(selectedOperator.otpRequired ? { otpCode: otpCode.trim() } : {}),
      });

      rememberPendingCheckout(payment);
      const statusPath = payment.status === "rejected" ? "/payment/failed" : "/payment/success";
      const returnUrl = `${statusPath}?provider=sebpay&order=${encodeURIComponent(payment.orderId)}`;

      if (payment.providerLink) {
        const providerWindow = window.open(
          payment.providerLink,
          "_blank",
        );
        if (!providerWindow) {
          try {
            window.sessionStorage.setItem("upcoin-sebpay-return-url", returnUrl);
          } catch {
            // The user can still return with the browser back button.
          }
          window.location.assign(payment.providerLink);
          return;
        }
        providerWindow.opener = null;
      }

      window.location.assign(returnUrl);
    } catch (submitError) {
      setError(
        submitError instanceof SebPayClientError
          ? submitError.message
          : t.unavailable,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="sebpay-checkout-state" role="status">
        <LoaderCircle className="sebpay-spinner" aria-hidden="true" />
        <span>{t.loading}</span>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="sebpay-checkout-state is-error" role="alert">
        <span>{error ?? t.unavailable}</span>
        <button type="button" onClick={() => void loadConfiguration()}>
          <RefreshCw size={15} aria-hidden="true" /> {t.retry}
        </button>
      </div>
    );
  }

  return (
    <form className="sebpay-checkout-form" onSubmit={(event) => void submitPayment(event)}>
      <div className="sebpay-country-line">
        <span>{configuration.country.name}</span>
        <strong>{configuration.country.currency}</strong>
      </div>

      <label className="field-label">
        <span>{t.operator} <span className="required">*</span></span>
        <div className="field sebpay-select-field">
          <select
            value={operator}
            onChange={(event) => {
              setOperator(event.target.value);
              setOtpCode("");
              setError(null);
            }}
            required
          >
            <option value="" disabled>{t.selectOperator}</option>
            {configuration.operators.map((candidate) => (
              <option value={candidate.code} key={candidate.slug}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
      </label>

      <label className="field-label">
        <span>{t.phone} <span className="required">*</span></span>
        <div className="field">
          <span>+</span>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{8,15}"
            value={phone}
            onChange={(event) => {
              setPhone(digitsOnly(event.target.value));
              setError(null);
            }}
            placeholder={`${digitsOnly(configuration.country.prefix)}XXXXXXXXX`}
            autoComplete="tel"
            required
          />
        </div>
        <small className="sebpay-field-help">{t.phoneHint}</small>
      </label>

      {selectedOperator?.otpRequired && (
        <div className="sebpay-otp-block">
          {selectedOperator.ussdCode && (
            <p>
              {t.ussd.replace("{code}", selectedOperator.ussdCode)}
            </p>
          )}
          <label className="field-label">
            <span>{t.otp} <span className="required">*</span></span>
            <div className="field">
              <input
                value={otpCode}
                onChange={(event) => {
                  setOtpCode(event.target.value.replace(/\s/g, "").slice(0, 32));
                  setError(null);
                }}
                placeholder={t.otpPlaceholder}
                autoComplete="one-time-code"
                required
              />
            </div>
          </label>
        </div>
      )}

      {error && <p className="sebpay-checkout-error" role="alert">{error}</p>}

      <p className="sebpay-security-note">
        <ShieldCheck size={15} aria-hidden="true" /> {t.secure}
      </p>
      <button
        className="soleaspay-checkout-submit sebpay-checkout-submit"
        type="submit"
        disabled={isSubmitting || !EMAIL_PATTERN.test(email)}
        aria-busy={isSubmitting}
      >
        {isSubmitting
          ? <LoaderCircle className="sebpay-spinner" aria-hidden="true" />
          : <ExternalLink size={18} aria-hidden="true" />}
        <span>{isSubmitting ? t.submitting : t.pay}</span>
      </button>
    </form>
  );
}
