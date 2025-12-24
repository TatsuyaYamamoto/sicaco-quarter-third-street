import {
  messagingApi,
  type Sender,
  type WebhookRequestBody,
} from "@line/bot-sdk";
import { registerApiRoute } from "@mastra/core/server";

import { LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN } from "../../env";
import { lineSignatureMiddleware } from "../middlewares/lineSignature";

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN,
});

const REPLY_SENDER = {
  name: "Fairy",
  iconUrl: "https://sicaco-3rd.t28.workers.dev/openmoji-org-1F9FF.png",
} as const satisfies Sender;

export default registerApiRoute("/agents/fairy/line/webhook", {
  method: "POST",
  middleware: [lineSignatureMiddleware],
  handler: async (c) => {
    const fairy = c.get("mastra").getAgent("fairy");
    const json = await c.req.json<WebhookRequestBody>();

    const inputsForAgent = json.events.flatMap((event) => {
      // Events other than `MessageEvent` also have `replayToken`,
      // and there are messages other than text type.
      // However, currently, what Fairy can do is limited... 🥺
      if (event.type !== "message" || event.message.type !== "text") {
        return [];
      }

      const userId = event.source.userId;

      // "An empty userId" means the uesr has not agreed to Official Account terms, so a response should not be sent.
      if (!userId) {
        return [];
      }

      const groupId =
        event.source.type === "group" ? event.source.groupId : null;
      const roomId = event.source.type === "room" ? event.source.roomId : null;

      // In most cases, it's `groupId`, but just to be safe, fallback to `roomId`.
      // > LINEバージョン10.17.0以降、複数人トークはグループトークに統合されました。
      // https://developers.line.biz/ja/docs/messaging-api/group-chats/#group-chat-types
      const chatId = groupId ?? roomId ?? userId;
      const thread = `line:${event.source.type}:${chatId}` as const;

      return {
        input: event.message.text,
        thread,
        chatId,
        replyToken: event.replyToken,
      };
    });

    /**
     * LINE Messaging API webhook should be processed asynchronously.
     * @see https://developers.line.biz/en/docs/messaging-api/receiving-messages/#page-title
     *
     * Return a response to Webhook and continue a process, generate and reply, with `event.waitUntil()`.
     * @see https://developers.cloudflare.com/workers/platform/limits/#duration
     */
    c.executionCtx.waitUntil(
      (() => {
        const promises = inputsForAgent.map(
          async ({ input, thread, chatId, replyToken }) => {
            if (thread === `line:user:${chatId}`) {
              void lineClient.showLoadingAnimation({
                chatId,
              });
            }

            const generated = await fairy.generate(input, {
              memory: {
                thread,
                resource: "fairy",
              },
            });

            const replyTexts = generated.response.messages.flatMap(
              (message) => {
                if (message.role !== "assistant") {
                  return [];
                }

                if (typeof message.content === "string") {
                  return message.content;
                }

                return message.content.flatMap((part) => {
                  return part.type === "text" ? part.text : [];
                });
              },
            );

            await lineClient.replyMessage({
              replyToken,
              messages: replyTexts.map((text) => ({
                sender: REPLY_SENDER,
                type: "text",
                text,
              })),
            });
          },
        );

        return Promise.all(promises);
      })(),
    );

    return new Response("OK");
  },
});
