export type SebPayPaymentStatus = "pending" | "success" | "failed" | "cancelled";

export type SebPayCollectionRequest = {
  amount: number;
  currency: string;
  phone: string;
  operator: string;
  country: string;
  external_reference: string;
  callback_url: string;
  otp_code?: string;
};

export type SebPayCollection = {
  orderId: string;
  transactionId: string | null;
  status: SebPayPaymentStatus;
  rawStatus: string | null;
  providerLink: string | null;
};

type SebPayApiEnvelope = {
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: string | { message?: string };
  errors?: Record<string, string[] | string>;
};

const SEBPAY_PROXY_URL =
  "https://upcoin-sebpay.sebpay-proxy.workers.dev/api/sebpay";

export class SebPayClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SebPayClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapStatus(value: string | null): SebPayPaymentStatus {
  switch (value?.toLowerCase()) {
    case "approved":
    case "success":
      return "success";
    case "rejected":
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

function errorMessage(payload: SebPayApiEnvelope | null, status: number): string {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  if (payload?.errors) {
    return Object.entries(payload.errors)
      .map(([field, messages]) =>
        `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
      .join(" | ");
  }
  return payload?.message ?? `Erreur SebPay (${status})`;
}

function parseCollection(
  payload: SebPayApiEnvelope | null,
  fallbackOrderId: string,
): SebPayCollection {
  const rawPayload: unknown = payload;
  const rawCollection: Record<string, unknown> = isRecord(payload?.data)
    ? payload.data
    : isRecord(rawPayload)
      ? rawPayload
      : {};
  const rawStatus = readString(rawCollection.status);

  return {
    orderId: readString(rawCollection.external_reference) ?? fallbackOrderId,
    transactionId: readString(rawCollection.transaction_id),
    status: mapStatus(rawStatus),
    rawStatus,
    providerLink: readString(rawCollection.provider_link),
  };
}

async function sebPayRequest(
  path: string,
  fallbackOrderId: string,
  init: RequestInit,
): Promise<SebPayCollection> {
  try {
    const response = await fetch(`${SEBPAY_PROXY_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => null) as SebPayApiEnvelope | null;

    if (!response.ok || payload?.success === false) {
      throw new SebPayClientError(errorMessage(payload, response.status));
    }

    return parseCollection(payload, fallbackOrderId);
  } catch (error) {
    if (error instanceof SebPayClientError) throw error;
    throw new SebPayClientError(
      error instanceof TypeError && error.message === "Failed to fetch"
        ? "Impossible de joindre le proxy SebPay."
        : error instanceof Error
          ? error.message
          : "Une erreur SebPay est survenue.",
    );
  }
}

export function createSebPayCollection(
  payload: SebPayCollectionRequest,
): Promise<SebPayCollection> {
  return sebPayRequest("/collections", payload.external_reference, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSebPayCollection(
  transactionId: string,
): Promise<SebPayCollection> {
  return sebPayRequest(
    `/collections/${encodeURIComponent(transactionId)}`,
    transactionId,
    { method: "GET" },
  );
}
