import { Hono } from "hono";
import { webhookRoutes } from "./routes/webhook";

const app = new Hono<{ Bindings: Env }>().route("/webhook", webhookRoutes);

export default app;
