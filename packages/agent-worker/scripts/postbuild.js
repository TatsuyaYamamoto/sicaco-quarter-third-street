import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRootDir = path.resolve(import.meta.dirname, "../../..");
const mastraOutputDir = path.resolve(import.meta.dirname, "../.mastra/output");

/*******************************************************************************
 * Mastra の Storage クラスに渡す binding は mastra build 後、 top-level scope で定義される。
 * Workers は request context 外での I/O を許可していないため、D1 の binding も request context 内で参照する必要がある。
 * この GAP を埋めるために mastra が作成した index.mjs を dynamic import する main.mjs を作成して、binding を request context 内で参照されるようにする。
 * @see https://developers.cloudflare.com/changelog/2025-03-17-importable-env/
 */
fs.writeFileSync(
  path.resolve(mastraOutputDir, "main.mjs"),
  `
export default {
  fetch: async (request, env, context) => {
    const { default: entry } = await import("./index.mjs");
    return entry.fetch(request, env, context);
  }
};
`,
);

const mastraMjsPath = path.resolve(mastraOutputDir, "mastra.mjs");
const mastraMjsContent = fs.readFileSync(mastraMjsPath, "utf-8");
fs.writeFileSync(
  mastraMjsPath,
  `
import { env } from "cloudflare:workers";
${mastraMjsContent}
`,
);

/*******************************************************************************
 * wrangler.json の編集
 */
const wranglerJsonPath = path.resolve(mastraOutputDir, "wrangler.json");
const wranglerJson = JSON.parse(fs.readFileSync(wranglerJsonPath, "utf-8"));
Object.assign(wranglerJson, {
  main: "./main.mjs",
  assets: {
    directory: "./assets/",
  },
});
fs.writeFileSync(wranglerJsonPath, JSON.stringify(wranglerJson, null, 2));

/*******************************************************************************
 * @see https://github.com/mastra-ai/mastra/issues/11449
 */
execSync("pnpm uninstall typescript", {
  cwd: mastraOutputDir,
  stdio: "inherit",
});

execSync("pnpm -r uninstall typescript", {
  cwd: repoRootDir,
  stdio: "inherit",
});
