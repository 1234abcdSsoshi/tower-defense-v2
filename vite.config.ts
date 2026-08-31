import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * 配布先は PC のダウンロード版だけ（itch.io で購入 → 手元で実行）。
 *
 * base を相対にしてあるのは、Tauri の WebView が file:// 相当で読むため。
 * 絶対パスにすると、窓は開くのに真っ白、という一番わかりにくい壊れかたをする。
 *
 * 書体も絵も音も同梱で、外部への通信はゼロ。
 * 機内でも社内網でも、買った人の手元で同じ絵が出る。
 */
export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    // package.json の version をそのままゲーム内の版数表示に出す
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    // 手元のファイルを読むだけなので、まとめても分けても速さは変わらない。
    // 絵は URL 参照の別ファイルとして出し、JS は単一チャンクにする
    assetsInlineLimit: 0,
    rollupOptions: { output: { manualChunks: undefined } },
    // 手元で動く実行ファイルなので、原因を追えるように地図を残す
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
