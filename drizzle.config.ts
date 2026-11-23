import { defineConfig } from "drizzle-kit";

// drizzle-kit はマイグレーションの SQL の生成だけに使い、適用は wrangler d1 migrations apply で行う
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
