import { afterEach, describe, expect, it, vi } from "vitest";
import { openaiResponse } from "../../test/openai";
import { generateReply } from "./llm";

const config = {
  OPENAI_API_KEY: "sk-test",
  OPENAI_MODEL: "gpt-6-luna",
  OPENAI_REASONING_EFFORT: "none",
  OPENAI_TIMEOUT_SECONDS: 1,
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateReply", () => {
  it("OpenAI に直接リクエストし、返信するなら返信の文章を返す", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(openaiResponse({ should_reply: true, reply: "肯定。" }));

    expect(await generateReply({ system: "", prompt: "", config })).toEqual({
      type: "text",
      text: "肯定。",
    });
    expect(String(fetch.mock.calls[0]?.[0])).toBe("https://api.openai.com/v1/responses");
  });

  it("返信しないなら、返信を返さない", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openaiResponse({ should_reply: false, reply: null }),
    );
    expect(await generateReply({ system: "", prompt: "", config })).toBeUndefined();
  });

  it("タイムアウトしたら返信を返さず、エラーをログに残す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // リクエストを中断されるまで応答しない
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    expect(await generateReply({ system: "", prompt: "", config })).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
