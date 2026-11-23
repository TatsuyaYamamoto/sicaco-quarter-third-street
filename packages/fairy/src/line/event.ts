/**
 * @file Webhook のイベントの解釈と、IncomingMessage への変換
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
 */

import type { webhook } from "@line/bot-sdk";
import type { IncomingMessage } from "../agent/types";

/** Fairy が扱うメッセージイベント。テキストかスタンプで、返信に使う replyToken がある */
export type LineMessageEvent = webhook.MessageEvent & {
  replyToken: string;
  message: webhook.TextMessageContent | webhook.StickerMessageContent;
};

/**
 * Fairy が扱うメッセージイベントかどうかを判定する
 *
 * 扱うのはテキストとスタンプのメッセージイベントだけ（docs/phases/phase-1.md の「LINE 受け口モジュールの処理フロー」）
 */
export const isLineMessageEvent = (event: webhook.Event): event is LineMessageEvent =>
  event.type === "message" &&
  event.replyToken !== undefined &&
  (event.message.type === "text" || event.message.type === "sticker");

/** メッセージイベントを IncomingMessage に変換する。発言者や会話が分からないイベントなら null を返す */
export const toIncomingMessage = (event: LineMessageEvent): IncomingMessage | null => {
  const { source, message } = event;
  if (source === undefined || source.type === "room" || source.userId === undefined) {
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
