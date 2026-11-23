import type { webhook } from "@line/bot-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sign, testConfig, textEvent } from "../../test/line";
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

describe("isAcceptedConversation", () => {
  it.each([
    ["家族グループ", "group", "Cfamily", true],
    ["家族グループ以外のグループ", "group", "Cother", false],
    ["マスターとの DM", "dm", "Umaster", true],
    ["助手二号との DM", "dm", "Uassistant2", true],
    ["それ以外の人との DM", "dm", "Uother", false],
  ] as const)("%s", (_, type, platformConversationId, expected) => {
    expect(isAcceptedConversation({ type, platformConversationId }, testConfig)).toBe(expected);
  });
});

describe("createLineClient", () => {
  const mockFetch = (response: Response) =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

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

  it.each([
    ["DM", "dm", "https://api.line.me/v2/bot/profile/U1"],
    ["グループ", "group", "https://api.line.me/v2/bot/group/C1/member/U1"],
  ] as const)("getProfile: %s では %s のプロフィールを取得する", async (_, type, expected) => {
    const fetch = mockFetch(Response.json({ displayName: "マスター", userId: "U1" }));
    const id = type === "dm" ? "U1" : "C1";
    const profile = await createLineClient("token").getProfile(
      { type, platformConversationId: id },
      "U1",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(expected);
    expect(profile).toEqual({ displayName: "マスター" });
  });

  it("API がエラーを返したら例外を投げる", async () => {
    mockFetch(new Response("bad", { status: 400 }));
    await expect(createLineClient("token").reply("t", "x")).rejects.toThrow("400");
  });
});
