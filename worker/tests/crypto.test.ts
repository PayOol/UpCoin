import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { computeHmacSha256Hex, verifyHmacSha256Hex } from "../src/crypto";

beforeAll(() => {
  Object.defineProperty(webcrypto.subtle, "timingSafeEqual", {
    configurable: true,
    value: (left: ArrayBuffer | ArrayBufferView, right: ArrayBuffer | ArrayBufferView): boolean => {
      const leftBytes = ArrayBuffer.isView(left)
        ? new Uint8Array(left.buffer, left.byteOffset, left.byteLength)
        : new Uint8Array(left);
      const rightBytes = ArrayBuffer.isView(right)
        ? new Uint8Array(right.buffer, right.byteOffset, right.byteLength)
        : new Uint8Array(right);
      if (leftBytes.byteLength !== rightBytes.byteLength) return false;
      let difference = 0;
      for (let index = 0; index < leftBytes.byteLength; index += 1) {
        difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
      }
      return difference === 0;
    },
  });
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
});

describe("signature webhook HMAC-SHA256", () => {
  const body = new TextEncoder().encode('{"status":"approved"}');

  it("correspond au vecteur connu", async () => {
    await expect(computeHmacSha256Hex("secret", body)).resolves.toBe(
      "c36f73380f5b1a34ff25d4dc81623ec800dc46817a3cdb42b166aaa9f7ef3db8",
    );
  });

  it("accepte seulement les 32 octets exacts en hexadécimal", async () => {
    const valid = await computeHmacSha256Hex("secret", body);
    await expect(verifyHmacSha256Hex("secret", body, valid)).resolves.toBe(true);
    await expect(verifyHmacSha256Hex("secret", body, valid.replace(/^./, "0"))).resolves.toBe(false);
    await expect(verifyHmacSha256Hex("secret", body, "not-hex")).resolves.toBe(false);
  });
});
