import { HttpError } from "./contracts";

const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  contentLength: string | null,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      throw new HttpError(400, "En-tête Content-Length invalide.", "invalid_content_length");
    }
    if (declaredLength > maximumBytes) {
      throw new HttpError(413, "Corps de requête trop volumineux.", "body_too_large");
    }
  }
  if (body === null) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalLength += result.value.byteLength;
      if (totalLength > maximumBytes) {
        await reader.cancel("body_too_large");
        throw new HttpError(413, "Corps de requête trop volumineux.", "body_too_large");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function parseJsonBytes(bytes: Uint8Array, errorCode: string): unknown {
  try {
    return JSON.parse(textDecoder.decode(bytes));
  } catch {
    throw new HttpError(400, "Corps JSON invalide.", errorCode);
  }
}

export async function readRequestJson(request: Request, maximumBytes: number): Promise<unknown> {
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "Content-Type application/json requis.", "unsupported_media_type");
  }
  const bytes = await readBoundedBody(
    request.body,
    request.headers.get("Content-Length"),
    maximumBytes,
  );
  if (bytes.byteLength === 0) {
    throw new HttpError(400, "Corps JSON requis.", "missing_json_body");
  }
  return parseJsonBytes(bytes, "invalid_json_body");
}
