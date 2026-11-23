import type { webhook } from "@line/bot-sdk";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { sign, textEvent } from "../../test/line";
import { testSecrets } from "../../test/secrets";
import {
  createLineClient,
  isAcceptedConversation,
  isLineMessageEvent,
  toIncomingMessage,
  verifySignature,
} from "./line";

describe("verifySignature", () => {
  it("正しい署名なら true", async () => {
    const body = '{"events":[]}';
    expect(await verifySignature("secret", body, await sign(body, "secret"))).toBe(true);
  });

  it("別の Channel Secret で作った署名なら false", async () => {
    const body = '{"events":[]}';
    expect(await verifySignature("secret", body, await sign(body, "other"))).toBe(false);
  });

  it("Base64 として読めない署名なら false", async () => {
    expect(await verifySignature("secret", "{}", "%%%")).toBe(false);
  });
});

const toMessage = (event: unknown) => {
  // テストではイベントを部分的に書くので、型は検査しない
  const e = event as webhook.Event;
  return isLineMessageEvent(e) ? toIncomingMessage(e) : null;
};

describe("isLineMessageEvent / toIncomingMessage", () => {
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

  it("スタンプはキーワードを渡す", () => {
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
    expect(toMessage(event)?.message).toMatchObject({ type: "sticker", keywords: ["OK", "了解"] });
  });

  it("キーワードのないスタンプは、キーワードを空にする", () => {
    const event = {
      ...textEvent({ type: "user", userId: "U1" }),
      message: { type: "sticker", id: "1", packageId: "p", stickerId: "s" },
    };
    expect(toMessage(event)?.message).toMatchObject({ type: "sticker", keywords: [] });
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

describe("isAcceptedConversation", () => {
  it.each([
    ["家族グループ", "group", "Cfamily", true],
    ["家族グループ以外のグループ", "group", "Cother", false],
    ["マスターとの DM", "dm", "Umaster", true],
    ["助手二号との DM", "dm", "Uassistant2", true],
    ["それ以外の人との DM", "dm", "Uother", false],
  ] as const)("%s", (_, type, platformConversationId, expected) => {
    expect(isAcceptedConversation({ type, platformConversationId }, testSecrets)).toBe(expected);
  });
});

describe("createLineClient", () => {
  const mockFetch = (response: Response): MockInstance<typeof fetch> => {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reply: Reply API にテキストを送る", async () => {
    const fetch = mockFetch(Response.json({}));
    await createLineClient("token").reply("reply-token", "はい");

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.line.me/v2/bot/message/reply");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token" });
    expect(JSON.parse(String(init?.body))).toEqual({
      replyToken: "reply-token",
      messages: [{ type: "text", text: "はい" }],
    });
  });

  it("API がエラーを返したら例外を投げる", async () => {
    mockFetch(new Response("bad", { status: 400 }));
    await expect(createLineClient("token").reply("t", "x")).rejects.toThrow("400");
  });
});
