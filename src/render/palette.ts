import { BAL, ERAS, LIN } from "@/data/master";
import { _hx, _rgb, rgba, shade } from "@/render/color";
import type { EraPalette } from "@/data/types";

/* ---------- 時代ごとのカラーグレーディング ----------
   画面全体に薄い色を1枚被せ、兵と背景を同じ空気に置く。
   毎フレーム作ると重いのでグラデーションは時代ごとにキャッシュする。 */
// 全画面合成は毎フレーム150万画素の混色になって重い。
// 代わりに「背景・前景は焼くときに」「兵はパレットの段階で」色を寄せる。実行時コストはゼロ。
export function blend(col: string, to: string, t: number): string {
  const a = _rgb(col),
    b = _rgb(to);
  return _hx(a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t, a[2] * (1 - t) + b[2] * t);
}
// 兵は空気より少しだけ色を残す（主役の輪郭をぼかさないため）
export const GRADE_SUBJ = 0.78;
// 系譜ごとの装束色。時代のパレットへ少しだけ寄せて、時代も系譜も両方読めるようにする
export const _linPal = new Map();
export function linPal(lin: number, era: number): EraPalette {
  const E = ERAS[era];
  if (!E) return { cloth: "#888", cloth2: "#555", skin: "#D8AE86", metal: "#999", accent: "#CCC" };
  const P = E.P || E.pal,
    L = LIN[lin];
  if (!L || !L.hue) return P;
  const key = lin + ":" + era;
  let v = _linPal.get(key);
  if (v) return v;
  const gd = E.grade,
    mix = BAL.hueMix !== undefined ? BAL.hueMix : 0.18;
  let base = L.hue;
  if (gd) base = blend(base, gd.c, gd.a * GRADE_SUBJ * 2.2);
  const cloth = blend(base, P.cloth, mix);
  v = { cloth, cloth2: shade(cloth, 0.7), skin: P.skin, metal: P.metal, accent: P.accent };
  _linPal.set(key, v);
  return v;
}
export function preparePalettes(): void {
  _linPal.clear();
  for (const E of ERAS) {
    const gd = E.grade;
    if (!gd) {
      E.P = E.pal;
      continue;
    }
    const t = gd.a * GRADE_SUBJ * 2.2,
      p = E.pal;
    E.P = {
      cloth: blend(p.cloth, gd.c, t),
      cloth2: blend(p.cloth2, gd.c, t),
      skin: blend(p.skin, gd.c, t * 0.7),
      metal: blend(p.metal, gd.c, t),
      accent: blend(p.accent, gd.c, t * 0.55),
    };
  }
}
// 背景・前景に焼き込む用
export function bakeGrade(
  c: CanvasRenderingContext2D,
  era: number,
  w: number,
  h: number,
  atop: boolean,
): void {
  const gd = ERAS[era].grade;
  if (!gd) return;
  const gr = c.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, rgba(gd.c, gd.a * 1.3));
  gr.addColorStop(0.68, rgba(gd.c, gd.a));
  gr.addColorStop(1, rgba(gd.c, gd.a * 0.3));
  if (atop) c.globalCompositeOperation = "source-atop";
  c.fillStyle = gr;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
}
