export const PACK_IDS = [
  "mini",
  "starter",
  "boost",
  "live",
  "creator",
  "max",
  "custom",
] as const;

export type PackId = (typeof PACK_IDS)[number];
export type PaymentStatus = "pending" | "approved" | "rejected";

export type Purchase = {
  packId: PackId;
  coins: number;
  amount: number;
};

export type PaymentResponse = {
  orderId: string;
  transactionId: string | null;
  status: PaymentStatus;
  providerStatus: string | null;
  providerLink: string | null;
};

export type SebPayOperator = {
  name: string;
  code: string;
  slug: string;
  otpRequired: boolean;
  ussdCode: string | null;
};

export type SebPayCountry = {
  code: string;
  name: string;
  prefix: string;
  currency: string;
};

export type InitiationInput = {
  idempotencyKey: string;
  packId: PackId;
  customCoins?: number;
  phone: string;
  operator: string;
  otpCode?: string;
};

export type WebhookPayload = {
  transactionId: string;
  externalReference: string;
  providerStatus: "pending" | "approved" | "rejected";
  amount: number;
  currency: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRow = {
  order_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  pack_id: string;
  coins: number;
  amount: number;
  currency: string;
  phone_hash: string;
  operator_code: string;
  operator_slug: string;
  transaction_id: string | null;
  status: PaymentStatus;
  provider_status: string | null;
  provider_link: string | null;
  provider_updated_at: string | null;
  last_provider_check_at: number | null;
  created_at: number;
  updated_at: number;
};

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly publicMessage: string,
    readonly code: string,
  ) {
    super(code);
    this.name = "HttpError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRequiredString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean.length > 0 && clean.length <= maximumLength ? clean : null;
}

export function readOptionalString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return readRequiredString(value, maximumLength);
}

export function isPackId(value: unknown): value is PackId {
  return typeof value === "string" && PACK_IDS.some((packId) => packId === value);
}

export function derivePurchase(packId: PackId, customCoins?: number): Purchase {
  const catalog: Record<Exclude<PackId, "custom">, Purchase> = {
    mini: { packId: "mini", coins: 100, amount: 1_124 },
    starter: { packId: "starter", coins: 350, amount: 3_900 },
    boost: { packId: "boost", coins: 770, amount: 7_900 },
    live: { packId: "live", coins: 1_540, amount: 15_700 },
    creator: { packId: "creator", coins: 3_850, amount: 39_300 },
    max: { packId: "max", coins: 7_700, amount: 78_700 },
  };

  if (packId !== "custom") return catalog[packId];
  if (
    customCoins === undefined ||
    !Number.isSafeInteger(customCoins) ||
    customCoins < 70 ||
    customCoins > 1_000_000
  ) {
    throw new HttpError(
      400,
      "Le nombre de pièces personnalisé doit être un entier entre 70 et 1 000 000.",
      "invalid_custom_coins",
    );
  }

  return {
    packId,
    coins: customCoins,
    amount: Math.round(customCoins * 11.24),
  };
}

