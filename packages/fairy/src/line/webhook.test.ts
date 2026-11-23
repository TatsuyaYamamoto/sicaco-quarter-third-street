import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import { sign, testEnv, textEvent } from "../../test/line";
import { createLineWebhook } from "./webhook";

const setup = (reply: { text: string } | null = { text: "はい" }) => {
  const dispatch = vi.fn(async () => reply);
  const replyApi = vi.fn(async () => {});
  const app = createLineWebhook({ dispatch, createClient: () => ({ reply: replyApi }) });

  const post = async (events: unknown[], signature?: string) => {
    const body = JSON.stringify({ destination: "Ubot", events });
    const ctx = createExecutionContext();
    const res = await app.request(
      "/",
      { method: "POST", body, headers: { "x-line-signature": signature ?? (await sign(body)) } },
      testEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    return res;
  };
  return { dispatch, replyApi, post };
};

describe("LINE の Webhook", () => {
  it("署名が正しくなければ 401 を返し、何もしない", async () => {
    const { dispatch, post } = setup();
    const res = await post([textEvent({ type: "user", userId: "Umaster" })], "invalid");
    expect(res.status).toBe(401);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("受け付ける会話のメッセージを Agent に渡し、返信を replyToken で送る", async () => {
    const { dispatch, replyApi, post } = setup();
    const res = await post([textEvent({ type: "group", groupId: "Cfamily", userId: "U1" })]);
    expect(res.status).toBe(200);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(replyApi).toHaveBeenCalledWith("reply-100", "はい");
  });

  it("Agent が「返信なし」を返したら送らない", async () => {
    const { replyApi, post } = setup(null);
    await post([textEvent({ type: "user", userId: "Umaster" })]);
    expect(replyApi).not.toHaveBeenCalled();
  });

  it("受け付けない会話のメッセージは Agent に渡さない", async () => {
    const { dispatch, post } = setup();
    const res = await post([textEvent({ type: "group", groupId: "Cother", userId: "U1" })]);
    expect(res.status).toBe(200);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("1 つのイベントの処理に失敗しても、ほかのイベントは処理する", async () => {
    const { dispatch, replyApi, post } = setup();
    dispatch.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await post([
      textEvent({ type: "user", userId: "Umaster" }, "1", "1"),
      textEvent({ type: "user", userId: "Umaster" }, "2", "2"),
    ]);
    expect(replyApi).toHaveBeenCalledOnce();
    expect(replyApi).toHaveBeenCalledWith("reply-2", "はい");
  });
});
