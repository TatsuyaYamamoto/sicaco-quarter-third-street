/**
 * @file Webhook のイベントの解釈と、IncomingMessage への変換
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
 */

import { z } from "zod";
import type { IncomingMessage } from "../agent/types";

const sourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), userId: z.string() }),
  // グループ・複数人トークでは、userId が含まれないことがある
  z.object({ type: z.literal("group"), groupId: z.string(), userId: z.string().optional() }),
  z.object({ type: z.literal("room"), roomId: z.string(), userId: z.string().optional() }),
]);

export type LineSource = z.infer<typeof sourceSchema>;

const messageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), id: z.string(), text: z.string() }),
  z.object({
    type: z.literal("sticker"),
    id: z.string(),
    packageId: z.string(),
    stickerId: z.string(),
    keywords: z.array(z.string()).optional(),
  }),
]);

const messageEventSchema = z.object({
  type: z.literal("message"),
  timestamp: z.number(),
  source: sourceSchema,
  replyToken: z.string(),
  message: messageSchema,
});

export type LineMessageEvent = z.infer<typeof messageEventSchema>;

/** Webhook のリクエストボディ。イベントの中身は 1 件ずつ {@link parseMessageEvent} で解釈する */
export const webhookBodySchema = z.object({
  events: z.array(z.unknown()),
});

/**
 * イベントを、Fairy が扱うメッセージイベントとして解釈する。扱わないイベントなら null を返す
 *
 * 扱うのはテキストとスタンプのメッセージイベントだけ（docs/phases/phase-1.md の「LINE 受け口モジュールの処理フロー」）
 */
export const parseMessageEvent = (event: unknown): LineMessageEvent | null => {
  const result = messageEventSchema.safeParse(event);
  return result.success ? result.data : null;
};

/** メッセージイベントを IncomingMessage に変換する。発言者や会話が分からないイベントなら null を返す */
export const toIncomingMessage = (event: LineMessageEvent): IncomingMessage | null => {
  const { source, message } = event;
  if (source.type === "room" || source.userId === undefined) {
    return null;
  }
  return {
    platform: "line",
    conversation:
      source.type === "group"
        ? { platformConversationId: source.groupId, type: "group" }
        : { platformConversationId: source.userId, type: "dm" },
    sender: { platformUserId: source.userId },
    message: {
      platformMessageId: message.id,
      type: message.type,
      text:
        message.type === "text"
          ? message.text
          : message.keywords?.length
            ? message.keywords.join(", ")
            : null,
      payloadJson: JSON.stringify(event),
    },
    sentAt: new Date(event.timestamp).toISOString(),
  };
};
