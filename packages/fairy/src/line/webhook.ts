/**
 * @file LINE の Webhook の受け口
 *
 * @see docs/phases/phase-1.md の「LINE 受け口モジュールの処理フロー」
 */

import { Hono } from "hono";
import type { DispatchMessage } from "../agent/types";
import { loadConfig } from "../config";
import { isAcceptedConversation } from "./acceptance";
import { createLineClient, type LineClient } from "./client";
import { parseMessageEvent, toIncomingMessage, webhookBodySchema } from "./event";
import { verifySignature } from "./signature";

type Dependencies = {
  /** 受け付けたメッセージを Agent に渡す */
  dispatch: DispatchMessage;
  /** テストで差し替えるためのもの。省略すると Channel Access Token でクライアントを作る */
  createClient?: (channelAccessToken: string) => Pick<LineClient, "reply">;
};

export const createLineWebhook = ({ dispatch, createClient = createLineClient }: Dependencies) =>
  new Hono<{ Bindings: Env }>().post("/", async (c) => {
    const config = loadConfig(c.env);
    const body = await c.req.text();
    const signature = c.req.header("x-line-signature") ?? "";
    if (!(await verifySignature(config.LINE_CHANNEL_SECRET, body, signature))) {
      return c.text("invalid signature", 401);
    }

    const { events } = webhookBodySchema.parse(JSON.parse(body));
    const client = createClient(config.LINE_CHANNEL_ACCESS_TOKEN);

    const handleEvent = async (rawEvent: unknown): Promise<void> => {
      const event = parseMessageEvent(rawEvent);
      const message = event && toIncomingMessage(event);
      if (!event || !message || !isAcceptedConversation(message.conversation, config)) {
        return;
      }
      const reply = await dispatch(message);
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
  });
