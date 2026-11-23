import { describe, expect, it } from "vitest";
import { testSecrets } from "../../test/secrets";
import { roleOfAccount, roleOfPerson } from "./person";

const lineAccount = (platformUserId: string) => ({ platform: "line", platformUserId }) as const;

describe("roleOfAccount", () => {
  it.each([
    ["マスター", testSecrets.LINE_USER_ID_MASTER, "master"],
    ["助手二号", testSecrets.LINE_USER_ID_ASSISTANT2, "assistant2"],
    ["それ以外の人", "Uother", null],
  ] as const)("%s", (_, platformUserId, expected) => {
    expect(roleOfAccount(lineAccount(platformUserId), testSecrets)).toBe(expected);
  });
});

describe("roleOfPerson", () => {
  it("どれかの Account に役割があれば、その役割を持つ", () => {
    const accounts = [lineAccount("Uother"), lineAccount(testSecrets.LINE_USER_ID_MASTER)];
    expect(roleOfPerson(accounts, testSecrets)).toBe("master");
  });

  it("役割のある Account がなければ null", () => {
    expect(roleOfPerson([lineAccount("Uother")], testSecrets)).toBeNull();
  });
});
