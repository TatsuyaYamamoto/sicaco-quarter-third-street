import { describe, expect, it } from "vitest";
import { textEvent } from "../../test/line";
import { parseMessageEvent, toIncomingMessage } from "./event";

const toMessage = (event: unknown) => {
  const parsed = parseMessageEvent(event);
  return parsed && toIncomingMessage(parsed);
};

describe("parseMessageEvent / toIncomingMessage", () => {
  it("グループのテキストメッセージを変換する", () => {
    const message = toMessage(textEvent({ type: "group", groupId: "C1", userId: "U1" }));
    expect(message).toMatchObject({
      platform: "line",
      conversation: { platformConversationId: "C1", type: "group" },
      sender: { platformUserId: "U1" },
      message: { platformMessageId: "100", type: "text", text: "こんにちは" },
      sentAt: "2026-11-18T11:06:40.000Z",
    });
  });

  it("DM の会話の ID は相手の userId", () => {
    const message = toMessage(textEvent({ type: "user", userId: "U1" }));
    expect(message?.conversation).toEqual({ platformConversationId: "U1", type: "dm" });
  });

  it("スタンプはキーワードを本文にする", () => {
    const event = {
      ...textEvent({ type: "user", userId: "U1" }),
      message: {
        type: "sticker",
        id: "1",
        packageId: "p",
        stickerId: "s",
        keywords: ["OK", "了解"],
      },
    };
    expect(toMessage(event)?.message).toMatchObject({ type: "sticker", text: "OK, 了解" });
  });

  it("キーワードのないスタンプは本文を null にする", () => {
    const event = {
      ...textEvent({ type: "user", userId: "U1" }),
      message: { type: "sticker", id: "1", packageId: "p", stickerId: "s" },
    };
    expect(toMessage(event)?.message.text).toBeNull();
  });

  it.each([
    ["テキストとスタンプ以外のメッセージ", { message: { type: "image", id: "1" } }],
    ["メッセージ以外のイベント", { type: "join" }],
    ["userId のないグループのメッセージ", { source: { type: "group", groupId: "C1" } }],
    ["複数人トークのメッセージ", { source: { type: "room", roomId: "R1", userId: "U1" } }],
  ])("%s は扱わない", (_, override) => {
    expect(toMessage({ ...textEvent({ type: "user", userId: "U1" }), ...override })).toBeNull();
  });
});
