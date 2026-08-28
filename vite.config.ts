import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * 配布先が二つある。
 *   web     … itch.io（ブラウザ実行 / 相対パス / Service Worker あり）
 *   desktop … Steam（Tauri の WebView が file:// 相当で読むので base は必ず相対）
 * どちらも base:"./" で問題ないため、差分は「Service Worker を登録するか」と
 * 「モバイル向けの疑似回転コードを含めるか」の二点だけに閉じている。
 */
const target = (process.env.VITE_TARGET ?? "web") as "web" | "desktop";

export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    __TARGET__: JSON.stringify(target),
    __IS_DESKTOP__: JSON.stringify(target === "desktop"),
    // package.json の version をそのままゲーム内の版数表示に出す
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  build: {
    target: "es2022",
    outDir: target === "desktop" ? "dist/desktop" : "dist/web",
    emptyOutDir: true,
    // 画像アセットが0枚なので、JSON（マスタ）以外に大物はない。
    // 分割してもリクエストが増えるだけなので単一チャンクにまとめる。
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    sourcemap: target === "web",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
