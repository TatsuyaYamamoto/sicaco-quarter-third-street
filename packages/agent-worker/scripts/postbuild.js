import fs from "node:fs";
import path from "node:path";

const mastraOutputDir = path.resolve(import.meta.dirname, "../.mastra/output");

/*******************************************************************************
 * mastra のビルド成果物 (index.mjs) では dynamic import を行っており、`import()` には文字列リテラルではなく変数を渡している
 * @see https://github.com/mastra-ai/mastra/blob/%40mastra%2Fdeployer-cloudflare%400.1.20/packages/deployer/src/server/index.ts#L92
 *
 * しかし `wrangler deploy` では 変数を使った `import()` を bundle 出来ないため、workers の実行時に `tools.mjs` を見つけられずクラッシュする。
 */
const { tools: toolPaths } = await import(`${mastraOutputDir}/tools.mjs`);

const mastraIndexMjsPath = path.resolve(mastraOutputDir, "index.mjs");
const mastraIndexMjsContent = fs.readFileSync(mastraIndexMjsPath, "utf-8");
const mastraIndexMjsContentReplaced = mastraIndexMjsContent
  /**
   * - const mastraToolsPaths = (await import(toolsPath)).tools;
   * + const mastraToolsPaths = (await import('./tools.mjs')).tools;
   */
  .replace("import(toolsPath)", "import('./tools.mjs')")
  /**
   * - const toolImports = mastraToolsPaths ? await Promise.all(
   * -   // @ts-ignore
   * -   mastraToolsPaths.map(async (toolPath) => {
   * -     return import(toolPath);
   * -   })
   * - ) : [];
   * + const toolImports = await Promise.all([
   * +   import('./tools/78ec504b-840a-46e6-9a27-c6cc182e4a5f.mjs')
   * + ]);
   */
  .replace(
    // s で改行を含む正規表現にする
    // ? で最初の];でマッチを止める
    /const toolImports = .*?];/s,
    `const toolImports = await Promise.all([
    ${toolPaths.map((path) => `import('${path}')`).join(",\n")}
    ]);`,
  );
fs.writeFileSync(mastraIndexMjsPath, mastraIndexMjsContentReplaced);

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

/**
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
