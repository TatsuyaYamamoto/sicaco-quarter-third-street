import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc"],
  categories: {
    correctness: "error",
  },
  // TODO: arrow-body-style を "always" にして、アロー関数の本体を常にブロックで書くようにそろえる
  env: {
    builtin: true,
  },
});
