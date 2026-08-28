// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src-tauri/**", "public/sw.js", "legacy/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        __TARGET__: "readonly",
        __IS_DESKTOP__: "readonly",
        __APP_VERSION__: "readonly",
      },
    },
    rules: {
      /* 手続き描画は「使わない引数」を素直に残したほうが読める。
         意図して捨てている引数は _ 始まりにする、という約束にする */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      /* any は「まだ型を付けていない」印。増やさないために警告で見えるようにする */
      "@typescript-eslint/no-explicit-any": "warn",
      /* 空の catch は「失敗しても遊べる」という設計判断。コメントを添えて許す */
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // ビルド用スクリプトと設定は Node で動く。ブラウザには載らない
    files: ["scripts/**/*.{ts,mjs,js}", "*.config.{ts,js}", "tests/**/*.ts"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", __dirname: "readonly" },
    },
  },
  {
    // レイヤーの向きを機械で守る。sim は上位層を知らないでいること
    files: ["src/sim/**/*.ts", "src/data/**/*.ts", "src/core/**/*.ts"],
    rules: {
      /* 決定論の要。盤面に効く乱数は必ず G.rng（記録される種）から引く。
         音のゆらぎや召集（ガチャ）は再現性の外なので、この禁止はシム層だけに掛ける */
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "決定論が壊れます。盤面に効く乱数は G.rng()、演出だけの揺らぎは vrng() を使ってください。",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*"],
              message: "シム・データ層から app 層は呼べません（起動順が循環します）。",
            },
            {
              group: ["@/ui/result", "@/ui/stage", "@/ui/home", "@/ui/team", "@/ui/hud", "@/ui/cards"],
              message:
                "シムから画面を直接呼ばないでください。決着は sim/outcome.ts の finishGame() で通知します。",
            },
          ],
        },
      ],
    },
  },
);
