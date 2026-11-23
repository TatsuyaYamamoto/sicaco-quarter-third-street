/**
 * @file LLM の呼び出し。応答の要否と応答文を 1 回の呼び出しで出力させる
 *
 * @see docs/phases/phase-1.md の「基本の流れ」
 */

import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText, type LanguageModel, Output } from "ai";
import { z } from "zod";
import type { Config } from "../config";
import type { Reply } from "./types";

// OpenAI の strict モードの構造化出力では optional を使えないので、nullable で表す
const outputSchema = z.object({
  should_reply: z.boolean().describe("Fairy が返信するべきなら true"),
  reply: z.string().nullable().describe("返信の文章。返信しないなら null"),
});

/** 設定値のモデルを作る。モデル名の文字列を渡すと Vercel の AI Gateway を経由するので、OpenAI の provider を使う */
export const createModel = (
  config: Pick<Config, "OPENAI_API_KEY" | "OPENAI_MODEL">,
): LanguageModel => createOpenAI({ apiKey: config.OPENAI_API_KEY })(config.OPENAI_MODEL);

/** 返信するかどうかと返信の文章を生成する。タイムアウトやエラーのときは返信しない */
export const generateReply = async ({
  model,
  system,
  prompt,
  config,
}: {
  model: LanguageModel;
  system: string;
  prompt: string;
  config: Pick<Config, "OPENAI_REASONING_EFFORT" | "OPENAI_TIMEOUT_SECONDS">;
}): Promise<Reply> => {
  try {
    const { output } = await generateText({
      model,
      system,
      prompt,
      output: Output.object({ schema: outputSchema }),
      providerOptions: {
        openai: {
          reasoningEffort: config.OPENAI_REASONING_EFFORT,
        } satisfies OpenAILanguageModelResponsesOptions,
      },
      abortSignal: AbortSignal.timeout(config.OPENAI_TIMEOUT_SECONDS * 1000),
    });
    return output.should_reply && output.reply
      ? { type: "text", text: output.reply }
      : { type: "none" };
  } catch (error) {
    console.error("failed to generate reply", error);
    return { type: "none" };
  }
};
