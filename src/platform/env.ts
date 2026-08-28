/* =====================================================================
   ビルド先の違いをここ一箇所に閉じ込める。
   これらは vite.config.ts の define でコンパイル時に定数へ畳まれるため、
   使わない側のコードはバンドルから丸ごと落ちる。
   ===================================================================== */

declare const __IS_DESKTOP__: boolean;
declare const __APP_VERSION__: string;

/** Steam 配布（Tauri の WebView の中）で動いているか */
export const IS_DESKTOP: boolean = __IS_DESKTOP__;

/** itch.io などブラウザで動いているか。疑似回転・Service Worker はこちらだけ */
export const IS_WEB: boolean = !__IS_DESKTOP__;

/** package.json の version。設定画面の版数表示に出す */
export const APP_VERSION: string = __APP_VERSION__;
