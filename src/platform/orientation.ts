/* =====================================================================
   縦持ちでも遊べるよう、疑似回転で横画面として見せる（Web 配布のみ）。

   端末の実回転や、埋め込み先(iframe)の向き通知はあてにできないことがある
   （回しても「端末を横にしてください」から動かない、という報告があった）。
   そこで OS 側の回転を待たず、コンテナが縦長なら CSS transform で #rotWrap
   （#app と、その兄弟である sheet 群すべてをまとめて包む）を90度回して見せる。
   実ビューポートの縦横比だけで判定するので、埋め込み先が横向きにリサイズ
   してくれるかどうかに依存しない。#app・各 .sheet は元々 position:fixed;inset:0
   なので、#rotWrap に transform が付けばそれ自体が包含ブロックとなり、
   中身を個別に書き換えなくてもそのまま追従する。

   Steam(Tauri)版は必ず横長のウィンドウなので、疑似回転は丸ごと不要。
   ただし --vwu / --vhu は CSS の寸法計算そのものなので、こちらは必ず更新する。
   ===================================================================== */
import { IS_DESKTOP } from "@/platform/env";
import { $ } from "@/ui/dom";

/** 全画面化と向きの固定。ユーザー操作の中からしか呼べない */
export async function tryLock(): Promise<void> {
  if (IS_DESKTOP) return;
  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement)
      await document.documentElement.requestFullscreen();
  } catch (e) {
    /* 拒否されても遊べる */
  }
  try {
    // lock() は TS の lib にまだ無いが、モバイル Chrome には実在する
    const o = screen.orientation as ScreenOrientation & { lock?: (v: string) => Promise<void> };
    if (o && o.lock) await o.lock("landscape");
  } catch (e) {
    /* 対応していない環境は素通り */
  }
}

/* matchMedia もモジュール読み込み時には触らない。gate() が最初に呼ばれたとき作る */
let mq: MediaQueryList = null;
function portraitQuery(): MediaQueryList {
  if (!mq) mq = matchMedia("(orientation: portrait)");
  return mq;
}
let appEl: HTMLElement = null;

function applyRotation(rot: boolean): void {
  if (!appEl) appEl = $("rotWrap");
  if (rot) {
    const vw = innerWidth,
      vh = innerHeight;
    appEl.style.position = "fixed";
    appEl.style.width = vh + "px";
    appEl.style.height = vw + "px";
    appEl.style.top = "0";
    appEl.style.left = "0";
    appEl.style.right = "auto";
    appEl.style.bottom = "auto";
    appEl.style.transformOrigin = "0 0";
    appEl.style.transform = "translate(" + vw + "px,0) rotate(90deg)";
  } else {
    appEl.style.position = "";
    appEl.style.width = "";
    appEl.style.height = "";
    appEl.style.top = "";
    appEl.style.left = "";
    appEl.style.right = "";
    appEl.style.bottom = "";
    appEl.style.transformOrigin = "";
    appEl.style.transform = "";
  }
}

/**
 * vw/vh は実ビューポート基準のまま変わらないので、疑似回転後の"論理"寸法を
 * CSS カスタムプロパティとして与え、clamp()/min() 側の Nvw・Nvh の代わりに使う。
 * 回転しない環境でも CSS がこの値を使うため、こちらは必ず呼ぶ。
 */
function updateViewportVars(rot: boolean): void {
  const lw = rot ? innerHeight : innerWidth;
  const lh = rot ? innerWidth : innerHeight;
  const root = document.documentElement.style;
  root.setProperty("--vwu", lw / 100 + "px");
  root.setProperty("--vhu", lh / 100 + "px");
  document.body.classList.toggle("h470", lh <= 470);
  document.body.classList.toggle("h400", lh <= 400);
  document.body.classList.toggle("w560", lw <= 560);
}

/**
 * 実機の向きが取れるなら、それを優先する。
 * 取れないときは疑似回転を優先し、固まって見える状態を避ける。
 */
function deviceLooksPortrait(): boolean {
  try {
    if (screen.orientation && screen.orientation.type) return /portrait/.test(screen.orientation.type);
  } catch (e) {
    /* 参照できない環境は「分からない」扱い */
  }
  return false;
}

/** 画面の向きに応じて、疑似回転するか案内を出すかを決める */
export function gate(): void {
  if (IS_DESKTOP) {
    updateViewportVars(false);
    return;
  }
  const boxPortrait = portraitQuery().matches;
  const hint = boxPortrait && deviceLooksPortrait();
  const rot = boxPortrait && !hint;
  document.body.classList.toggle("is-portrait", rot);
  document.body.classList.toggle("show-hint", hint);
  applyRotation(rot);
  updateViewportVars(rot);
}

/** 起動時に一度だけ呼ぶ */
export function initOrientation(onChange: () => void): void {
  if (IS_DESKTOP) return;
  portraitQuery().addEventListener("change", () => {
    gate();
    setTimeout(onChange, 60);
  });
}
