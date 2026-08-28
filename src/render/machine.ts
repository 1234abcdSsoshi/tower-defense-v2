import { LIN, NE } from "@/data/master";
import { mixK } from "@/render/color";
import { wheel } from "@/render/parts";
import { limb, outline, ppath } from "@/render/primitives";
import type { EraPalette } from "@/data/types";
import type { Drawable } from "@/sim/types";

export function drawMachine(
  c: CanvasRenderingContext2D,
  u: Drawable,
  S: number,
  cloth2: string,
  metal: string,
  K: string,
  P: EraPalette,
  _t: number,
): void {
  const kw = 14.5 * u.w * S,
    hs = (u.hh || u.w) / u.w,
    mortar = (LIN[u.lin] && LIN[u.lin].wep) === "mortar4";
  const spin = u.x * 0.05;
  if (u.era >= NE - 1) {
    // 現代：二脚の重機（轟く者は履帯）
    const leg = mixK(cloth2, 0.22);
    if (mortar) {
      c.fillStyle = mixK(cloth2, 0.46);
      c.beginPath();
      // roundRect は古い WebView に無い。角丸が出せなければ直角で描く
      if (c.roundRect) c.roundRect(-kw * 0.92, -11 * S * hs, kw * 1.9, 9 * S * hs, 4 * S);
      else c.rect(-kw * 0.92, -11 * S * hs, kw * 1.9, 9 * S * hs);
      c.fill();
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.9, 1.4 * S);
      c.stroke();
      for (let k = 0; k < 4; k++)
        wheel(c, -kw * 0.66 + k * kw * 0.44, -4.4 * S * hs, 3.4 * S, cloth2, metal, K, S, spin);
    } else {
      limb(c, -kw * 0.3, -13 * S * hs, -kw * 0.62, -0.6 * S, 3.4 * S, leg, S, K);
      limb(c, kw * 0.3, -13 * S * hs, kw * 0.66, -0.6 * S, 3.4 * S, leg, S, K);
    }
    const y0 = mortar ? -13 * S * hs : -11 * S * hs,
      y1 = mortar ? -24 * S * hs : -22 * S * hs;
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 0.78, y0);
      c.lineTo(-kw * 0.58, y1);
      c.lineTo(kw * 0.72, y1);
      c.lineTo(kw * 0.9, y0);
      c.closePath();
    };
    ppath(c, bd, cloth2, S, y1, y0, true, K);
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.34, y1 + 3 * S, kw * 0.9, 2.2 * S);
    c.globalAlpha = 0.4;
    c.fillRect(-kw * 0.5, y1 + 3 * S, kw * 1.2, 2.2 * S);
    c.globalAlpha = 1;
    const bl = mortar ? kw * 1.05 : kw * 1.35,
      by = mortar ? y1 + 4 * S : y1 + 3.5 * S;
    const bar = () => {
      c.beginPath();
      c.rect(kw * 0.62, by, bl, mortar ? 6.4 * S : 4.4 * S);
      c.closePath();
    };
    ppath(c, bar, metal, S, by, by + (mortar ? 6.4 : 4.4) * S, false, K);
    c.fillStyle = P.accent;
    c.beginPath();
    c.arc(kw * 0.62 + bl + 2 * S, by + (mortar ? 3.2 : 2.2) * S, 2.2 * S, 0, 7);
    c.fill();
  } else if (mortar) {
    // 轟く者：四輪の低い車体に短く太い臼砲
    const wr = 5.0 * u.w * S * 0.62,
      wy = -wr;
    for (let k = 0; k < 4; k++) wheel(c, -kw * 0.78 + k * kw * 0.52, wy, wr, cloth2, metal, K, S, spin);
    const car = () => {
      c.beginPath();
      c.moveTo(-kw * 1.02, -wr * 1.0);
      c.lineTo(-kw * 0.9, -wr * 3.4);
      c.lineTo(kw * 0.94, -wr * 3.4);
      c.lineTo(kw * 1.06, -wr * 1.0);
      c.closePath();
    };
    ppath(c, car, cloth2, S, -wr * 3.4, -wr * 1.0, true, K);
    // 弾薬箱
    const bx = () => {
      c.beginPath();
      c.rect(-kw * 0.92, -wr * 5.0, kw * 0.62, wr * 1.7);
      c.closePath();
    };
    ppath(c, bx, mixK(cloth2, 0.24), S, -wr * 5.0, -wr * 3.3, true, K);
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.88, -wr * 4.4, kw * 0.54, 1.8 * S);
    // 短く太い砲身
    c.save();
    c.translate(kw * 0.16, -wr * 3.3);
    c.rotate(-0.62);
    const bl = 9.0 * u.w * S;
    const bar = () => {
      c.beginPath();
      c.rect(-kw * 0.2, -7.4 * S, bl, 7.6 * S);
      c.closePath();
    };
    ppath(c, bar, mixK(metal, 0.3), S, -7.4 * S, 0.2 * S, false, K);
    const mz = () => {
      c.beginPath();
      c.rect(-kw * 0.2 + bl - 2.0 * S, -9.0 * S, 4.2 * S, 10.8 * S);
      c.closePath();
    };
    ppath(c, mz, mixK(metal, 0.14), S, -9.0 * S, 1.8 * S, false, K);
    c.restore();
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.6, -wr * 2.9, kw * 1.2, 2.4 * S);
  } else {
    // 造る者：二輪の小砲
    const wr = 5.4 * u.w * S,
      wy = -wr;
    wheel(c, -kw * 0.34, wy, wr, cloth2, metal, K, S, spin);
    wheel(c, kw * 0.46, wy, wr, cloth2, metal, K, S, spin);
    const car = () => {
      c.beginPath();
      c.moveTo(-kw * 0.95, -wr * 1.1);
      c.lineTo(-kw * 0.62, -wr * 2.6);
      c.lineTo(kw * 0.8, -wr * 2.6);
      c.lineTo(kw * 0.98, -wr * 1.1);
      c.closePath();
    };
    ppath(c, car, cloth2, S, -wr * 2.6, -wr * 1.1, true, K);
    c.save();
    c.translate(kw * 0.12, -wr * 2.3);
    c.rotate(-0.2);
    const bl = 13.5 * u.w * S;
    const bar = () => {
      c.beginPath();
      c.rect(-kw * 0.34, -4.2 * S, bl, 4.4 * S);
      c.closePath();
    };
    ppath(c, bar, mixK(metal, 0.36), S, -4.2 * S, 0.2 * S, false, K);
    const mz = () => {
      c.beginPath();
      c.rect(-kw * 0.34 + bl - 1.4 * S, -5.2 * S, 3.2 * S, 6.4 * S);
      c.closePath();
    };
    ppath(c, mz, mixK(metal, 0.2), S, -5.2 * S, 1.2 * S, false, K);
    c.restore();
    if (u.era >= 4) {
      const pl = () => {
        c.beginPath();
        c.rect(-kw * 0.42, -wr * 4.3, kw * 0.9, wr * 1.9);
        c.closePath();
      };
      ppath(c, pl, mixK(metal, 0.3), S, -wr * 4.3, -wr * 2.4);
      outline(c, pl, S, K);
    }
    c.fillStyle = P.accent;
    c.fillRect(-kw * 0.9, -wr * 2.35, kw * 1.3, 2.2 * S);
  }
  // 陣営の目印
  c.fillStyle = u.side === 0 ? "rgba(96,152,214,.95)" : "rgba(228,100,74,.95)";
  c.fillRect(
    -kw * 0.9,
    u.era >= NE - 1 ? -25.4 * S * hs : mortar ? -13.0 * u.w * S : -13.6 * u.w * S,
    kw * 1.0,
    2.4 * S,
  );
}
