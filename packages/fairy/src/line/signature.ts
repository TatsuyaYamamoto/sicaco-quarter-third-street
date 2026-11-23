const encoder = new TextEncoder();

/**
 * Webhook の署名（`x-line-signature`）を検証する。署名はリクエストボディの HMAC-SHA256 を Base64 にしたもの
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/#signature-validation
 */
export const verifySignature = async (
  channelSecret: string,
  body: string,
  signature: string,
): Promise<boolean> => {
  let signatureBytes: Uint8Array<ArrayBuffer>;
  try {
    signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // subtle.verify は比較にかかる時間が署名の内容に左右されない
  return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(body));
};
