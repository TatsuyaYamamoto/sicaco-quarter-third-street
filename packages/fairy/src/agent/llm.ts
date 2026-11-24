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

/** LLM の呼び出しに使う設定値 */
interface OpenAIConfig {
  OPENAI_API_KEY: Config["OPENAI_API_KEY"];
  OPENAI_MODEL: Config["OPENAI_MODEL"];
  OPENAI_REASONING_EFFORT: Config["OPENAI_REASONING_EFFORT"];
  OPENAI_TIMEOUT_SECONDS: Config["OPENAI_TIMEOUT_SECONDS"];
}

/**
 * OpenAI のモデルを作る
 *
 * generateText の model にモデル ID の文字列を渡すと、AI SDK は既定で Vercel の AI Gateway にリクエストを送る。
 * Vercel のサービスは使わない（クラウドは Cloudflare の製品を前提にしている）ので、OpenAI の provider でモデルを作る
 */
const createModel = (config: OpenAIConfig): LanguageModel => {
  const openai = createOpenAI({ apiKey: config.OPENAI_API_KEY });
  return openai(config.OPENAI_MODEL);
};

/** 返信するかどうかと返信の文章を生成する。タイムアウトやエラーのときは返信しない */
export const generateReply = async ({
  system,
  prompt,
  config,
}: {
  system: string;
  prompt: string;
  config: OpenAIConfig;
}): Promise<Reply | undefined> => {
  try {
    const { output } = await generateText({
      model: createModel(config),
      system,
      prompt,
      output: Output.object({
        // OpenAI の strict モードの構造化出力では optional を使えないので、nullable で表す
        schema: z.object({
          should_reply: z.boolean().describe("Fairy が返信するべきなら true"),
          reply: z.string().nullable().describe("返信の文章。返信しないなら null"),
        }),
      }),
      providerOptions: {
        openai: {
          reasoningEffort: config.OPENAI_REASONING_EFFORT,
        } satisfies OpenAILanguageModelResponsesOptions,
      },
      abortSignal: AbortSignal.timeout(config.OPENAI_TIMEOUT_SECONDS * 1000),
    });
    if (!output.should_reply || output.reply === null) {
      return undefined;
    }
    return { type: "text", text: output.reply };
  } catch (error) {
    console.error("failed to generate reply", error);
    return undefined;
  }
};
