import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sign, textEvent } from "../../test/line";

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock("../agent/dispatch", () => ({ dispatchMessage: dispatch }));

describe("POST /webhook/line", () => {
  let webhookRoutes: typeof import("./webhook").webhookRoutes;

  beforeAll(async () => {
    // テストの実行環境は Worker のエントリポイントを先に読み込むので、このモジュールも vi.mock より先に読み込まれている。
    // 読み込み直して、モックした dispatchMessage を使わせる
    vi.resetModules();
    ({ webhookRoutes } = await import("./webhook"));
  });

  let fetchMock: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    dispatch.mockResolvedValue({ type: "text", text: "はい" });
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dispatch.mockReset();
  });

  /** Reply API に送った replyToken と本文 */
  const sentReplies = (): { replyToken: string; text: string }[] =>
    fetchMock.mock.calls.map(([, init]) => {
      const { replyToken, messages } = JSON.parse(String(init?.body));
      return { replyToken, text: messages[0].text };
    });

  const post = async (events: unknown[], signature?: string): Promise<Response> => {
    const body = JSON.stringify({ destination: "Ubot", events });
    const ctx = createExecutionContext();
    const res = await webhookRoutes.request(
      "/line",
      { method: "POST", body, headers: { "x-line-signature": signature ?? (await sign(body)) } },
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    return res;
  };

  it("署名が正しくなければ 401 を返し、何もしない", async () => {
    const res = await post([textEvent({ type: "user", userId: "Umaster" })], "invalid");
    expect(res.status).toBe(401);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("受け付ける会話のメッセージを Agent に渡し、返信を replyToken で送る", async () => {
    const res = await post([textEvent({ type: "group", groupId: "Cfamily", userId: "U1" })]);
    expect(res.status).toBe(200);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(sentReplies()).toEqual([{ replyToken: "reply-100", text: "はい" }]);
  });

  it("Agent が「返信なし」を返したら送らない", async () => {
    dispatch.mockResolvedValue({ type: "none" });
    await post([textEvent({ type: "user", userId: "Umaster" })]);
    expect(sentReplies()).toEqual([]);
  });

  it("受け付けない会話のメッセージは Agent に渡さない", async () => {
    const res = await post([textEvent({ type: "group", groupId: "Cother", userId: "U1" })]);
    expect(res.status).toBe(200);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("1 つのイベントの処理に失敗しても、ほかのイベントは処理する", async () => {
    dispatch.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await post([
      textEvent({ type: "user", userId: "Umaster" }, "1", "1"),
      textEvent({ type: "user", userId: "Umaster" }, "2", "2"),
    ]);
    expect(sentReplies()).toEqual([{ replyToken: "reply-2", text: "はい" }]);
  });
});
