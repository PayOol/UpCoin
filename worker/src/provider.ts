import { readBoundedBody, parseJsonBytes } from "./body";
import {
  HttpError,
  isRecord,
  readOptionalString,
  readRequiredString,
  type SebPayCountry,
  type SebPayOperator,
} from "./contracts";

const PROVIDER_TIMEOUT_MS = 8_000;
const MAX_PROVIDER_BODY_BYTES = 128 * 1024;

export type ProviderTransaction = {
  transactionId: string;
  externalReference: string;
  providerStatus: string;
  amount: number;
  currency: string;
  providerLink: string | null;
  updatedAt: string | null;
};

export class ProviderError extends Error {
  constructor(
    readonly retryable: boolean,
    readonly code: string,
  ) {
    super(code);
    this.name = "ProviderError";
  }
}

function providerHeaders(env: Env): Headers {
  return new Headers({
    Accept: "application/json",
    "X-Public-Key": env.SEBPAY_PUBLIC_KEY,
    "X-Secret-Key": env.SEBPAY_SECRET_KEY,
  });
}

function providerUrl(env: Env, path: string): URL {
  let base: URL;
  try {
    base = new URL(env.SEBPAY_API_BASE_URL);
  } catch {
    throw new HttpError(500, "Configuration SebPay invalide.", "invalid_provider_base_url");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new HttpError(500, "Configuration SebPay invalide.", "invalid_provider_base_url");
  }
  const baseWithSlash = base.toString().replace(/\/$/, "") + "/";
  return new URL(path.replace(/^\//, ""), baseWithSlash);
}

async function providerRequest(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const headers = providerHeaders(env);
    if (init.body !== undefined && init.body !== null) headers.set("Content-Type", "application/json");
    const response = await fetch(providerUrl(env, path), {
      ...init,
      headers,
      signal: controller.signal,
    });
    const bytes = await readBoundedBody(
      response.body,
      response.headers.get("Content-Length"),
      MAX_PROVIDER_BODY_BYTES,
    );
    let value: unknown;
    try {
      value = parseJsonBytes(bytes, "invalid_provider_json");
    } catch {
      throw new ProviderError(response.status >= 500 || response.status === 429, "invalid_provider_response");
    }
    if (!response.ok) {
      throw new ProviderError(
        response.status >= 500 || response.status === 408 || response.status === 429,
        "provider_http_error",
      );
    }
    if (!isRecord(value) || value.success !== true || value.data === undefined) {
      throw new ProviderError(false, "provider_rejected_request");
    }
    return value.data;
  } catch (error) {
    if (error instanceof ProviderError || error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError(true, "provider_timeout");
    }
    throw new ProviderError(true, "provider_network_error");
  } finally {
    clearTimeout(timeout);
  }
}

function extractList(value: unknown, candidateKeys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) throw new ProviderError(false, "provider_list_invalid");
  for (const key of candidateKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  throw new ProviderError(false, "provider_list_invalid");
}

function parseOperator(value: unknown): SebPayOperator | null {
  if (!isRecord(value)) return null;
  const name = readRequiredString(value.name, 120);
  const code = readRequiredString(value.code, 100);
  const slug = readRequiredString(value.slug, 100);
  if (!name || !code || !slug || typeof value.otp_required !== "boolean") return null;
  return {
    name,
    code,
    slug,
    otpRequired: value.otp_required,
    ussdCode: readOptionalString(value.ussd_code, 120),
  };
}

function currencyCode(value: unknown): string | null {
  if (typeof value === "string") return readRequiredString(value, 8);
  if (!isRecord(value)) return null;
  return (
    readRequiredString(value.code, 8) ??
    readRequiredString(value.currency_code, 8) ??
    readRequiredString(value.iso_code, 8)
  );
}

function parseCountry(value: unknown, configuredCurrency: string): SebPayCountry | null {
  if (!isRecord(value)) return null;
  const code = readRequiredString(value.country_code, 2) ?? readRequiredString(value.code, 2);
  const name = readRequiredString(value.country_name, 120) ?? readRequiredString(value.name, 120);
  const prefix = readRequiredString(value.prefix, 8);
  const providerCurrency = currencyCode(value.currency);
  if (!code || !name || !prefix) return null;
  if (providerCurrency && providerCurrency.toUpperCase() !== configuredCurrency) return null;
  return { code: code.toUpperCase(), name, prefix, currency: configuredCurrency };
}

export async function fetchOperators(env: Env): Promise<SebPayOperator[]> {
  const country = encodeURIComponent(env.SEBPAY_COUNTRY.toUpperCase());
  const data = await providerRequest(env, `operators?country=${country}`);
  const operators = extractList(data, ["operators", "items"])
    .map(parseOperator)
    .filter((operator): operator is SebPayOperator => operator !== null);
  if (operators.length === 0) throw new ProviderError(false, "provider_operators_empty");
  return operators;
}

export async function fetchCountry(env: Env): Promise<SebPayCountry> {
  const data = await providerRequest(env, "countries");
  const countries = extractList(data, ["countries", "items"]);
  const expectedCode = env.SEBPAY_COUNTRY.toUpperCase();
  for (const value of countries) {
    const country = parseCountry(value, env.SEBPAY_CURRENCY.toUpperCase());
    if (country?.code === expectedCode) return country;
  }
  throw new ProviderError(false, "provider_country_unavailable");
}

function readProviderAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+(?:\.0+)?$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function providerLink(value: unknown): string | null {
  const link = readOptionalString(value, 2_048);
  if (!link) return null;
  try {
    const url = new URL(link);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseProviderTransaction(value: unknown): ProviderTransaction {
  if (!isRecord(value)) throw new ProviderError(false, "provider_transaction_invalid");
  const transactionId = readRequiredString(value.transaction_id, 180);
  const externalReference = readRequiredString(value.external_reference, 120);
  const providerStatus = readRequiredString(value.status, 64);
  const amount = readProviderAmount(value.amount);
  const currency = readRequiredString(value.currency, 8);
  if (!transactionId || !externalReference || !providerStatus || !amount || !currency) {
    throw new ProviderError(false, "provider_transaction_invalid");
  }
  return {
    transactionId,
    externalReference,
    providerStatus,
    amount,
    currency: currency.toUpperCase(),
    providerLink: providerLink(value.provider_link),
    updatedAt: readOptionalString(value.updated_at, 64),
  };
}

export async function createCollection(
  env: Env,
  input: {
    amount: number;
    currency: string;
    phone: string;
    operator: string;
    country: string;
    externalReference: string;
    callbackUrl: string;
    otpCode?: string;
  },
): Promise<ProviderTransaction> {
  const body: Record<string, string | number> = {
    amount: input.amount,
    currency: input.currency,
    phone: input.phone,
    operator: input.operator,
    country: input.country,
    external_reference: input.externalReference,
    callback_url: input.callbackUrl,
  };
  if (input.otpCode) body.otp_code = input.otpCode;
  const data = await providerRequest(env, "collections", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseProviderTransaction(data);
}

export async function getCollection(env: Env, idOrReference: string): Promise<ProviderTransaction> {
  const data = await providerRequest(env, `collections/${encodeURIComponent(idOrReference)}`);
  return parseProviderTransaction(data);
}
