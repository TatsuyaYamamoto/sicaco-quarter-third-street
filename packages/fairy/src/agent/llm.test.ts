import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateReply } from "./llm";

const config = { OPENAI_REASONING_EFFORT: "none", OPENAI_TIMEOUT_SECONDS: 1 } as const;

const modelReturning = (text: string): MockLanguageModelV4 =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateReply", () => {
  it("返信するなら、返信の文章を返す", async () => {
    const model = modelReturning('{"should_reply":true,"reply":"肯定。"}');
    expect(await generateReply({ model, system: "", prompt: "", config })).toEqual({
      type: "text",
      text: "肯定。",
    });
  });

  it("返信しないなら、返信を返さない", async () => {
    const model = modelReturning('{"should_reply":false,"reply":null}');
    expect(await generateReply({ model, system: "", prompt: "", config })).toBeUndefined();
  });

  it("タイムアウトしたら返信を返さず、エラーをログに残す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const model = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal?.addEventListener("abort", () => reject(abortSignal.reason));
        }),
    });
    expect(await generateReply({ model, system: "", prompt: "", config })).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
