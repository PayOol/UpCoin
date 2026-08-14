"use client";

import { type FormEvent, useMemo, useState } from "react";
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
import {
  createSebPayCollection,
  getSebPayCollection,
  SebPayClientError,
  type SebPayCollection,
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
};

type CountryOption = {
  code: string;
  name: string;
  prefix: string;
  currency: string;
};

type OperatorOption = {
  code: string;
  name: string;
};

const countries: CountryOption[] = [
  { code: "BJ", name: "B\u00e9nin", prefix: "229", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", prefix: "226", currency: "XOF" },
  { code: "CM", name: "Cameroun", prefix: "237", currency: "XAF" },
  { code: "CG", name: "Congo", prefix: "242", currency: "XAF" },
  { code: "CI", name: "C\u00f4te d'Ivoire", prefix: "225", currency: "XOF" },
  { code: "GA", name: "Gabon", prefix: "241", currency: "XAF" },
  { code: "GM", name: "Gambie", prefix: "220", currency: "GMD" },
  { code: "GN", name: "Guin\u00e9e", prefix: "224", currency: "GNF" },
  { code: "GW", name: "Guin\u00e9e-Bissau", prefix: "245", currency: "XOF" },
  { code: "ML", name: "Mali", prefix: "223", currency: "XOF" },
  { code: "NE", name: "Niger", prefix: "227", currency: "XOF" },
  { code: "CD", name: "R.D. Congo", prefix: "243", currency: "CDF" },
  { code: "SN", name: "S\u00e9n\u00e9gal", prefix: "221", currency: "XOF" },
  { code: "TG", name: "Togo", prefix: "228", currency: "XOF" },
];

const operatorsByCountry: Record<string, OperatorOption[]> = {
  BJ: [
    { code: "celtiis", name: "Celtiis Money" },
    { code: "coris", name: "Coris Money" },
    { code: "moov", name: "Moov Money" },
    { code: "mtn", name: "MTN Money" },
  ],
  BF: [
    { code: "moov", name: "Moov Money" },
    { code: "orange", name: "Orange Money" },
    { code: "wligdicash", name: "Wallet LigdiCash" },
  ],
  CD: [
    { code: "afrimoney", name: "Afri Money" },
    { code: "airtel", name: "Airtel Money" },
    { code: "mpesa", name: "M-Pesa" },
    { code: "orange", name: "Orange Money" },
    { code: "vodacom", name: "Vodacom" },
  ],
  CG: [{ code: "mtn", name: "MTN Money" }],
  CI: [
    { code: "moov", name: "Moov Money" },
    { code: "mtn", name: "MTN Money" },
    { code: "orange", name: "Orange Money" },
    { code: "wave", name: "Wave" },
  ],
  CM: [
    { code: "mtn", name: "MTN Money" },
    { code: "orange", name: "Orange Money" },
  ],
  GA: [
    { code: "airtel", name: "Airtel Money" },
    { code: "moov", name: "Moov Money" },
  ],
  GM: [{ code: "afrimoney", name: "Afri Money" }],
  GN: [
    { code: "mtn", name: "MTN Money" },
    { code: "orange", name: "Orange Money" },
  ],
  GW: [{ code: "orange", name: "Orange Money" }],
  ML: [
    { code: "moov", name: "Moov Money" },
    { code: "orange", name: "Orange Money" },
  ],
  NE: [
    { code: "airtel", name: "Airtel Money" },
    { code: "amanata", name: "Amanata" },
    { code: "moov", name: "Moov Money" },
    { code: "nita", name: "Nita" },
    { code: "wligdicash", name: "Wallet LigdiCash" },
    { code: "zamani", name: "Zamani" },
  ],
  SN: [
    { code: "emoney", name: "E-Money" },
    { code: "free", name: "Free Money" },
    { code: "orange", name: "Orange Money" },
    { code: "wave", name: "Wave" },
  ],
  TG: [
    { code: "moov", name: "Moov Money" },
    { code: "tmoney", name: "T-Money" },
  ],
};

const exchangeRatesFromXaf: Record<string, number> = {
  XAF: 1,
  XOF: 1,
  GNF: 15.45561981,
  CDF: 4.09206288,
  GMD: 0.12965094,
};

const copy = {
  fr: {
    title: "Informations Mobile Money",
    country: "Pays",
    operator: "Op\u00e9rateur",
    phone: "Num\u00e9ro Mobile Money",
    phoneHint: "Format international, sans le signe +",
    otp: "Code OTP",
    otpHint: "Optionnel selon l'op\u00e9rateur",
    pay: "Payer avec SebPay",
    submitting: "Paiement en cours\u2026 Consultez votre t\u00e9l\u00e9phone.",
    secure: "Les cl\u00e9s SebPay restent prot\u00e9g\u00e9es dans le Worker Cloudflare.",
    invalidPhone: "Saisissez un num\u00e9ro international valide (8 \u00e0 15 chiffres).",
    invalidEmail: "Saisissez une adresse e-mail valide.",
    invalidOtp: "Le code OTP doit contenir entre 4 et 12 chiffres.",
    pending: "Le paiement est toujours en attente. V\u00e9rifiez votre t\u00e9l\u00e9phone puis r\u00e9essayez.",
  },
  en: {
    title: "Mobile Money details",
    country: "Country",
    operator: "Operator",
    phone: "Mobile Money number",
    phoneHint: "International format, without the + sign",
    otp: "OTP code",
    otpHint: "Optional depending on the operator",
    pay: "Pay with SebPay",
    submitting: "Payment in progress\u2026 Check your phone.",
    secure: "SebPay keys remain protected inside the Cloudflare Worker.",
    invalidPhone: "Enter a valid international number (8 to 15 digits).",
    invalidEmail: "Enter a valid email address.",
    invalidOtp: "The OTP must contain between 4 and 12 digits.",
    pending: "The payment is still pending. Check your phone, then try again.",
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60;

function digitsOnly(value: string, maximumLength = 15): string {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function countryFromDialCode(dialCode?: string): CountryOption {
  const prefix = digitsOnly(dialCode ?? "");
  return countries.find((country) => country.prefix === prefix) ??
    countries.find((country) => country.code === "CM")!;
}

function initialLocalPhone(whatsapp?: string, country?: CountryOption): string {
  const digits = digitsOnly(whatsapp ?? "");
  return country && digits.startsWith(country.prefix)
    ? digits.slice(country.prefix.length)
    : digits.replace(/^0+/, "");
}

function convertAmount(amount: number, currency: string): number {
  const exchangeRate = exchangeRatesFromXaf[currency] ?? 1;
  const exchangeFee = currency === "XAF" || currency === "XOF" ? 0 : 30;
  return Math.ceil((amount + exchangeFee) * exchangeRate);
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
}: SebPayCheckoutProps) {
  const t = copy[language];
  const initialCountry = countryFromDialCode(dialCode);
  const [countryCode, setCountryCode] = useState(initialCountry.code);
  const [operator, setOperator] = useState(
    operatorsByCountry[initialCountry.code]?.[0]?.code ?? "",
  );
  const [phone, setPhone] = useState(() => initialLocalPhone(whatsapp, initialCountry));
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === countryCode) ?? initialCountry,
    [countryCode, initialCountry],
  );
  const availableOperators = operatorsByCountry[selectedCountry.code] ?? [];
  const paymentAmount = convertAmount(amount, selectedCountry.currency);

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
    const path = succeeded ? "/payment/success" : "/payment/failed";
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
    if (isSubmitting) return;

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
    if (otpCode && !/^\d{4,12}$/.test(otpCode)) {
      setError(t.invalidOtp);
      return;
    }
    if (!availableOperators.some((candidate) => candidate.code === operator)) {
      setError(t.operator);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payment = await createSebPayCollection({
        amount: paymentAmount,
        currency: selectedCountry.currency,
        phone: normalizedPhone,
        operator,
        country: selectedCountry.code,
        external_reference: orderId,
        callback_url: `${window.location.origin}/payment/success?provider=sebpay&order=${encodeURIComponent(orderId)}`,
        ...(otpCode ? { otp_code: otpCode } : {}),
      });

      rememberPendingCheckout(payment);
      if (payment.providerLink) {
        window.open(payment.providerLink, "_blank", "noopener,noreferrer");
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
                setCountryCode(nextCountryCode);
                setOperator(operatorsByCountry[nextCountryCode]?.[0]?.code ?? "");
                setOtpCode("");
                setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              {countries.map((country) => (
                <option value={country.code} key={country.code}>
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
                <option value={candidate.code} key={candidate.code}>
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

      <label className="field-label">
        <span>{t.otp} <span className="optional">({t.otpHint})</span></span>
        <div className="field">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4,12}"
            value={otpCode}
            onChange={(event) => {
              setOtpCode(digitsOnly(event.target.value, 12));
              setError(null);
            }}
            placeholder="123456"
            autoComplete="one-time-code"
            disabled={isSubmitting}
          />
        </div>
      </label>

      {error && <p className="sebpay-checkout-error" role="alert">{error}</p>}

      <p className="sebpay-security-note">
        <ShieldCheck size={15} aria-hidden="true" /> {t.secure}
      </p>
      <button
        className="soleaspay-checkout-submit sebpay-checkout-submit"
        type="submit"
        disabled={isSubmitting || !EMAIL_PATTERN.test(email) || availableOperators.length === 0}
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
