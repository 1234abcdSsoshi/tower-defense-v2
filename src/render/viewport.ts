/* =====================================================================
   画面と戦場の対応づけ。
   戦場は幅 WORLD_W の論理座標で動いていて、描画のときだけ画面座標へ写す。
   シムは一切ここを参照しない（決定論を画面寸法から切り離すため）。
   ===================================================================== */
import { GROUND_R, WORLD_W } from "@/core/constants";
import { clearSceneryCache } from "@/render/caches";
import { DPR_CAP } from "@/render/quality";

/** 画面の実寸（CSS ピクセル） */
export let W = 0,
  H = 0;
/** 実際に確保した解像度の倍率。重い端末では 1 未満まで落ちる */
export let DPR = 1;
/** 論理座標 → 画面座標の倍率 */
export let SC = 1;
/** 戦場を中央に置くための左オフセット */
export let OX = 0;
/** 地面の画面 Y */
export let GY = 0;

/* キャンバスの取得は initCanvas() まで遅らせる。
   モジュールを読んだだけで DOM を要求すると、シムだけを回す検証ができなくなる。 */
export let cv: HTMLCanvasElement = null;
export let ctx: CanvasRenderingContext2D = null;

/** 起動時に一度だけ。resize() より先に呼ぶこと */
export function initCanvas(): void {
  cv = document.getElementById("cv") as HTMLCanvasElement;
  ctx = cv.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
}

export function resize(): void {
  // getBoundingClientRect は疑似回転(#app の transform)込みの実画面座標を返してしまうため、
  // 回転の影響を受けないレイアウト寸法（offsetWidth/Height）を使う
  const pe = cv.parentElement;
  DPR = Math.min(devicePixelRatio || 1, DPR_CAP);
  W = Math.max(320, pe.offsetWidth);
  H = Math.max(200, pe.offsetHeight);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  SC = Math.min(W / WORLD_W, H / 430);
  OX = (W - WORLD_W * SC) / 2;
  GY = H * GROUND_R;
  clearSceneryCache();
}

/** 論理 X を画面 X へ */
export function sx(x: number): number {
  return OX + x * SC;
}

/**
 * 戦場以外の小さなキャンバス（カードの絵姿・結果画面の並び）へ
 * 同じ描画関数を流用するための一時的な視点差し替え。
 * 描き終えたら必ず元に戻すこと。restore 忘れを避けるため戻り値で前の値を返す。
 */
export function pushCamera(gy: number, sc: number, ox: number): [number, number, number] {
  const prev: [number, number, number] = [GY, SC, OX];
  GY = gy;
  SC = sc;
  OX = ox;
  return prev;
}

/** pushCamera の戻り値をそのまま渡して視点を戻す */
export function popCamera(prev: [number, number, number]): void {
  GY = prev[0];
  SC = prev[1];
  OX = prev[2];
}