export function parseInitiationInput(value: unknown): InitiationInput {
  if (!isRecord(value)) {
    throw new HttpError(400, "Corps JSON invalide.", "invalid_json_body");
  }

  const allowedFields = new Set([
    "idempotencyKey",
    "packId",
    "customCoins",
    "phone",
    "operator",
    "otpCode",
  ]);
  if (Object.keys(value).some((key) => !allowedFields.has(key))) {
    throw new HttpError(400, "La requête contient un champ inconnu.", "unknown_field");
  }

  const idempotencyKey = readRequiredString(value.idempotencyKey, 36);
  const phone = readRequiredString(value.phone, 15);
  const operator = readRequiredString(value.operator, 100);
  const otpCode = readOptionalString(value.otpCode, 12);

  if (
    !idempotencyKey ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey,
    )
  ) {
    throw new HttpError(400, "La clé d'idempotence doit être un UUID valide.", "invalid_idempotency_key");
  }
  if (!isPackId(value.packId)) {
    throw new HttpError(400, "Pack inconnu.", "invalid_pack");
  }
  if (value.packId === "custom" && value.customCoins === undefined) {
    throw new HttpError(400, "customCoins est requis pour un pack personnalisé.", "missing_custom_coins");
  }
  if (value.packId !== "custom" && value.customCoins !== undefined) {
    throw new HttpError(400, "customCoins est réservé au pack personnalisé.", "unexpected_custom_coins");
  }
  if (!phone || !/^[1-9][0-9]{7,14}$/.test(phone)) {
    throw new HttpError(
      400,
      "Le téléphone doit être au format international, en chiffres et sans +.",
      "invalid_phone",
    );
  }
  if (!operator || !/^[A-Za-z0-9_-]+$/.test(operator)) {
    throw new HttpError(400, "Opérateur invalide.", "invalid_operator");
  }
  if (value.otpCode !== undefined && (!otpCode || !/^[0-9]{4,12}$/.test(otpCode))) {
    throw new HttpError(400, "Le code OTP est invalide.", "invalid_otp");
  }

  const parsed: InitiationInput = {
    idempotencyKey: idempotencyKey.toLowerCase(),
    packId: value.packId,
    phone,
    operator,
  };
  if (value.customCoins !== undefined) {
    if (typeof value.customCoins !== "number") {
      throw new HttpError(400, "customCoins doit être un nombre.", "invalid_custom_coins");
    }
    parsed.customCoins = value.customCoins;
  }
  if (otpCode) parsed.otpCode = otpCode;
  return parsed;
}

export function parseWebhookPayload(value: unknown): WebhookPayload {
  if (!isRecord(value)) {
    throw new HttpError(400, "Payload webhook invalide.", "invalid_webhook_body");
  }

  const transactionId = readRequiredString(value.transaction_id, 180);
  const externalReference = readRequiredString(value.external_reference, 120);
  const customerPhone = readRequiredString(value.customer_phone, 15);
  const createdAt = readRequiredString(value.created_at, 64);
  const updatedAt = readRequiredString(value.updated_at, 64);
  const currency = readRequiredString(value.currency, 8);
  const status = value.status;
  const amount = value.amount;

  if (!transactionId || !externalReference) {
    throw new HttpError(400, "Identifiants webhook invalides.", "invalid_webhook_identifiers");
  }
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    throw new HttpError(400, "Statut webhook invalide.", "invalid_webhook_status");
  }
  if (!Number.isSafeInteger(amount) || typeof amount !== "number" || amount <= 0) {
    throw new HttpError(400, "Montant webhook invalide.", "invalid_webhook_amount");
  }
  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    throw new HttpError(400, "Devise webhook invalide.", "invalid_webhook_currency");
  }
  if (!customerPhone || !/^[1-9][0-9]{7,14}$/.test(customerPhone)) {
    throw new HttpError(400, "Téléphone webhook invalide.", "invalid_webhook_phone");
  }
  const createdTimestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  const updatedTimestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  if (
    !createdAt ||
    !updatedAt ||
    !Number.isFinite(createdTimestamp) ||
    !Number.isFinite(updatedTimestamp) ||
    createdTimestamp > updatedTimestamp
  ) {
    throw new HttpError(400, "Dates webhook invalides.", "invalid_webhook_dates");
  }

  return {
    transactionId,
    externalReference,
    providerStatus: status,
    amount,
    currency,
    customerPhone,
    createdAt: new Date(createdTimestamp).toISOString(),
    updatedAt: new Date(updatedTimestamp).toISOString(),
  };
}

export function paymentResponse(row: PaymentRow): PaymentResponse {
  return {
    orderId: row.order_id,
    transactionId: row.transaction_id,
    status: row.status,
    providerStatus: row.provider_status,
    providerLink: row.provider_link,
  };
}
