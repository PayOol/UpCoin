"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import {
  PAYMENT_EMAIL_DATA_KEY,
  PAYMENT_PENDING_CHECKOUT_KEY,
  PAYMENT_RETURN_SNAPSHOT_KEY,
  type PaymentEmailData,
  type PaymentLanguage,
  type PendingPaymentCheckout,
} from "@/app/lib/payments/payment-contract";
import { rememberPendingPayment } from "@/app/lib/payments/payment-history";
import { getAssetPath } from "@/app/lib/asset-path";
import {
  createSebPayCollection,
  getSebPayCountries,
  getSebPayCollection,
  SebPayClientError,
  type SebPayCollection,
  type SebPayCountry,
} from "@/app/lib/payments/sebpay-contract";

type SebPayCheckoutProps = {
  language: PaymentLanguage;
  orderId: string;
  amount: number;
  coins: number;
  username: string;
  password?: string;
  email: string;
  whatsapp?: string;
  dialCode?: string;
  countryCode?: string;
};

const copy = {
  fr: {
    title: "Informations Mobile Money",
    country: "Pays",
    operator: "Op\u00e9rateur",
    phone: "Num\u00e9ro Mobile Money",
    phoneHint: "Format international, sans le signe +",
    otp: "Code OTP",
    otpInstruction: "Composez {code} sur votre t\u00e9l\u00e9phone pour obtenir le code OTP.",
    openProvider: "Ouvrir la page de validation de l'op\u00e9rateur",
    pay: "Payer avec SebPay",
    submitting: "Paiement en cours\u2026 Consultez votre t\u00e9l\u00e9phone.",
    loadingCatalog: "Chargement des pays et op\u00e9rateurs SebPay\u2026",
    catalogUnavailable: "Le catalogue SebPay est momentan\u00e9ment indisponible.",
    retry: "R\u00e9essayer",
    invalidPhone: "Saisissez un num\u00e9ro international valide (8 \u00e0 15 chiffres).",
    invalidEmail: "Saisissez une adresse e-mail valide.",
    invalidOtp: "Saisissez le code OTP requis.",
    pending: "Le paiement est toujours en attente. V\u00e9rifiez votre t\u00e9l\u00e9phone puis r\u00e9essayez.",
  },
  en: {
    title: "Mobile Money details",
    country: "Country",
    operator: "Operator",
    phone: "Mobile Money number",
    phoneHint: "International format, without the + sign",
    otp: "OTP code",
    otpInstruction: "Dial {code} on your phone to get the OTP code.",
    openProvider: "Open the operator validation page",
    pay: "Pay with SebPay",
    submitting: "Payment in progress\u2026 Check your phone.",
    loadingCatalog: "Loading SebPay countries and operators\u2026",
    catalogUnavailable: "The SebPay catalog is temporarily unavailable.",
    retry: "Retry",
    invalidPhone: "Enter a valid international number (8 to 15 digits).",
    invalidEmail: "Enter a valid email address.",
    invalidOtp: "Enter the required OTP code.",
    pending: "The payment is still pending. Check your phone, then try again.",
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60;

function digitsOnly(value: string, maximumLength = 15): string {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function countryFromDialCode(
  countries: SebPayCountry[],
  dialCode?: string,
  countryCode?: string,
): SebPayCountry {
  if (countryCode) {
    const match = countries.find(
      (c) => c.code.toUpperCase() === countryCode.toUpperCase(),
    );
    if (match) return match;
  }
  const prefix = digitsOnly(dialCode ?? "");
  return countries.find((country) => country.prefix === prefix) ??
    countries.find((country) => country.code === "CM") ??
    countries[0];
}

function initialLocalPhone(whatsapp?: string, country?: SebPayCountry): string {
  const digits = digitsOnly(whatsapp ?? "");
  return country && digits.startsWith(country.prefix)
    ? digits.slice(country.prefix.length)
    : digits.replace(/^0+/, "");
}

function convertAmount(amount: number, currency: string, exchangeRate: number): number {
  const exchangeFee = currency === "XAF" || currency === "XOF" ? 0 : 30;
  return Math.ceil((amount + exchangeFee) / exchangeRate);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function SebPayCheckout({
  language,
  orderId,
  amount,
  coins,
  username,
  password,
  email,
  whatsapp,
  dialCode,
  countryCode: countryCodeProp,
}: SebPayCheckoutProps) {
  const t = copy[language];
  const [countries, setCountries] = useState<SebPayCountry[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [providerLink, setProviderLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<{ message: string | null } | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogRevision, setCatalogRevision] = useState(0);

  useEffect(() => {
    let ignore = false;

    void getSebPayCountries()
      .then((availableCountries) => {
        if (ignore) return;
        const initialCountry = countryFromDialCode(availableCountries, dialCode, countryCodeProp);
        setCountries(availableCountries);
        setCountryCode(initialCountry.code);
        setOperator(initialCountry.operators[0]?.code ?? "");
        setPhone(initialLocalPhone(whatsapp, initialCountry));
        setOtpCode("");
        setCatalogError(null);
      })
      .catch((catalogLoadError: unknown) => {
        if (ignore) return;
        setCatalogError({
          message: catalogLoadError instanceof SebPayClientError
            ? catalogLoadError.message
            : null,
        });
      })
      .finally(() => {
        if (!ignore) setIsCatalogLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [catalogRevision, countryCodeProp, dialCode, whatsapp]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === countryCode) ?? null,
    [countries, countryCode],
  );
  const availableOperators = selectedCountry?.operators ?? [];
  const selectedOperator = availableOperators.find(
    (candidate) => candidate.code === operator,
  ) ?? null;
  const paymentAmount = selectedCountry
    ? convertAmount(amount, selectedCountry.currency, selectedCountry.exchangeRate)
    : amount;
  const otpUssdCode = selectedOperator?.otpRequired && selectedOperator.ussdCode
    ? selectedOperator.ussdCode.replace(/montant/gi, String(paymentAmount))
    : null;

  function rememberPendingCheckout(payment: SebPayCollection): void {
    const pendingCheckout: PendingPaymentCheckout = {
      version: 1,
      provider: "sebpay",
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
      const emailData: PaymentEmailData = {
        orderId,
        tiktokPassword: password ?? "",
        clientEmail: email,
        clientWhatsapp: `${dialCode ?? ""} ${whatsapp ?? ""}`.trim(),
      };
      window.sessionStorage.setItem(PAYMENT_EMAIL_DATA_KEY, JSON.stringify(emailData));
    } catch {
      // Le stockage local ne doit pas bloquer l'appel SebPay.
    }

    rememberPendingPayment(pendingCheckout, {
      transactionReference: payment.transactionId,
      providerStatus: payment.rawStatus ?? "pending",
    });
  }

  function finishPayment(payment: SebPayCollection): void {
    const succeeded = payment.status === "success";
    const paymentData = JSON.stringify({
      success: succeeded,
      status: payment.rawStatus ?? (succeeded ? "SUCCESS" : "FAILED"),
      order_id: orderId,
      transaction_reference: payment.transactionId,
    });
    const path = getAssetPath(succeeded ? "/payment/success" : "/payment/failed");
    window.location.assign(
      `${path}?provider=sebpay&order=${encodeURIComponent(orderId)}` +
      `&payment_data=${encodeURIComponent(paymentData)}`,
    );
  }

  async function waitForFinalStatus(reference: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await wait(POLL_INTERVAL_MS);
      const payment = await getSebPayCollection(reference);
      if (payment.status !== "pending") {
        finishPayment(payment);
        return;
      }
    }
    throw new SebPayClientError(t.pending);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting || !selectedCountry || !selectedOperator) return;

    const localPhone = digitsOnly(phone);
    const normalizedPhone = localPhone.startsWith(selectedCountry.prefix)
      ? localPhone
      : `${selectedCountry.prefix}${localPhone}`;
    if (!/^\d{8,15}$/.test(normalizedPhone)) {
      setError(t.invalidPhone);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError(t.invalidEmail);
      return;
    }
    if (selectedOperator.otpRequired && !otpCode.trim()) {
      setError(t.invalidOtp);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setProviderLink(null);
    try {
      const payment = await createSebPayCollection({
        amount: paymentAmount,
        currency: selectedCountry.currency,
        phone: normalizedPhone,
        operator: selectedOperator.code,
        country: selectedCountry.code,
        external_reference: orderId,
        ...(selectedOperator.otpRequired ? { otp_code: otpCode.trim() } : {}),
      });

      rememberPendingCheckout(payment);
      if (payment.providerLink) {
        const providerWindow = window.open(
          payment.providerLink,
          "_blank",
          "noopener,noreferrer",
        );
        if (!providerWindow) setProviderLink(payment.providerLink);
      }
      if (payment.status !== "pending") {
        finishPayment(payment);
        return;
      }
      await waitForFinalStatus(payment.transactionId ?? orderId);
    } catch (submitError) {
      setError(
        submitError instanceof SebPayClientError
          ? submitError.message
          : "SebPay est momentan\u00e9ment indisponible.",
      );
      setIsSubmitting(false);
    }
  }

  if (isCatalogLoading || catalogError || !selectedCountry) {
    return (
      <div className="sebpay-catalog-state" role={catalogError ? "alert" : "status"}>
        {isCatalogLoading ? (
          <>
            <LoaderCircle className="sebpay-spinner" aria-hidden="true" />
            <span>{t.loadingCatalog}</span>
          </>
        ) : (
          <>
            <span>{catalogError?.message ?? t.catalogUnavailable}</span>
            <button
              type="button"
              onClick={() => {
                setIsCatalogLoading(true);
                setCatalogError(null);
                setCatalogRevision((revision) => revision + 1);
              }}
            >
              {t.retry}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <form className="sebpay-checkout-form" onSubmit={(event) => void submitPayment(event)}>
      <div className="sebpay-country-line">
        <span>{t.title}</span>
        <strong>{paymentAmount.toLocaleString()} {selectedCountry.currency}</strong>
      </div>

      <div className="sebpay-fields-row">
        <label className="field-label">
          <span>{t.country} <span className="required">*</span></span>
          <div className="field sebpay-select-field">
            <select
              value={countryCode}
              onChange={(event) => {
                const nextCountryCode = event.target.value;
                const nextCountry = countries.find(
                  (country) => country.code === nextCountryCode,
                );
                setCountryCode(nextCountryCode);
                setOperator(nextCountry?.operators[0]?.code ?? "");
                setPhone("");
                setOtpCode("");
                setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              {countries.map((country) => (
                <option value={country.code} key={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </label>

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
              disabled={isSubmitting || availableOperators.length === 0}
              required
            >
              {availableOperators.map((candidate) => (
                <option value={candidate.code} key={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <label className="field-label">
        <span>{t.phone} <span className="required">*</span></span>
        <div className="field">
          <span>+{selectedCountry.prefix}</span>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{6,12}"
            value={phone}
            onChange={(event) => {
              setPhone(digitsOnly(event.target.value, 12));
              setError(null);
            }}
            placeholder="6XXXXXXXX"
            autoComplete="tel"
            disabled={isSubmitting}
            required
          />
        </div>
        <small className="sebpay-field-help">{t.phoneHint}</small>
      </label>

      {selectedOperator?.otpRequired && (
        <label className="field-label">
          <span>{t.otp} <span className="required">*</span></span>
          {otpUssdCode && (
            <small className="sebpay-otp-instruction">
              {t.otpInstruction.replace("{code}", otpUssdCode)}
            </small>
          )}
          <div className="field">
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(event) => {
                setOtpCode(event.target.value.slice(0, 64));
                setError(null);
              }}
              placeholder="123456"
              maxLength={64}
              autoComplete="one-time-code"
              disabled={isSubmitting}
              required
            />
          </div>
        </label>
      )}

      {error && <p className="sebpay-checkout-error" role="alert">{error}</p>}

      {providerLink && (
        <a
          className="sebpay-provider-link"
          href={providerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} aria-hidden="true" /> {t.openProvider}
        </a>
      )}

      <button
        className="soleaspay-checkout-submit sebpay-checkout-submit"
        type="submit"
        disabled={isSubmitting || !EMAIL_PATTERN.test(email) || !selectedOperator}
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
