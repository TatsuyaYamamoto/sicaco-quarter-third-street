import { type WebhookRequestBody, messagingApi } from "@line/bot-sdk";
import { registerApiRoute } from "@mastra/core/server";

import { LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN } from "../../env";
import { lineSignatureMiddleware } from "../middlewares/lineSignature";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN as string,
});

export default registerApiRoute("/agents/fairy/line/webhook", {
  method: "POST",
  middleware: [lineSignatureMiddleware],
  handler: async (c) => {
    const fairy = c.get("mastra").getAgent("fairy");
    const webhookBody = await c.req.json<WebhookRequestBody>();

    let replyToken;
    const inputs: string[] = [];

    for (const event of webhookBody.events) {
      if (event.type === "message" && event.message.type === "text") {
        replyToken = event.replyToken;
        return JSON.stringify({
          source: "LINE",
          text: event.message.text,
          timestamp: event.timestamp,
        });
      }
    }

    if (!replyToken) {
      return new Response("OK");
    }

    const generated = await fairy.generate(inputs, {});

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

    for (const text of replyTexts) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            sender: { name: "Fairy" },
            type: "text",
            text,
          },
        ],
      });
    }

    return new Response("OK");
  },
});
