import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "worker-configuration.d.ts",
    "migrations/meta",
    "pnpm-lock.yaml",
    // TODO: Markdown も整形の対象にする。差分が大きくなるので、整形は別の PR で行う
    "docs",
    "*.md",
  ],
});
