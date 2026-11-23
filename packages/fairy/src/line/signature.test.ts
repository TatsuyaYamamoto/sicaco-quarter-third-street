import { describe, expect, it } from "vitest";
import { sign } from "../../test/line";
import { verifySignature } from "./signature";

describe("verifySignature", () => {
  it("正しい署名なら true", async () => {
    const body = '{"events":[]}';
    expect(await verifySignature("secret", body, await sign(body, "secret"))).toBe(true);
  });

  it("別の Channel Secret で作った署名なら false", async () => {
    const body = '{"events":[]}';
    expect(await verifySignature("secret", body, await sign(body, "other"))).toBe(false);
  });

  it("Base64 として読めない署名なら false", async () => {
    expect(await verifySignature("secret", "{}", "%%%")).toBe(false);
  });
});
