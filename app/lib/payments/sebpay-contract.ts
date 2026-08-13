export type SebPayPaymentStatus = "pending" | "approved" | "rejected";
export type SebPayPackId =
  | "mini"
  | "starter"
  | "boost"
  | "live"
  | "creator"
  | "max"
  | "custom";

export type SebPayCountry = {
  code: string;
  name: string;
  prefix: string;
  currency: "XAF";
};

export type SebPayOperator = {
  name: string;
  code: string;
  slug: string;
  otpRequired: boolean;
  ussdCode: string | null;
};

export type SebPayConfiguration = {
  country: SebPayCountry;
  operators: SebPayOperator[];
};

export type SebPayInitiationRequest = {
  idempotencyKey: string;
  packId: string;
  customCoins?: number;
  phone: string;
  operator: string;
  otpCode?: string;
};

export type SebPayPayment = {
  orderId: string;
  transactionId: string | null;
  status: SebPayPaymentStatus;
  providerStatus: string | null;
  providerLink: string | null;
  packId: SebPayPackId;
  coins: number;
  amount: number;
  currency: "XAF";
};

type ApiEnvelope = {
  success: boolean;
  data?: unknown;
  message?: string;
};

const REQUEST_TIMEOUT_MS = 15_000;
const SEBPAY_PACK_IDS = new Set<SebPayPackId>([
  "mini",
  "starter",
  "boost",
  "live",
  "creator",
  "max",
  "custom",
]);

export class SebPayClientError extends Error {
  readonly code: "configuration" | "network" | "response" | "provider";

  constructor(
    code: SebPayClientError["code"],
    message: string,
  ) {
    super(message);
    this.name = "SebPayClientError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, maximumLength = 240): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= maximumLength ? cleaned : null;
}

function optionalString(value: unknown, maximumLength = 500): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requiredString(value, maximumLength);
}

function parseEnvelope(value: unknown): ApiEnvelope | null {
  if (!isRecord(value) || typeof value.success !== "boolean") return null;
  return {
    success: value.success,
    data: value.data,
    message: optionalString(value.message) ?? undefined,
  };
}

function parseOperator(value: unknown): SebPayOperator | null {
  if (!isRecord(value)) return null;
  const name = requiredString(value.name, 120);
  const code = requiredString(value.code, 80);
  const slug = requiredString(value.slug, 100);
  if (!name || !code || !slug || typeof value.otpRequired !== "boolean") return null;

  return {
    name,
    code,
    slug,
    otpRequired: value.otpRequired,
    ussdCode: optionalString(value.ussdCode, 120),
  };
}

function parseConfiguration(value: unknown): SebPayConfiguration | null {
  if (!isRecord(value) || !isRecord(value.country) || !Array.isArray(value.operators)) {
    return null;
  }

  const code = requiredString(value.country.code, 2);
  const name = requiredString(value.country.name, 120);
  const prefix = requiredString(value.country.prefix, 8);
  const currency = value.country.currency;
  const operators = value.operators
    .map(parseOperator)
    .filter((operator): operator is SebPayOperator => operator !== null);

  if (!code || !name || !prefix || currency !== "XAF" || operators.length === 0) return null;
  return { country: { code, name, prefix, currency }, operators };
}

export function parseSebPayPayment(value: unknown): SebPayPayment | null {
  if (!isRecord(value)) return null;
  const orderId = requiredString(value.orderId, 120);
  const transactionId = optionalString(value.transactionId, 180);
  const providerStatus = optionalString(value.providerStatus, 64);
  const providerLink = optionalString(value.providerLink, 2_048);
  const status = value.status;
  const packId = value.packId;
  const coins = value.coins;
  const amount = value.amount;
  const currency = value.currency;

  if (
    !orderId ||
    (status !== "pending" && status !== "approved" && status !== "rejected") ||
    typeof packId !== "string" ||
    !SEBPAY_PACK_IDS.has(packId as SebPayPackId) ||
    typeof coins !== "number" ||
    !Number.isSafeInteger(coins) ||
    coins < 70 ||
    coins > 1_000_000 ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    currency !== "XAF"
  ) {
    return null;
  }

  if (providerLink) {
    try {
      if (new URL(providerLink).protocol !== "https:") return null;
    } catch {
      return null;
    }
  }

  return {
    orderId,
    transactionId,
    status,
    providerStatus,
    providerLink,
    packId: packId as SebPayPackId,
    coins,
    amount,
    currency,
  };
}

export function getSebPayWorkerBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SEBPAY_WORKER_URL?.trim();
  if (!configured) {
    throw new SebPayClientError(
      "configuration",
      "SebPay n'est pas encore configuré sur cette boutique.",
    );
  }

  try {
    const base = new URL(configured, window.location.origin);
    const isLocal = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    if (
      (base.protocol !== "https:" && !(isLocal && base.protocol === "http:")) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      throw new Error("insecure protocol");
    }
    return base.toString().replace(/\/$/, "");
  } catch {
    throw new SebPayClientError(
      "configuration",
      "L'adresse du service SebPay est invalide.",
    );
  }
}

async function requestEnvelope(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getSebPayWorkerBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const value: unknown = await response.json().catch(() => null);
    const envelope = parseEnvelope(value);
    if (!envelope) {
      throw new SebPayClientError("response", "Réponse inattendue du service de paiement.");
    }
    if (!response.ok || !envelope.success) {
      throw new SebPayClientError(
        "provider",
        envelope.message ?? "SebPay n'a pas pu traiter cette demande.",
      );
    }
    return envelope;
  } catch (error) {
    if (error instanceof SebPayClientError) throw error;
    throw new SebPayClientError(
      "network",
      error instanceof DOMException && error.name === "AbortError"
        ? "Le service SebPay met trop de temps à répondre. Réessayez."
        : "Impossible de joindre le service SebPay. Vérifiez votre connexion.",
    );
  } finally {
    window.clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function fetchSebPayConfiguration(): Promise<SebPayConfiguration> {
  const envelope = await requestEnvelope("/v1/sebpay/config");
  const configuration = parseConfiguration(envelope.data);
  if (!configuration) {
    throw new SebPayClientError("response", "Configuration SebPay invalide.");
  }
  return configuration;
}

export async function initiateSebPayPayment(
  payload: SebPayInitiationRequest,
): Promise<SebPayPayment> {
  const envelope = await requestEnvelope("/v1/payments/sebpay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const payment = parseSebPayPayment(envelope.data);
  if (!payment) throw new SebPayClientError("response", "Transaction SebPay invalide.");
  return payment;
}

export async function fetchSebPayPayment(
  orderId: string,
  signal?: AbortSignal,
): Promise<SebPayPayment> {
  const envelope = await requestEnvelope(
    `/v1/payments/sebpay/${encodeURIComponent(orderId)}`,
    { signal },
  );
  const payment = parseSebPayPayment(envelope.data);
  if (!payment || payment.orderId !== orderId) {
    throw new SebPayClientError("response", "Statut SebPay invalide.");
  }
  return payment;
}
