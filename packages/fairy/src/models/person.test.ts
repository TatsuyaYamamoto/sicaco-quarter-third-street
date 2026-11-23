import { describe, expect, it } from "vitest";
import { testSecrets } from "../../test/secrets";
import { roleIdentifiedBy } from "./person";

describe("roleIdentifiedBy", () => {
  it.each([
    ["マスター", testSecrets.LINE_USER_ID_MASTER, "master"],
    ["助手二号", testSecrets.LINE_USER_ID_ASSISTANT2, "assistant2"],
    ["それ以外の人", "Uother", null],
  ] as const)("%s", (_, platformUserId, expected) => {
    expect(roleIdentifiedBy({ platform: "line", platformUserId }, testSecrets)).toBe(expected);
  });
});
