/**
 * @file 特定のプラットフォームや機能に依存しない、汎用の処理
 */

const encoder = new TextEncoder();

/** Base64 の文字列をバイト列に変換する。Base64 として読めなければ null を返す */
export const decodeBase64 = (base64: string): Uint8Array<ArrayBuffer> | null => {
  try {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

/** data の HMAC-SHA256 が signature と一致するかを検証する */
export const verifyHmacSha256 = async (
  secret: string,
  data: string,
  signature: Uint8Array<ArrayBuffer>,
): Promise<boolean> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // subtle.verify は比較にかかる時間が署名の内容に左右されない
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));
};
