/**
 * @file /webhook 配下のエンドポイント。プラットフォームから届く Webhook の受け口
 */

import type { webhook } from "@line/bot-sdk";
import { Hono } from "hono";
import { dispatchMessageToAgent } from "../agent/dispatch";
import { loadConfig } from "../config";
import {
  createLineClient,
  isAcceptedConversation,
  isLineMessageEvent,
  toIncomingMessage,
  verifySignature,
} from "../helpers/line";

export const webhookRoutes = new Hono<{ Bindings: Env }>().post(
  /**
   * LINE の Webhook
   *
   * @see docs/phases/phase-1.md の「LINE 受け口モジュールの処理フロー」
   */
  "/line",
  async (c) => {
    const config = loadConfig(c.env);
    const body = await c.req.text();
    const signature = c.req.header("x-line-signature") ?? "";
    if (!(await verifySignature(config.LINE_CHANNEL_SECRET, body, signature))) {
      return c.text("invalid signature", 401);
    }

    // 署名を検証したので、LINE から届いた内容として型を信頼する
    const { events } = JSON.parse(body) as webhook.CallbackRequest;
    const client = createLineClient(config.LINE_CHANNEL_ACCESS_TOKEN);

    const handleEvent = async (event: webhook.Event): Promise<void> => {
      if (!isLineMessageEvent(event)) {
        return;
      }
      const message = toIncomingMessage(event);
      if (!message || !isAcceptedConversation(message.conversation, config)) {
        return;
      }
      const reply = await dispatchMessageToAgent(c.env, message);
      if (reply) {
        await client.reply(event.replyToken, reply.text);
      }
    };

    // LINE には先に 200 を返し、イベントの処理はレスポンスのあとに続ける
    c.executionCtx.waitUntil(
      Promise.allSettled(events.map(handleEvent)).then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            console.error("failed to handle LINE webhook event", result.reason);
          }
        }
      }),
    );
    return c.body(null, 200);
  },
);
