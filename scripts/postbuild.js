import fs from "node:fs";
import path from "node:path";

const mastraOutputDir = path.resolve(import.meta.dirname, "../.mastra/output");

/**
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
