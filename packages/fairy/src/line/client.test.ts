import { afterEach, describe, expect, it, vi } from "vitest";
import { createLineClient } from "./client";

const mockFetch = (response: Response) => vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLineClient", () => {
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
