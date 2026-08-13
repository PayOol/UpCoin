const encoder = new TextEncoder();

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    const pair = hex.slice(index * 2, index * 2 + 2);
    const byte = Number.parseInt(pair, 16);
    if (!Number.isFinite(byte)) return null;
    bytes[index] = byte;
  }
  return bytes;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function computeHmacSha256(
  secret: string,
  body: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, body);
  return new Uint8Array(signature);
}

export async function computeHmacSha256Hex(
  secret: string,
  body: Uint8Array,
): Promise<string> {
  return bytesToHex(await computeHmacSha256(secret, body));
}

export async function verifyHmacSha256Hex(
  secret: string,
  body: Uint8Array,
  providedHex: string,
): Promise<boolean> {
  const expected = await computeHmacSha256(secret, body);
  const provided = hexToBytes(providedHex);
  const comparison = provided ?? new Uint8Array(32);
  const matches = crypto.subtle.timingSafeEqual(expected, comparison);
  return matches && provided !== null;
}
