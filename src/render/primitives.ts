import { mixK, mixW, shade } from "@/render/color";
import { blend } from "@/render/palette";
import { DET } from "@/render/quality";
import type { EraPalette } from "@/data/types";
import type { Side } from "@/sim/types";

/**
 * 形をひとつ描くための手続き。ppath/outline が陰影・縁取りのために
 * 同じ形を何度もなぞるので、パスの組み立てだけを関数として受け取る。
 * 引数は倍率（呼び出し側はつねに 1 を渡す）。
 */
export type PathBuilder = (scale?: number) => void;

/* ---------- 描画の基本部品 ----------
   ライトは「真上から」。左右反転しても破綻しないので、対面する両軍で同じ陰影が使える。 */
/* 陰影は「真上からのライト」。暗い色でも明部が立つよう、明るい側は白寄せで作る。
   乗算だと紺色の兵が黒く潰れるため。 */
export const DRK = 0.84,
  LIT_T = 0.15,
  RIM_T = 0.52;

export function inkOf(P: EraPalette): string {
  return mixK(P.cloth2, 0.62);
}
// 味方は青寄り、敵は赤寄りの墨。輪郭だけで陣営が分かる
export const _sideInk = new Map();
export function sideInk(P: EraPalette, side: Side): string {
  const b = inkOf(P),
    k = b + ":" + side;
  let v = _sideInk.get(k);
  if (v) return v;
  v = blend(b, side === 0 ? "#1D3A66" : "#63201A", 0.36);
  _sideInk.set(k, v);
  return v;
}

export function pbox(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  S: number,
  rim?: boolean,
): void {
  if (w <= 0 || h <= 0) return;
  c.fillStyle = shade(base, DRK);
  c.fillRect(x, y, w, h);
  c.fillStyle = mixW(base, LIT_T);
  c.fillRect(x, y, w, h * 0.38);
  if (rim !== false && S > 0.55) {
    c.fillStyle = mixW(base, RIM_T);
    c.fillRect(x, y, w, Math.max(0.9, 1.15 * S));
  }
}
// clip() は Chromium で稀に長いストールを起こすため、明部は「同じ形を上端基準で
// 縦に潰して重ね塗り」して作る。見た目はほぼ同じで、描画コストが桁で違う。
export function ppath(
  c: CanvasRenderingContext2D,
  build: PathBuilder,
  base: string,
  S: number,
  topY: number,
  botY: number,
  rim?: boolean,
  ink?: string,
): void {
  c.fillStyle = shade(base, DRK);
  build(1);
  c.fill();
  if (ink) {
    c.strokeStyle = ink;
    c.lineWidth = Math.max(0.8, 1.25 * S);
    c.lineJoin = "round";
    c.stroke();
  }
  c.save();
  c.transform(1, 0, 0, 0.38, 0, topY * 0.62);
  c.fillStyle = mixW(base, LIT_T);
  build(1);
  c.fill();
  c.restore();
  if (rim !== false && S > 0.55) {
    const h = botY - topY || 1,
      k = Math.min(0.5, Math.max(0.03, (1.2 * S) / h));
    c.save();
    c.transform(1, 0, 0, k, 0, topY * (1 - k));
    c.fillStyle = mixW(base, RIM_T);
    build(1);
    c.fill();
    c.restore();
  }
}
export function outline(c: CanvasRenderingContext2D, build: PathBuilder, S: number, col: string): void {
  c.strokeStyle = col;
  c.lineWidth = Math.max(0.8, 1.25 * S);
  c.lineJoin = "round";
  build(1);
  c.stroke();
}
export function limb(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick: number,
  base: string,
  S: number,
  col?: string,
): void {
  c.lineCap = "round";
  if (DET) {
    c.strokeStyle = col;
    c.lineWidth = thick + Math.max(1.0, 1.7 * S);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }
  c.strokeStyle = mixW(base, 0.05);
  c.lineWidth = thick;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}
