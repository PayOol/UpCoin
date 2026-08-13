import { parseJsonBytes, readBoundedBody, readRequestJson } from "./body";
import {
  HttpError,
  derivePurchase,
  parseInitiationInput,
  parseWebhookPayload,
  paymentResponse,
  type PaymentRow,
  type SebPayOperator,
} from "./contracts";
import { sha256Hex, verifyHmacSha256Hex } from "./crypto";
import {
  ProviderError,
  createCollection,
  fetchCountry,
  fetchOperators,
  getCollection,
  type ProviderTransaction,
} from "./provider";
import { isMonotonicTransition, normalizeProviderStatus } from "./status";

const MAX_INITIATION_BODY_BYTES = 8 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 32 * 1024;
const PROVIDER_CHECK_INTERVAL_MS = 15_000;
const ORDER_ID_PATTERN = /^UPCOIN-SEB-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiEnvelope = {
  success: boolean;
  data?: unknown;
  message?: string;
  code?: string;
};

function structuredLog(
  level: "info" | "warn" | "error",
  event: string,
  requestId: string,
  fields: Readonly<Record<string, string | number | boolean>> = {},
): void {
  const message = JSON.stringify({ event, requestId, ...fields });
  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.log(message);
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(",").map((entry) => entry.trim());
  return allowed.some((entry) => entry.length > 0 && entry === origin) ? origin : null;
}

function withStandardHeaders(headers: Headers, origin: string | null): Headers {
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Vary", "Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function jsonResponse(
  envelope: ApiEnvelope,
  status: number,
  origin: string | null,
  additionalHeaders: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(additionalHeaders);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  const headers = withStandardHeaders(responseHeaders, origin);
  return new Response(JSON.stringify(envelope), { status, headers });
}

function successResponse(data: unknown, status: number, origin: string | null): Response {
  return jsonResponse({ success: true, data }, status, origin);
}

function errorResponse(error: HttpError, origin: string | null): Response {
  return jsonResponse(
    { success: false, message: error.publicMessage, code: error.code },
    error.statusCode,
    origin,
  );
}

function validateRuntimeConfiguration(env: Env): void {
  if (!/^[A-Z]{2}$/.test(env.SEBPAY_COUNTRY)) {
    throw new HttpError(500, "Configuration SebPay invalide.", "invalid_country_configuration");
  }
  if (!/^[A-Z]{3}$/.test(env.SEBPAY_CURRENCY)) {
    throw new HttpError(500, "Configuration SebPay invalide.", "invalid_currency_configuration");
  }
  if (env.SEBPAY_OPERATOR_FIELD !== "code" && env.SEBPAY_OPERATOR_FIELD !== "slug") {
    throw new HttpError(500, "Configuration SebPay invalide.", "invalid_operator_field_configuration");
  }
  const origins = env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  if (origins.length === 0 || origins.some((origin) => !isCanonicalOrigin(origin))) {
    throw new HttpError(500, "Configuration CORS invalide.", "invalid_cors_configuration");
  }
}

function isCanonicalOrigin(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")))
    );
  } catch {
    return false;
  }
}

function handlePreflight(request: Request, origin: string | null): Response {
  if (!origin) {
    return jsonResponse(
      { success: false, message: "Origine non autorisée.", code: "origin_not_allowed" },
      403,
      null,
    );
  }
  const requestedMethod = request.headers.get("Access-Control-Request-Method")?.toUpperCase();
  if (requestedMethod !== "GET" && requestedMethod !== "POST") {
    return jsonResponse(
      { success: false, message: "Méthode CORS non autorisée.", code: "cors_method_not_allowed" },
      403,
      origin,
    );
  }
  const requestedHeaders = request.headers
    .get("Access-Control-Request-Headers")
    ?.split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean) ?? [];
  if (requestedHeaders.some((header) => header !== "content-type")) {
    return jsonResponse(
      { success: false, message: "En-tête CORS non autorisé.", code: "cors_header_not_allowed" },
      403,
      origin,
    );
  }
  return new Response(null, {
    status: 204,
    headers: withStandardHeaders(new Headers(), origin),
  });
}

