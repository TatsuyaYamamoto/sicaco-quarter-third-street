/**
 * @file LINE の Webhook のテストで使うヘルパー
 */

import { env } from "cloudflare:test";

export const testConfig = {
  LINE_CHANNEL_SECRET: "test-channel-secret",
  LINE_CHANNEL_ACCESS_TOKEN: "test-access-token",
  OPENAI_API_KEY: "sk-test",
  LINE_USER_ID_MASTER: "Umaster",
  LINE_USER_ID_ASSISTANT2: "Uassistant2",
  LINE_GROUP_ID_FAMILY: "Cfamily",
};

/** wrangler.jsonc の vars に、テスト用の secrets を足した env */
export const testEnv = { ...env, ...testConfig } satisfies Env;

/** Webhook の署名を作る */
export const sign = async (body: string, secret = testConfig.LINE_CHANNEL_SECRET) => {
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
