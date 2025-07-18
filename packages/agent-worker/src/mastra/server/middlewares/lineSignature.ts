import { validateSignature } from "@line/bot-sdk";

import { LINE_CHANNEL_SECRET } from "../../env";
import type { MiddlewareHandler } from "../../types";

export const lineSignatureMiddleware: MiddlewareHandler = async (
  c,
  next,
): Promise<Response | void> => {
  const xLineSignature = c.req.header("x-line-signature");
  const body = await c.req.text();

  if (
    !xLineSignature ||
    !validateSignature(body, LINE_CHANNEL_SECRET, xLineSignature)
  ) {
    return c.json({ message: "Unauthorized" }, { status: 401 });
  }

  await next();
};
