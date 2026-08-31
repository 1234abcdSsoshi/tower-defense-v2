import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * 配布先が二つある。
 *   web     … ブラウザで遊ぶ（GitHub Pages、のちに itch.io）
 *   desktop … 手元に入れて遊ぶ（Tauri の窓の中）
 *
 * base を相対にしてあるのは両方のため。
 * Pages は https://<user>.github.io/<repo>/ のように下の階層へ置かれ、
 * Tauri の WebView は file:// 相当で読む。絶対パスにすると
 * どちらも「窓は開くのに真っ白」という一番わかりにくい壊れかたをする。
 *
 * 書体も絵も音も同梱で、外部への通信はゼロ。
 */
const target = (process.env.VITE_TARGET ?? "web") as "web" | "desktop";

export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    __IS_DESKTOP__: JSON.stringify(target === "desktop"),
    // package.json の version をそのままゲーム内の版数表示に出す
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  build: {
    outDir: target === "desktop" ? "dist/desktop" : "dist/web",
    target: "es2022",
    emptyOutDir: true,
    // 絵は URL 参照の別ファイルとして出し、JS は単一チャンクにする
    assetsInlineLimit: 0,
    rollupOptions: { output: { manualChunks: undefined } },
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