async function findByIdempotencyKey(env: Env, key: string): Promise<PaymentRow | null> {
  return env.DB.prepare(
    `SELECT order_id, idempotency_key, request_fingerprint, pack_id, coins, amount,
            currency, phone_hash, operator_code, operator_slug, transaction_id,
            status, provider_status, provider_link, provider_updated_at,
            last_provider_check_at, created_at, updated_at
       FROM sebpay_payments
      WHERE idempotency_key = ?`,
  )
    .bind(key)
    .first<PaymentRow>();
}

async function findByOrderId(env: Env, orderId: string): Promise<PaymentRow | null> {
  return env.DB.prepare(
    `SELECT order_id, idempotency_key, request_fingerprint, pack_id, coins, amount,
            currency, phone_hash, operator_code, operator_slug, transaction_id,
            status, provider_status, provider_link, provider_updated_at,
            last_provider_check_at, created_at, updated_at
       FROM sebpay_payments
      WHERE order_id = ?`,
  )
    .bind(orderId)
    .first<PaymentRow>();
}

function resolveOperator(operators: readonly SebPayOperator[], requested: string): SebPayOperator {
  const normalized = requested.toLowerCase();
  const matches = operators.filter(
    (operator) => operator.code.toLowerCase() === normalized || operator.slug.toLowerCase() === normalized,
  );
  if (matches.length !== 1) {
    throw new HttpError(400, "Cet opérateur n'est pas disponible.", "operator_unavailable");
  }
  const operator = matches[0];
  if (!operator) {
    throw new HttpError(400, "Cet opérateur n'est pas disponible.", "operator_unavailable");
  }
  return operator;
}

function providerOperatorValue(field: string, operator: SebPayOperator): string {
  return field === "slug" ? operator.slug : operator.code;
}

function assertProviderReconciliation(
  transaction: ProviderTransaction,
  expected: { orderId: string; amount: number; currency: string; transactionId?: string | null },
): void {
  if (
    transaction.externalReference !== expected.orderId ||
    transaction.amount !== expected.amount ||
    transaction.currency !== expected.currency ||
    (expected.transactionId && expected.transactionId !== transaction.transactionId)
  ) {
    throw new ProviderError(false, "provider_reconciliation_failed");
  }
}

