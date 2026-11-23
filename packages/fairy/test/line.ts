/**
 * @file LINE の Webhook のテストで使うヘルパー
 */

import { testSecrets } from "./secrets";

/** Webhook の署名を作る */
export const sign = async (
  body: string,
  secret: string = testSecrets.LINE_CHANNEL_SECRET,
): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return btoa(String.fromCharCode(...mac));
};

/** テキストのメッセージイベント */
export const textEvent = (
  source: Record<string, string>,
  text = "こんにちは",
  id = "100",
): Record<string, unknown> => ({
  type: "message",
  mode: "active",
  timestamp: 1_795_000_000_000,
  source,
  webhookEventId: `event-${id}`,
  deliveryContext: { isRedelivery: false },
  replyToken: `reply-${id}`,
  message: { type: "text", id, quoteToken: "q", text },
});
