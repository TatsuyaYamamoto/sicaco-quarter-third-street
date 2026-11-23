import { Hono } from "hono";
import { createLineWebhook } from "./line/webhook";

const app = new Hono<{ Bindings: Env }>().route(
  "/webhook/line",
  // TODO: ConversationAgent に渡す。それまでは返信しない
  createLineWebhook({ dispatch: async () => null }),
);

export default app;
