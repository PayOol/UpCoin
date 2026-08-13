import type { PaymentStatus } from "./contracts";

const APPROVED = new Set(["approved", "success", "successful", "completed"]);
const REJECTED = new Set([
  "rejected",
  "failed",
  "failure",
  "cancelled",
  "canceled",
  "declined",
  "expired",
  "error",
]);

export function normalizeProviderStatus(providerStatus: string): PaymentStatus {
  const normalized = providerStatus.trim().toLowerCase();
  if (APPROVED.has(normalized)) return "approved";
  if (REJECTED.has(normalized)) return "rejected";
  return "pending";
}

export function isMonotonicTransition(
  current: PaymentStatus,
  incoming: PaymentStatus,
): boolean {
  return current === "pending" || current === incoming;
}
