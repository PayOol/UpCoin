import { describe, expect, it } from "vitest";
import { derivePurchase, parseInitiationInput } from "../src/contracts";

describe("catalogue serveur", () => {
  it.each([
    ["mini", 100, 1_124],
    ["starter", 350, 3_900],
    ["boost", 770, 7_900],
    ["live", 1_540, 15_700],
    ["creator", 3_850, 39_300],
    ["max", 7_700, 78_700],
  ] as const)("dérive %s sans donnée de prix cliente", (packId, coins, amount) => {
    expect(derivePurchase(packId)).toEqual({ packId, coins, amount });
  });

  it("calcule le tarif personnalisé et applique ses bornes", () => {
    expect(derivePurchase("custom", 70)).toEqual({ packId: "custom", coins: 70, amount: 787 });
    expect(derivePurchase("custom", 1_000_000).amount).toBe(11_240_000);
    expect(() => derivePurchase("custom", 69)).toThrow();
    expect(() => derivePurchase("custom", 1_000_001)).toThrow();
  });
});

describe("contrat d'initiation", () => {
  it("accepte le contrat minimal", () => {
    expect(
      parseInitiationInput({
        idempotencyKey: "9d358771-ea5e-48e3-9588-e3c68fca504f",
        packId: "mini",
        phone: "237690000000",
        operator: "MTN_CM",
      }),
    ).toMatchObject({ packId: "mini", phone: "237690000000" });
  });

  it("rejette prix client, + téléphonique et customCoins hors custom", () => {
    expect(() =>
      parseInitiationInput({
        idempotencyKey: "9d358771-ea5e-48e3-9588-e3c68fca504f",
        packId: "mini",
        phone: "+237690000000",
        operator: "mtn",
        amount: 1,
      }),
    ).toThrow();
    expect(() =>
      parseInitiationInput({
        idempotencyKey: "9d358771-ea5e-48e3-9588-e3c68fca504f",
        packId: "mini",
        customCoins: 70,
        phone: "237690000000",
        operator: "mtn",
      }),
    ).toThrow();
  });
});
