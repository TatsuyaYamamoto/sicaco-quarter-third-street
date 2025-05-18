import { messagingApi, type WebhookRequestBody } from "@line/bot-sdk";
import { registerApiRoute } from "@mastra/core/server";

import { LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN } from "../../env";
import { lineSignatureMiddleware } from "../middlewares/lineSignature";

const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN as string,
});

const LINE_SENDER_NAME = "Fairy";

export default registerApiRoute("/agents/fairy/line/webhook", {
  method: "POST",
  middleware: [lineSignatureMiddleware],
  handler: async (c) => {
    const fairy = c.get("mastra").getAgent("fairy");
    const json = await c.req.json<WebhookRequestBody>();

    let replyToken: string | null = null;
    const inputTexts: string[] = [];

    for (const event of json.events) {
      if (event.type === "message" && event.message.type === "text") {
        replyToken = event.replyToken;
        inputTexts.push(event.message.text);
      }
    }

    if (inputTexts.length === 0 || !replyToken) {
      return new Response("OK");
    }

    /**
     * LINE Messaging API webhook should be processed asynchronously.
     * @see https://developers.line.biz/en/docs/messaging-api/receiving-messages/#page-title
     *
     * Return a response to Webhook and continue a process, generate and reply, with `event.waitUntil()`.
     * @see https://developers.cloudflare.com/workers/platform/limits/#duration
     */
    c.executionCtx.waitUntil(
      (async () => {
        const generated = await fairy.generate(inputTexts);

        const replyTexts = generated.response.messages.flatMap((message) => {
          if (message.role !== "assistant") {
            return [];
          }

          if (typeof message.content === "string") {
            return message.content;
          }

          return message.content.flatMap((part) => {
            return part.type === "text" ? part.text : [];
          });
        });

        await lineClient.replyMessage({
          replyToken,
          messages: replyTexts.map((text) => ({
            sender: { name: LINE_SENDER_NAME },
            type: "text",
            text,
          })),
        });
      })(),
    );

    return new Response("OK");
  },
});
