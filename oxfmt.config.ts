import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "worker-configuration.d.ts",
    "migrations/meta",
    "pnpm-lock.yaml",
    "docs",
    "*.md",
  ],
});
