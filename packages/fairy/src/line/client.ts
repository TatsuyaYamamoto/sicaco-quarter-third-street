/**
 * @file LINE Messaging API のクライアント
 *
 * @see https://developers.line.biz/ja/reference/messaging-api/
 */

import type { messagingApi } from "@line/bot-sdk";
import type { IncomingMessage } from "../agent/types";

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

    /** 発言者のプロフィールを取得する。グループではグループメンバーのプロフィールを取得する */
    getProfile: async (
      conversation: IncomingMessage["conversation"],
      userId: string,
    ): Promise<{ displayName: string }> => {
      const path =
        conversation.type === "group"
          ? `/group/${conversation.platformConversationId}/member/${userId}`
          : `/profile/${userId}`;
      const res = await request(path);
      const { displayName } = await res.json<
        messagingApi.UserProfileResponse | messagingApi.GroupUserProfileResponse
      >();
      return { displayName };
    },
  };
};
