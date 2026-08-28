import { NE } from "@/data/master";
import { mixK, mixW } from "@/render/color";
import { outline, pbox, ppath } from "@/render/primitives";
import type { EraPalette } from "@/data/types";
import type { Drawable } from "@/sim/types";

/* ---------- 飛行：人ではなく機体として描く ---------- */
export function drawFlyer(
  c: CanvasRenderingContext2D,
  u: Drawable,
  S: number,
  cloth: string,
  cloth2: string,
  metal: string,
  K: string,
  P: EraPalette,
  t: number,
): void {
  const kw = 15 * u.w * S,
    ph = t * 3.4 + u.x * 0.11;
  c.translate(0, Math.sin(ph) * 1.7 * S);
  if (u.era >= NE - 1) {
    // 無人機：薄い機体と4基のローター
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 0.62, -1.5 * S);
      c.lineTo(-kw * 0.34, -6.4 * S);
      c.lineTo(kw * 0.46, -6.0 * S);
      c.lineTo(kw * 0.72, -1.2 * S);
      c.closePath();
    };
    ppath(c, bd, cloth2, S, -6.4 * S, -1.2 * S, true, K);
    outline(c, bd, S, K);
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.3, -4.6 * S, kw * 0.66, 1.5 * S);
    const arms = [-kw * 0.95, -kw * 0.34, kw * 0.34, kw * 0.95];
    for (let i = 0; i < arms.length; i++) {
      const ax = arms[i];
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.8, 1.2 * S);
      c.beginPath();
      c.moveTo(ax * 0.5, -4.4 * S);
      c.lineTo(ax, -9.2 * S);
      c.stroke();
      const sp = 0.45 + 0.55 * Math.abs(Math.sin(ph * 7 + i * 1.9));
      c.strokeStyle = mixW(P.accent, 0.35);
      c.lineWidth = Math.max(0.9, 1.5 * S);
      c.beginPath();
      c.moveTo(ax - kw * 0.26 * sp, -9.4 * S);
      c.lineTo(ax + kw * 0.26 * sp, -9.4 * S);
      c.stroke();
    }
    c.fillStyle = P.accent;
    c.beginPath();
    c.arc(kw * 0.6, -3.4 * S, 1.9 * S, 0, 7);
    c.fill();
  } else if (u.era >= 4) {
    // 複葉機：上下2枚の翼と回るプロペラ
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 1.0, -11.0 * S);
      c.lineTo(-kw * 0.72, -15.4 * S);
      c.lineTo(kw * 0.74, -14.6 * S);
      c.lineTo(kw * 1.02, -10.2 * S);
      c.lineTo(-kw * 0.92, -8.6 * S);
      c.closePath();
    };
    ppath(c, bd, cloth2, S, -15.4 * S, -8.6 * S, true, K);
    outline(c, bd, S, K);
    pbox(c, -kw * 1.1, -19.6 * S, kw * 0.26, 7.2 * S, cloth2, S, true);
    pbox(c, -kw * 0.6, -20.6 * S, kw * 1.26, 2.4 * S, mixW(cloth2, 0.12), S, true);
    pbox(c, -kw * 0.5, -8.4 * S, kw * 1.06, 2.2 * S, mixW(cloth2, 0.05), S, true);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.beginPath();
    c.moveTo(-kw * 0.42, -20.6 * S);
    c.lineTo(-kw * 0.42, -8.4 * S);
    c.moveTo(kw * 0.44, -20.6 * S);
    c.lineTo(kw * 0.44, -8.4 * S);
    c.stroke();
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.34, -13.4 * S, kw * 0.86, 1.9 * S);
    c.fillStyle = mixK(P.skin, 0.06);
    c.beginPath();
    c.arc(kw * 0.1, -16.2 * S, 2.3 * S, 0, 7);
    c.fill();
    const pr = 1.6 * S + Math.abs(Math.sin(ph * 9)) * 7.4 * S;
    c.strokeStyle = mixW(metal, 0.22);
    c.lineWidth = Math.max(0.9, 1.6 * S);
    c.beginPath();
    c.moveTo(kw * 1.06, -12.4 * S - pr);
    c.lineTo(kw * 1.06, -12.4 * S + pr);
    c.stroke();
  } else {
    // 浮田の凧：人力の滑空翼。人がぶら下がる
    c.save();
    c.rotate(-0.2);
    const wing = () => {
      c.beginPath();
      c.moveTo(-kw * 1.02, -17.5 * S);
      c.lineTo(kw * 0.18, -23.4 * S);
      c.lineTo(kw * 1.06, -15.4 * S);
      c.lineTo(-kw * 0.12, -10.2 * S);
      c.closePath();
    };
    ppath(c, wing, cloth, S, -23.4 * S, -10.2 * S, true, K);
    outline(c, wing, S, K);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.beginPath();
    c.moveTo(-kw * 1.02, -17.5 * S);
    c.lineTo(kw * 1.06, -15.4 * S);
    c.moveTo(kw * 0.18, -23.4 * S);
    c.lineTo(-kw * 0.12, -10.2 * S);
    c.stroke();
    c.restore();
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.0 * S);
    c.beginPath();
    c.moveTo(-kw * 0.3, -13.6 * S);
    c.lineTo(-kw * 0.16, -7.4 * S);
    c.moveTo(kw * 0.26, -14.6 * S);
    c.lineTo(kw * 0.06, -7.4 * S);
    c.stroke();
    pbox(c, -kw * 0.3, -7.6 * S, kw * 0.52, 6.2 * S, cloth2, S, true);
    c.fillStyle = P.skin;
    c.beginPath();
    c.arc(kw * 0.02, -9.2 * S, 2.4 * S, 0, 7);
    c.fill();
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.3, -5.4 * S, kw * 0.52, 1.6 * S);
  }
  c.fillStyle = u.side === 0 ? "rgba(96,152,214,.95)" : "rgba(228,100,74,.95)";
  c.fillRect(-kw * 0.85, u.era >= NE - 1 ? -11.4 * S : -24.6 * S, kw * 0.9, 2.2 * S);
}
