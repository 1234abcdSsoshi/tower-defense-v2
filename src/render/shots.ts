import { GY, SC, sx } from "@/render/viewport";
import { G } from "@/sim/state";

/* ---------- 飛び道具 ---------- */
export function drawShots(c: CanvasRenderingContext2D, t: number): void {
  for (let i = 0; i < G.shots.length; i++) {
    const s = G.shots[i],
      p = s.p < 1 ? s.p : 1;
    const arc = s.arc || 0;
    const x = s.x0 + (s.x1 - s.x0) * p,
      y = s.y0 + (s.y1 - s.y0) * p + arc * Math.sin(p * Math.PI);
    const dp = p + 0.02 < 1 ? p + 0.02 : 1;
    const nx = s.x0 + (s.x1 - s.x0) * dp,
      ny = s.y0 + (s.y1 - s.y0) * dp + arc * Math.sin(dp * Math.PI);
    const ang = Math.atan2(-(ny - y), nx - x || s.dir * 0.001);
    const S = SC * (1 - (s.z || 0) * 0.17);
    c.save();
    c.translate(sx(x), GY - y * SC - (s.z || 0) * 13 * SC);
    c.rotate(ang);
    if (s.kind === "arrow") {
      c.lineCap = "butt";
      c.strokeStyle = "rgba(18,15,11,.9)";
      c.lineWidth = 2.4 * S;
      c.beginPath();
      c.moveTo(-7.5 * S, 0);
      c.lineTo(4 * S, 0);
      c.stroke();
      c.strokeStyle = s.col;
      c.lineWidth = 1.2 * S;
      c.beginPath();
      c.moveTo(-7.5 * S, 0);
      c.lineTo(4 * S, 0);
      c.stroke();
      c.fillStyle = "#DCE0E4";
      c.beginPath();
      c.moveTo(4 * S, -1.7 * S);
      c.lineTo(8.4 * S, 0);
      c.lineTo(4 * S, 1.7 * S);
      c.closePath();
      c.fill();
      c.fillStyle = "rgba(242,236,226,.85)";
      c.fillRect(-8.6 * S, -1.9 * S, 2.5 * S, 3.8 * S);
    } else if (s.kind === "bullet") {
      c.globalAlpha = 0.5;
      c.strokeStyle = s.col;
      c.lineWidth = 1.6 * S;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-17 * S, 0);
      c.lineTo(0, 0);
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = "#FFF7DC";
      c.beginPath();
      c.ellipse(0, 0, 3.1 * S, 1.35 * S, 0, 0, 7);
      c.fill();
    } else if (s.kind === "bolt") {
      c.globalAlpha = 0.3;
      c.fillStyle = s.col;
      c.beginPath();
      c.ellipse(-7 * S, 0, 11 * S, 2.8 * S, 0, 0, 7);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(0, 0, 3.1 * S, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.88)";
      c.beginPath();
      c.arc(0, 0, 1.4 * S, 0, 7);
      c.fill();
    } else if (s.kind === "orb") {
      const pu = 0.85 + 0.15 * Math.sin(t * 11 + s.x0);
      c.fillStyle = s.col;
      c.globalAlpha = 0.26;
      c.beginPath();
      c.arc(0, 0, 7.6 * S * pu, 0, 7);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(0, 0, 3.5 * S * pu, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.82)";
      c.beginPath();
      c.arc(-1.1 * S, -1.1 * S, 1.4 * S, 0, 7);
      c.fill();
    } else {
      c.fillStyle = "rgba(16,14,12,.85)";
      c.beginPath();
      c.ellipse(0, 0, 4.8 * S, 3.5 * S, 0, 0, 7);
      c.fill();
      c.fillStyle = s.col;
      c.beginPath();
      c.ellipse(-0.4 * S, -1.0 * S, 3.7 * S, 2.2 * S, 0, 0, 7);
      c.fill();
    }
    c.restore();
  }
}
