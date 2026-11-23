import { describe, expect, it } from "vitest";
import { testConfig } from "../../test/line";
import { isAcceptedConversation } from "./acceptance";

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
