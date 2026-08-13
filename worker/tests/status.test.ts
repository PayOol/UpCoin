import { describe, expect, it } from "vitest";
import { isMonotonicTransition, normalizeProviderStatus } from "../src/status";

describe("normalisation des statuts", () => {
  it.each([
    ["pending", "pending"],
    ["PENDING", "pending"],
    ["approved", "approved"],
    ["SUCCESS", "approved"],
    ["COMPLETED", "approved"],
    ["rejected", "rejected"],
    ["FAILED", "rejected"],
    ["expired", "rejected"],
    ["provider-new-state", "pending"],
  ] as const)("mappe %s vers %s", (provider, expected) => {
    expect(normalizeProviderStatus(provider)).toBe(expected);
  });

  it("autorise une finalisation mais jamais une régression ou un changement de final", () => {
    expect(isMonotonicTransition("pending", "approved")).toBe(true);
    expect(isMonotonicTransition("pending", "rejected")).toBe(true);
    expect(isMonotonicTransition("approved", "approved")).toBe(true);
    expect(isMonotonicTransition("approved", "pending")).toBe(false);
    expect(isMonotonicTransition("approved", "rejected")).toBe(false);
    expect(isMonotonicTransition("rejected", "approved")).toBe(false);
  });
});
