/**
 * @file LINE 固有の処理（署名の検証、イベントの変換、会話の受け付け判定、Messaging API のクライアント）
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/
 */

import type { messagingApi, webhook } from "@line/bot-sdk";
import type { IncomingMessage } from "../agent/types";
import type { Config } from "../config";
import { decodeBase64, verifyHmacSha256 } from "./utils";

/**
 * Webhook の署名（`x-line-signature`）を検証する。署名はリクエストボディの HMAC-SHA256 を Base64 にしたもの
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/#signature-validation
 */
export const verifySignature = async (
  channelSecret: string,
  body: string,
  signature: string,
): Promise<boolean> => {
  const signatureBytes = decodeBase64(signature);
  return signatureBytes !== null && verifyHmacSha256(channelSecret, body, signatureBytes);
};

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

/**
 * 会話を受け付けるかどうかを判定する。受け付けるのは家族グループと、マスター・助手二号との DM だけ
 *
 * @see docs/phases/phase-1.md の「会話の受け付け判定」
 */
export const isAcceptedConversation = (
  conversation: IncomingMessage["conversation"],
  config: Pick<Config, "LINE_GROUP_ID_FAMILY" | "LINE_USER_ID_MASTER" | "LINE_USER_ID_ASSISTANT2">,
): boolean => {
  if (conversation.type === "group") {
    return conversation.platformConversationId === config.LINE_GROUP_ID_FAMILY;
  }
  return [config.LINE_USER_ID_MASTER, config.LINE_USER_ID_ASSISTANT2].includes(
    conversation.platformConversationId,
  );
};

const API_BASE_URL = "https://api.line.me/v2/bot";

export type LineClient = ReturnType<typeof createLineClient>;

export const createLineClient = (channelAccessToken: string) => {
  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`LINE API ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res;
  };

  return {
    /** Reply API でテキストを送る */
    reply: async (replyToken: string, text: string): Promise<void> => {
      await request("/message/reply", {
        method: "POST",
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text }],
        } satisfies messagingApi.ReplyMessageRequest),
      });
    },
  };
};
