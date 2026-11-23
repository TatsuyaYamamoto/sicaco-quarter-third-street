import { Hono } from "hono";
import { webhookRoutes } from "./routes/webhook";

export { ConversationAgent } from "./agent/conversation-agent";

const app = new Hono<{ Bindings: Env }>().route("/webhook", webhookRoutes);

export default app;