async function insertPendingPayment(
  env: Env,
  row: {
    orderId: string;
    idempotencyKey: string;
    requestFingerprint: string;
    packId: string;
    coins: number;
    amount: number;
    currency: string;
    phoneHash: string;
    operatorCode: string;
    operatorSlug: string;
    now: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO sebpay_payments (
       order_id, idempotency_key, request_fingerprint, pack_id, coins, amount,
       currency, phone_hash, operator_code, operator_slug, status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  )
    .bind(
      row.orderId,
      row.idempotencyKey,
      row.requestFingerprint,
      row.packId,
      row.coins,
      row.amount,
      row.currency,
      row.phoneHash,
      row.operatorCode,
      row.operatorSlug,
      row.now,
      row.now,
    )
    .run();
}

async function handleConfiguration(env: Env, origin: string | null): Promise<Response> {
  const [country, operators] = await Promise.all([fetchCountry(env), fetchOperators(env)]);
  return successResponse({ country, operators }, 200, origin);
}

async function handleInitiation(
  request: Request,
  env: Env,
  origin: string | null,
  requestId: string,
): Promise<Response> {
  const input = parseInitiationInput(await readRequestJson(request, MAX_INITIATION_BODY_BYTES));
  const purchase = derivePurchase(input.packId, input.customCoins);
  const [country, operators] = await Promise.all([fetchCountry(env), fetchOperators(env)]);
  const operator = resolveOperator(operators, input.operator);
  const countryPrefix = country.prefix.replace(/\D/g, "");
  if (!countryPrefix || !input.phone.startsWith(countryPrefix)) {
    throw new HttpError(400, "Le numéro ne correspond pas au pays configuré.", "phone_country_mismatch");
  }
  if (operator.otpRequired && !input.otpCode) {
    throw new HttpError(400, "Un code OTP est requis pour cet opérateur.", "otp_required");
  }

  const [phoneHash, requestFingerprint] = await Promise.all([
    sha256Hex(input.phone),
    sha256Hex(
      JSON.stringify({
        packId: purchase.packId,
        coins: purchase.coins,
        amount: purchase.amount,
        phone: input.phone,
        operatorCode: operator.code,
        operatorSlug: operator.slug,
      }),
    ),
  ]);
  const existing = await findByIdempotencyKey(env, input.idempotencyKey);
  if (existing) {
    if (existing.request_fingerprint !== requestFingerprint) {
      throw new HttpError(
        409,
        "Cette clé d'idempotence est déjà associée à une autre demande.",
        "idempotency_conflict",
      );
    }
    return successResponse(paymentResponse(existing), 200, origin);
  }

  const orderId = `UPCOIN-SEB-${crypto.randomUUID()}`;
  const now = Date.now();
  try {
    await insertPendingPayment(env, {
      orderId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      packId: purchase.packId,
      coins: purchase.coins,
      amount: purchase.amount,
      currency: env.SEBPAY_CURRENCY,
      phoneHash,
      operatorCode: operator.code,
      operatorSlug: operator.slug,
      now,
    });
  } catch {
    const raced = await findByIdempotencyKey(env, input.idempotencyKey);
    if (raced) {
      if (raced.request_fingerprint !== requestFingerprint) {
        throw new HttpError(
          409,
          "Cette clé d'idempotence est déjà associée à une autre demande.",
          "idempotency_conflict",
        );
      }
      return successResponse(paymentResponse(raced), 200, origin);
    }
    throw new HttpError(500, "Impossible d'enregistrer la transaction.", "database_insert_failed");
  }

  const callbackUrl = `${new URL(request.url).origin}/v1/webhooks/sebpay`;
  const providerOperator = providerOperatorValue(env.SEBPAY_OPERATOR_FIELD, operator);
  try {
    const transaction = await createCollection(env, {
      amount: purchase.amount,
      currency: env.SEBPAY_CURRENCY,
      phone: input.phone,
      operator: providerOperator,
      country: env.SEBPAY_COUNTRY,
      externalReference: orderId,
      callbackUrl,
      ...(input.otpCode ? { otpCode: input.otpCode } : {}),
    });
    assertProviderReconciliation(transaction, {
      orderId,
      amount: purchase.amount,
      currency: env.SEBPAY_CURRENCY,
    });
    const status = normalizeProviderStatus(transaction.providerStatus);
    const providerUpdatedAt = transaction.updatedAt && Number.isFinite(Date.parse(transaction.updatedAt))
      ? new Date(Date.parse(transaction.updatedAt)).toISOString()
      : new Date().toISOString();
    await env.DB.prepare(
      `UPDATE sebpay_payments
          SET transaction_id = ?, status = ?, provider_status = ?, provider_link = ?,
              provider_updated_at = ?, updated_at = ?
        WHERE order_id = ? AND status = 'pending'`,
    )
      .bind(
        transaction.transactionId,
        status,
        transaction.providerStatus,
        transaction.providerLink,
        providerUpdatedAt,
        Date.now(),
        orderId,
      )
      .run();
  } catch (error) {
    if (error instanceof ProviderError) {
      structuredLog(error.retryable ? "warn" : "error", error.code, requestId, {
        retryable: error.retryable,
      });
      if (!error.retryable) {
        await env.DB.prepare(
          `UPDATE sebpay_payments
              SET status = 'rejected', updated_at = ?
            WHERE order_id = ? AND status = 'pending'`,
        )
          .bind(Date.now(), orderId)
          .run();
        throw new HttpError(502, "SebPay a refusé la demande de paiement.", error.code);
      }
    } else {
      throw error;
    }
  }

  const stored = await findByOrderId(env, orderId);
  if (!stored) {
    throw new HttpError(500, "Transaction introuvable après création.", "database_read_after_write_failed");
  }
  structuredLog("info", "sebpay_payment_created", requestId, { status: stored.status });
  return successResponse(paymentResponse(stored), 201, origin);
}

async function reconcilePendingPayment(
  env: Env,
  row: PaymentRow,
  requestId: string,
): Promise<PaymentRow> {
  const now = Date.now();
  const claim = await env.DB.prepare(
    `UPDATE sebpay_payments
        SET last_provider_check_at = ?
      WHERE order_id = ?
        AND status = 'pending'
        AND (last_provider_check_at IS NULL OR last_provider_check_at <= ?)`,
  )
    .bind(now, row.order_id, now - PROVIDER_CHECK_INTERVAL_MS)
    .run();
  if (claim.meta.changes !== 1) return row;

  try {
    const transaction = await getCollection(env, row.transaction_id ?? row.order_id);
    assertProviderReconciliation(transaction, {
      orderId: row.order_id,
      amount: row.amount,
      currency: row.currency,
      transactionId: row.transaction_id,
    });
    const status = normalizeProviderStatus(transaction.providerStatus);
    const providerUpdatedAt = transaction.updatedAt && Number.isFinite(Date.parse(transaction.updatedAt))
      ? new Date(Date.parse(transaction.updatedAt)).toISOString()
      : new Date().toISOString();
    await env.DB.prepare(
      `UPDATE sebpay_payments
          SET transaction_id = COALESCE(transaction_id, ?),
              status = ?, provider_status = ?, provider_link = ?,
              provider_updated_at = ?, updated_at = ?
        WHERE order_id = ?
          AND status = 'pending'
          AND (transaction_id IS NULL OR transaction_id = ?)`,
    )
      .bind(
        transaction.transactionId,
        status,
        transaction.providerStatus,
        transaction.providerLink,
        providerUpdatedAt,
        Date.now(),
        row.order_id,
        transaction.transactionId,
      )
      .run();
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : "provider_status_check_failed";
    structuredLog("warn", code, requestId, { retryable: error instanceof ProviderError && error.retryable });
  }
  return (await findByOrderId(env, row.order_id)) ?? row;
}

async function handlePaymentStatus(
  orderId: string,
  env: Env,
  origin: string | null,
  requestId: string,
): Promise<Response> {
  if (!ORDER_ID_PATTERN.test(orderId)) {
    throw new HttpError(400, "Identifiant de commande invalide.", "invalid_order_id");
  }
  const stored = await findByOrderId(env, orderId);
  if (!stored) throw new HttpError(404, "Transaction introuvable.", "payment_not_found");
  const current = stored.status === "pending"
    ? await reconcilePendingPayment(env, stored, requestId)
    : stored;
  return successResponse(paymentResponse(current), 200, origin);
}

async function handleWebhook(
  request: Request,
  env: Env,
  origin: string | null,
  requestId: string,
): Promise<Response> {
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "Content-Type application/json requis.", "unsupported_media_type");
  }
  const rawBody = await readBoundedBody(
    request.body,
    request.headers.get("Content-Length"),
    MAX_WEBHOOK_BODY_BYTES,
  );
  const signature = request.headers.get("X-SebPay-Signature")?.trim() ?? "";
  if (!(await verifyHmacSha256Hex(env.SEBPAY_SECRET_KEY, rawBody, signature))) {
    structuredLog("warn", "sebpay_webhook_invalid_signature", requestId);
    throw new HttpError(401, "Signature webhook invalide.", "invalid_webhook_signature");
  }
  const payload = parseWebhookPayload(parseJsonBytes(rawBody, "invalid_webhook_body"));
  const stored = await findByOrderId(env, payload.externalReference);
  if (!stored) {
    structuredLog("warn", "sebpay_webhook_unknown_reference", requestId);
    return successResponse({ received: true }, 200, origin);
  }

  const phoneHash = await sha256Hex(payload.customerPhone);
  const reconciled =
    payload.externalReference === stored.order_id &&
    payload.amount === stored.amount &&
    payload.currency === stored.currency &&
    phoneHash === stored.phone_hash &&
    (stored.transaction_id === null || stored.transaction_id === payload.transactionId);
  if (!reconciled) {
    structuredLog("error", "sebpay_webhook_reconciliation_failed", requestId);
    return successResponse({ received: true }, 200, origin);
  }
  if (!isMonotonicTransition(stored.status, payload.providerStatus)) {
    structuredLog("warn", "sebpay_webhook_non_monotonic", requestId);
    return successResponse({ received: true }, 200, origin);
  }

  await env.DB.prepare(
    `UPDATE sebpay_payments
        SET transaction_id = COALESCE(transaction_id, ?),
            status = ?, provider_status = ?, provider_updated_at = ?, updated_at = ?
      WHERE order_id = ?
        AND amount = ?
        AND currency = ?
        AND (transaction_id IS NULL OR transaction_id = ?)
        AND (status = 'pending' OR status = ?)
        AND (provider_updated_at IS NULL OR provider_updated_at <= ?)`,
  )
    .bind(
      payload.transactionId,
      payload.providerStatus,
      payload.providerStatus,
      payload.updatedAt,
      Date.now(),
      payload.externalReference,
      payload.amount,
      payload.currency,
      payload.transactionId,
      payload.providerStatus,
      payload.updatedAt,
    )
    .run();
  structuredLog("info", "sebpay_webhook_processed", requestId, { status: payload.providerStatus });
  return successResponse({ received: true }, 200, origin);
}

