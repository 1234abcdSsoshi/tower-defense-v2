import { BAL, ERAS } from "@/data/master";
import { mixK, mixW, rgba, shade } from "@/render/color";
import { inkOf, outline, ppath } from "@/render/primitives";
import { GY, SC, sx } from "@/render/viewport";
import type { Side } from "@/sim/types";

/* ---------- 拠点：時代ごとに姿が変わる ---------- */
export function drawCastle(
  c: CanvasRenderingContext2D,
  side: Side,
  era: number,
  hpRatio: number,
  shake: number,
): void {
  const E = ERAS[era],
    P = E.P || E.pal,
    S = SC,
    K = inkOf(P);
  const x = sx(side === 0 ? BAL.laneL - 6 : BAL.laneR + 6);
  c.save();
  c.translate(x + shake, GY);
  if (side === 1) c.scale(-1, 1);
  const w = 56 * S,
    h = 80 * S,
    kind = E.castle || "pit";
  const roof = (cx: number, y: number, hw: number, rise: number, col: string): void => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(cx - hw, y);
    c.lineTo(cx, y - rise);
    c.lineTo(cx + hw, y);
    c.closePath();
    c.fill();
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.stroke();
  };
  c.fillStyle = "rgba(0,0,0,.32)";
  c.beginPath();
  c.ellipse(0, 0, w * 0.66, 4.8 * S, 0, 0, 7);
  c.fill();

  if (kind === "pit") {
    // 竪穴住居
    c.fillStyle = shade(P.cloth2, 0.55);
    c.beginPath();
    c.ellipse(0, 0, w * 0.72, 9 * S, 0, Math.PI, 0);
    c.fill();
    const rf = () => {
      c.beginPath();
      c.moveTo(-w * 0.8, 0);
      c.lineTo(0, -h * 0.94);
      c.lineTo(w * 0.8, 0);
      c.closePath();
    };
    ppath(c, rf, mixW(P.cloth, 0.05), S, -h * 0.94, 0, true, K);
    outline(c, rf, S, K);
    c.strokeStyle = mixK(P.cloth, 0.36);
    c.lineWidth = Math.max(0.8, 1.2 * S);
    for (let k = -3; k <= 3; k++) {
      c.beginPath();
      c.moveTo(k * w * 0.2, 0);
      c.lineTo(0, -h * 0.9);
      c.stroke();
    }
    c.fillStyle = "#0A0D12";
    c.fillRect(-w * 0.14, -h * 0.3, w * 0.28, h * 0.3);
    c.strokeStyle = mixK(P.metal, 0.3);
    c.lineWidth = Math.max(1, 1.7 * S);
    c.beginPath();
    c.moveTo(-w * 0.2, -h * 0.86);
    c.lineTo(w * 0.16, -h * 1.03);
    c.moveTo(w * 0.2, -h * 0.86);
    c.lineTo(-w * 0.16, -h * 1.03);
    c.stroke();
  } else if (kind === "shinden") {
    // 寝殿造の館
    c.fillStyle = shade(P.cloth2, 0.5);
    c.fillRect(-w * 0.72, -h * 0.14, w * 1.44, h * 0.14);
    const bd = () => {
      c.beginPath();
      c.rect(-w * 0.62, -h * 0.62, w * 1.24, h * 0.48);
      c.closePath();
    };
    ppath(c, bd, mixW(P.cloth, 0.08), S, -h * 0.62, -h * 0.14, true, K);
    c.fillStyle = shade(P.accent, 0.72);
    for (let k = 0; k < 5; k++) c.fillRect(-w * 0.54 + k * w * 0.26, -h * 0.6, w * 0.075, h * 0.44);
    roof(0, -h * 0.62, w * 0.86, h * 0.34, shade(P.cloth2, 0.8));
    roof(0, -h * 0.86, w * 0.52, h * 0.22, shade(P.cloth2, 0.92));
    c.fillStyle = shade(P.metal, 0.66);
    c.fillRect(-w * 0.68, -h * 0.66, w * 1.36, 3 * S);
    c.fillStyle = "#0A0D12";
    c.fillRect(-w * 0.12, -h * 0.4, w * 0.24, h * 0.26);
  } else if (kind === "yamajiro") {
    // 山城の櫓
    const base = () => {
      c.beginPath();
      c.moveTo(-w * 0.78, 0);
      c.lineTo(-w * 0.56, -h * 0.34);
      c.lineTo(w * 0.56, -h * 0.34);
      c.lineTo(w * 0.78, 0);
      c.closePath();
    };
    ppath(c, base, shade(P.metal, 0.44), S, -h * 0.34, 0, true, K);
    c.strokeStyle = "rgba(0,0,0,.26)";
    c.lineWidth = Math.max(0.7, 1 * S);
    for (let r = 0; r < 3; r++) {
      const yy = -h * 0.34 + r * h * 0.11;
      c.beginPath();
      c.moveTo(-w * 0.74 + r * w * 0.07, yy);
      c.lineTo(w * 0.74 - r * w * 0.07, yy);
      c.stroke();
    }
    for (let k = 0; k < 2; k++) {
      const ww = w * (0.52 - k * 0.16),
        yy = -h * (0.34 + k * 0.26);
      const bd = () => {
        c.beginPath();
        c.rect(-ww, yy - h * 0.24, ww * 2, h * 0.24);
        c.closePath();
      };
      ppath(c, bd, mixW(P.cloth2, 0.14 + k * 0.06), S, yy - h * 0.24, yy, true, K);
      c.fillStyle = "#0A0D12";
      c.fillRect(-ww * 0.5, yy - h * 0.18, ww * 0.28, h * 0.1);
      roof(0, yy - h * 0.24, ww + w * 0.09, h * 0.13, shade(P.metal, 0.5));
    }
  } else if (kind === "joka") {
    // 天守
    const base = () => {
      c.beginPath();
      c.moveTo(-w * 0.8, 0);
      c.lineTo(-w * 0.58, -h * 0.3);
      c.lineTo(w * 0.58, -h * 0.3);
      c.lineTo(w * 0.8, 0);
      c.closePath();
    };
    ppath(c, base, shade(P.metal, 0.4), S, -h * 0.3, 0, true, K);
    for (let k = 0; k < 3; k++) {
      const ww = w * (0.5 - k * 0.13),
        yy = -h * (0.3 + k * 0.245);
      const bd = () => {
        c.beginPath();
        c.rect(-ww, yy - h * 0.22, ww * 2, h * 0.22);
        c.closePath();
      };
      ppath(c, bd, mixW(P.cloth2, 0.3 - k * 0.04), S, yy - h * 0.22, yy, true, K);
      c.fillStyle = shade(P.cloth2, 0.42);
      for (let q = 0; q < 2; q++) c.fillRect(-ww * 0.6 + q * ww * 0.72, yy - h * 0.17, ww * 0.3, h * 0.075);
      roof(0, yy - h * 0.22, ww + w * 0.11, h * 0.12, shade(P.cloth2, 0.62));
      if (k < 2) {
        c.fillStyle = shade(P.cloth2, 0.62);
        c.beginPath();
        c.moveTo(-ww * 0.34, yy - h * 0.22);
        c.lineTo(0, yy - h * 0.33);
        c.lineTo(ww * 0.34, yy - h * 0.22);
        c.closePath();
        c.fill();
      }
    }
    c.fillStyle = P.accent;
    c.beginPath();
    c.ellipse(-w * 0.16, -h * 1.03, 3.0 * S, 4.6 * S, 0.3, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(w * 0.16, -h * 1.03, 3.0 * S, 4.6 * S, -0.3, 0, 7);
    c.fill();
  } else if (kind === "fort") {
    // 煉瓦の砲台
    const bd = () => {
      c.beginPath();
      c.rect(-w * 0.68, -h * 0.7, w * 1.36, h * 0.7);
      c.closePath();
    };
    ppath(c, bd, mixW(P.cloth2, 0.1), S, -h * 0.7, 0, true, K);
    c.strokeStyle = "rgba(0,0,0,.22)";
    c.lineWidth = Math.max(0.7, 1 * S);
    for (let r = 1; r < 7; r++) {
      const yy = -h * 0.7 + r * h * 0.1;
      c.beginPath();
      c.moveTo(-w * 0.68, yy);
      c.lineTo(w * 0.68, yy);
      c.stroke();
    }
    c.fillStyle = shade(P.metal, 0.62);
    for (let k = 0; k < 5; k++) c.fillRect(-w * 0.66 + k * w * 0.29, -h * 0.8, w * 0.19, h * 0.1);
    c.fillStyle = "#0A0D12";
    c.fillRect(-w * 0.44, -h * 0.46, w * 0.22, h * 0.12);
    c.fillRect(w * 0.24, -h * 0.46, w * 0.22, h * 0.12);
    c.fillStyle = shade(P.metal, 0.52);
    c.fillRect(-w * 0.1, -h * 0.5, w * 0.52, 5.4 * S);
    c.fillStyle = shade(P.metal, 0.7);
    c.fillRect(w * 0.3, -h * 1.24, 2.4 * S, h * 0.46);
    c.fillStyle = P.accent;
    c.fillRect(w * 0.33, -h * 1.24, w * 0.28, h * 0.13);
    c.fillStyle = "#0A0D12";
    c.fillRect(-w * 0.13, -h * 0.3, w * 0.26, h * 0.3);
  } else {
    // 現代の司令部
    const bd = () => {
      c.beginPath();
      c.rect(-w * 0.62, -h * 1.02, w * 1.24, h * 1.02);
      c.closePath();
    };
    ppath(c, bd, mixW(P.cloth2, 0.08), S, -h * 1.02, 0, true, K);
    c.fillStyle = rgba(P.accent, 0.62);
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < 4; q++) {
        if ((r * 4 + q) % 3 === 0) continue;
        c.fillRect(-w * 0.5 + q * w * 0.27, -h * 0.94 + r * h * 0.17, w * 0.17, h * 0.09);
      }
    c.fillStyle = shade(P.metal, 0.62);
    c.fillRect(-w * 0.7, -h * 1.08, w * 1.4, h * 0.08);
    c.strokeStyle = shade(P.metal, 0.72);
    c.lineWidth = Math.max(1, 1.8 * S);
    c.beginPath();
    c.moveTo(w * 0.34, -h * 1.08);
    c.lineTo(w * 0.34, -h * 1.42);
    c.stroke();
    c.fillStyle = P.accent;
    c.beginPath();
    c.arc(w * 0.34, -h * 1.44, 2.6 * S, 0, 7);
    c.fill();
    c.save();
    c.translate(-w * 0.3, -h * 1.16);
    c.rotate(-0.5);
    c.fillStyle = shade(P.metal, 0.8);
    c.beginPath();
    c.ellipse(0, 0, 7.5 * S, 3.0 * S, 0, 0, 7);
    c.fill();
    c.restore();
    c.fillStyle = "#0A0D12";
    c.fillRect(-w * 0.13, -h * 0.26, w * 0.26, h * 0.26);
  }
  c.fillStyle = side === 0 ? "rgba(78,134,198,.9)" : "rgba(216,82,58,.9)";
  c.fillRect(-w * 0.5, -h * 0.06, w * 1.0, 3 * S);
  // 損傷
  if (hpRatio < 0.6) {
    c.fillStyle = "rgba(0,0,0,.4)";
    c.beginPath();
    c.moveTo(-w * 0.4, -h * 0.6);
    c.lineTo(-w * 0.1, -h * 0.3);
    c.lineTo(-w * 0.32, -h * 0.12);
    c.closePath();
    c.fill();
  }
  if (hpRatio < 0.3) {
    c.fillStyle = "rgba(0,0,0,.45)";
    c.beginPath();
    c.moveTo(w * 0.1, -h * 0.62);
    c.lineTo(w * 0.42, -h * 0.34);
    c.lineTo(w * 0.18, -h * 0.08);
    c.closePath();
    c.fill();
  }
  c.restore();
}
