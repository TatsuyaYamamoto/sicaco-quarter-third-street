import { describe, expect, it } from "vitest";
import { testSecrets } from "../../test/secrets";
import type { accounts } from "../db/schema";
import { resolveRoles } from "./role";

describe("resolveRoles", () => {
  const account = (personId: string, platformUserId: string): typeof accounts.$inferSelect => ({
    id: `a-${personId}`,
    platform: "line",
    platformUserId,
    displayName: null,
    personId,
    linkedBy: "auto",
    createdAt: "",
  });

  it("設定値の LINE userId と一致する Account を持つ Person に役割を付ける", () => {
    const roles = resolveRoles(
      new Map([
        ["p1", [account("p1", testSecrets.LINE_USER_ID_MASTER)]],
        ["p2", [account("p2", testSecrets.LINE_USER_ID_ASSISTANT2)]],
        ["p3", [account("p3", "Uother")]],
      ]),
      testSecrets,
    );
    expect(roles).toEqual(
      new Map([
        ["p1", "master"],
        ["p2", "assistant2"],
      ]),
    );
  });
});