async function routeRequest(
  request: Request,
  env: Env,
  origin: string | null,
  requestId: string,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return successResponse({ status: "ok", service: "upcoin-sebpay" }, 200, origin);
  }
  if (request.method === "GET" && url.pathname === "/v1/sebpay/config") {
    return handleConfiguration(env, origin);
  }
  if (request.method === "POST" && url.pathname === "/v1/payments/sebpay") {
    return handleInitiation(request, env, origin, requestId);
  }
  if (request.method === "POST" && url.pathname === "/v1/webhooks/sebpay") {
    return handleWebhook(request, env, origin, requestId);
  }
  const statusPrefix = "/v1/payments/sebpay/";
  if (request.method === "GET" && url.pathname.startsWith(statusPrefix)) {
    let orderId: string;
    try {
      orderId = decodeURIComponent(url.pathname.slice(statusPrefix.length));
    } catch {
      throw new HttpError(400, "Identifiant de commande invalide.", "invalid_order_id");
    }
    return handlePaymentStatus(orderId, env, origin, requestId);
  }

  const knownPath =
    url.pathname === "/health" ||
    url.pathname === "/v1/sebpay/config" ||
    url.pathname === "/v1/payments/sebpay" ||
    url.pathname === "/v1/webhooks/sebpay" ||
    url.pathname.startsWith(statusPrefix);
  if (knownPath) {
    return jsonResponse(
      { success: false, message: "Méthode non autorisée.", code: "method_not_allowed" },
      405,
      origin,
      { Allow: "GET, POST, OPTIONS" },
    );
  }
  throw new HttpError(404, "Route introuvable.", "not_found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const requestOrigin = request.headers.get("Origin");
    const origin = allowedOrigin(request, env);
    try {
      validateRuntimeConfiguration(env);
      if (requestOrigin && !origin) {
        throw new HttpError(403, "Origine non autorisée.", "origin_not_allowed");
      }
      if (request.method === "OPTIONS") return handlePreflight(request, origin);
      return await routeRequest(request, env, origin, requestId);
    } catch (error) {
      if (error instanceof HttpError) {
        structuredLog(error.statusCode >= 500 ? "error" : "warn", error.code, requestId, {
          status: error.statusCode,
        });
        return errorResponse(error, origin);
      }
      if (error instanceof ProviderError) {
        structuredLog("error", error.code, requestId, { retryable: error.retryable });
        return errorResponse(
          new HttpError(502, "Le service SebPay est temporairement indisponible.", error.code),
          origin,
        );
      }
      structuredLog("error", "unhandled_error", requestId, { status: 500 });
      return errorResponse(
        new HttpError(500, "Erreur interne du service de paiement.", "internal_error"),
        origin,
      );
    }
  },
} satisfies ExportedHandler<Env>;
