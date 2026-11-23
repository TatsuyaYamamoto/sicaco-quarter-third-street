import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const baseEnv = {
  LINE_CHANNEL_SECRET: "secret",
  LINE_CHANNEL_ACCESS_TOKEN: "token",
  OPENAI_API_KEY: "sk-test",
  LINE_MASTER_USER_ID: "Umaster",
  LINE_ASSISTANT2_USER_ID: "Uassistant2",
  LINE_FAMILY_GROUP_ID: "Cfamily",
  OPENAI_MODEL: "gpt-6-luna",
  OPENAI_REASONING_EFFORT: "none",
  OPENAI_TIMEOUT_SECONDS: "25",
  HISTORY_LIMIT: "30",
  MAX_REGENERATIONS: "10",
} as Env;

describe("loadConfig", () => {
  it("vars の文字列を数値に変換する", () => {
    const config = loadConfig(baseEnv);
    expect(config.openai.timeoutMs).toBe(25_000);
    expect(config.historyLimit).toBe(30);
    expect(config.maxRegenerations).toBe(10);
  });

  it("secrets が空なら例外を投げる", () => {
    expect(() => loadConfig({ ...baseEnv, OPENAI_API_KEY: "" })).toThrow();
  });

  it("数値でない値なら例外を投げる", () => {
    expect(() => loadConfig({ ...baseEnv, HISTORY_LIMIT: "abc" })).toThrow();
  });

  it("未知の reasoning effort なら例外を投げる", () => {
    expect(() => loadConfig({ ...baseEnv, OPENAI_REASONING_EFFORT: "ultra" })).toThrow();
  });
});
