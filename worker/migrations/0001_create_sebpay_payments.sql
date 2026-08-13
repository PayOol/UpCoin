CREATE TABLE sebpay_payments (
  order_id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  pack_id TEXT NOT NULL CHECK (pack_id IN ('mini', 'starter', 'boost', 'live', 'creator', 'max', 'custom')),
  coins INTEGER NOT NULL CHECK (coins >= 70 AND coins <= 1000000),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  operator_code TEXT NOT NULL,
  operator_slug TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  provider_status TEXT,
  provider_link TEXT,
  provider_updated_at TEXT,
  last_provider_check_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX idx_sebpay_payments_status_check
  ON sebpay_payments (status, last_provider_check_at);

CREATE INDEX idx_sebpay_payments_transaction
  ON sebpay_payments (transaction_id);
