import { BAL } from "@/data/master";
import { linPal } from "@/render/palette";
import { GY, SC, sx } from "@/render/viewport";
import type { Unit } from "@/sim/types";

/* ---------- 兵科マーク：混戦でも相性が読めるように ----------
   兵の座標系ではなく画面座標で描く。傾きや反転の影響を受けず、常に上を向く。 */
export function markTopOf(u: Unit): number {
  const z = u.z || 0,
    zs = 1 - z * 0.17;
  const hh = u.hh || u.w,
    avg = (u.w + hh) * 0.5;
  let top;
  if (u.arm === "siege") top = 27 * Math.max(1, u.w * 0.8);
  else if (u.arm === "air") top = 26;
  else top = 25 * hh + 6 * avg * 1.05 + 19;
  const fh = u.fly ? ((BAL.airY || 56) + z * 10) * SC * zs : 0;
  return GY - z * 13 * SC - fh - top * SC * zs;
}
export function drawMark(g: CanvasRenderingContext2D, u: Unit): void {
  if (u.mon) return;
  const z = u.z || 0,
    zs = 1 - z * 0.17,
    S = SC * zs,
    r = 3.5 * S;
  if (r < 1.6) return;
  const P = linPal(u.lin, u.era);
  g.save();
  g.globalAlpha = (1 - z * 0.22) * 0.95;
  g.translate(sx(u.x), markTopOf(u));
  g.beginPath();
  const a = u.arm;
  if (a === "foot") {
    g.rect(-r * 0.72, -r * 0.92, r * 1.44, r * 1.84);
  } else if (a === "archer") {
    g.moveTo(0, -r * 1.15);
    g.lineTo(r * 1.02, r * 0.72);
    g.lineTo(-r * 1.02, r * 0.72);
    g.closePath();
  } else if (a === "cavalry") {
    g.moveTo(0, -r * 1.2);
    g.lineTo(r * 0.95, 0);
    g.lineTo(0, r * 1.2);
    g.lineTo(-r * 0.95, 0);
    g.closePath();
  } else if (a === "mystic") {
    for (let k = 0; k < 4; k++) {
      const t2 = (k * Math.PI) / 2;
      g.lineTo(Math.sin(t2) * r * 1.25, -Math.cos(t2) * r * 1.25);
      g.lineTo(Math.sin(t2 + 0.785) * r * 0.42, -Math.cos(t2 + 0.785) * r * 0.42);
    }
    g.closePath();
  } else if (a === "siege") {
    for (let k = 0; k < 6; k++) {
      const t2 = (k * Math.PI) / 3 + Math.PI / 6;
      const px = Math.cos(t2) * r * 1.1,
        py = Math.sin(t2) * r * 1.1;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
  } else {
    g.moveTo(0, -r * 1.25);
    g.lineTo(r * 1.05, r * 0.3);
    g.lineTo(0, -r * 0.1);
    g.lineTo(-r * 1.05, r * 0.3);
    g.closePath();
  }
  g.fillStyle = P.cloth;
  g.fill();
  g.lineWidth = Math.max(0.8, 1.35 * S);
  g.lineJoin = "round";
  g.strokeStyle = u.side === 0 ? "rgba(12,26,48,.85)" : "rgba(46,12,10,.85)";
  g.stroke();
  g.restore();
}
