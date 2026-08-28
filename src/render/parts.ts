import { mixK, mixW, shade } from "@/render/color";
import { DRK, pbox, ppath } from "@/render/primitives";
import { DET } from "@/render/quality";
import type { EraPalette } from "@/data/types";

export function drawHat(
  c: CanvasRenderingContext2D,
  type: string,
  P: EraPalette,
  hw: number,
  hy: number,
  S: number,
  K: string,
): void {
  const M = P.metal,
    C = P.cloth2,
    A = P.accent,
    L = mixW(P.cloth, 0.1);
  if (type === "fur") {
    const b = () => {
      c.beginPath();
      c.moveTo(-hw * 1.3, hy + 2 * S);
      for (let i = 0; i < 6; i++) c.lineTo(-hw * 1.3 + hw * 0.52 * i, hy - (i % 2 ? 6 : 2.6) * S);
      c.lineTo(hw * 1.3, hy + 2 * S);
      c.closePath();
    };
    ppath(c, b, C, S, hy - 6 * S, hy + 2 * S, true, K);
  } else if (type === "kanmuri") {
    pbox(c, -hw * 0.92, hy - 6.4 * S, hw * 1.84, 6.6 * S, C, S);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.2 * S);
    c.strokeRect(-hw * 0.92, hy - 6.4 * S, hw * 1.84, 6.6 * S);
    c.fillStyle = shade(C, 0.72);
    c.fillRect(-hw * 1.1, hy - 0.4 * S, hw * 2.2, 2.2 * S);
    const t2 = () => {
      c.beginPath();
      c.moveTo(-hw * 0.3, hy - 6.4 * S);
      c.lineTo(-hw * 0.1, hy - 13.4 * S);
      c.lineTo(hw * 0.34, hy - 13.0 * S);
      c.lineTo(hw * 0.16, hy - 6.4 * S);
      c.closePath();
    };
    ppath(c, t2, L, S, hy - 13.4 * S, hy - 6.4 * S, true, K);
  } else if (type === "band") {
    pbox(c, -hw * 1.15, hy - 1.8 * S, hw * 2.3, 3.0 * S, L, S);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.strokeRect(-hw * 1.15, hy - 1.8 * S, hw * 2.3, 3.0 * S);
  } else if (type === "haniwa") {
    pbox(c, -hw * 1.05, hy - 6.6 * S, hw * 2.1, 7.0 * S, P.cloth, S);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.2 * S);
    c.strokeRect(-hw * 1.05, hy - 6.6 * S, hw * 2.1, 7.0 * S);
    c.fillStyle = K;
    c.fillRect(-hw * 0.55, hy - 4.6 * S, 2.0 * S, 2.2 * S);
    c.fillRect(hw * 0.12, hy - 4.6 * S, 2.0 * S, 2.2 * S);
  } else if (type === "kabuto") {
    const b = () => {
      c.beginPath();
      c.arc(0, hy - 1.2 * S, hw * 1.28, Math.PI, 0);
      c.closePath();
    };
    ppath(c, b, M, S, hy - 1.2 * S - hw * 1.28, hy - 1.2 * S, true, K);
    pbox(c, -hw * 1.78, hy - 2.4 * S, hw * 0.74, 4.8 * S, M, S);
    pbox(c, hw * 1.04, hy - 2.4 * S, hw * 0.74, 4.8 * S, M, S);
    const f = () => {
      c.beginPath();
      c.moveTo(-hw * 0.85, hy - 4.2 * S);
      c.lineTo(0, hy - 12 * S);
      c.lineTo(hw * 0.85, hy - 4.2 * S);
      c.closePath();
    };
    ppath(c, f, L, S, hy - 12 * S, hy - 4.2 * S, true, K);
  } else if (type === "jingasa") {
    const b = () => {
      c.beginPath();
      c.moveTo(-hw * 1.9, hy + 0.6 * S);
      c.lineTo(0, hy - 8.2 * S);
      c.lineTo(hw * 1.9, hy + 0.6 * S);
      c.closePath();
    };
    ppath(c, b, M, S, hy - 8.2 * S, hy + 0.6 * S, true, K);
  } else if (type === "hachimaki") {
    pbox(c, -hw * 1.2, hy - 2.0 * S, hw * 2.4, 2.9 * S, L, S);
    c.fillStyle = shade(A, DRK);
    c.fillRect(hw * 1.05, hy - 2.6 * S, 3.6 * S, 1.8 * S);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.strokeRect(-hw * 1.2, hy - 2.0 * S, hw * 2.4, 2.9 * S);
  } else if (type === "cap") {
    pbox(c, -hw * 1.12, hy - 5.0 * S, hw * 2.24, 5.0 * S, C, S);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.2 * S);
    c.strokeRect(-hw * 1.12, hy - 5.0 * S, hw * 2.24, 5.0 * S);
    pbox(c, hw * 0.55, hy - 1.5 * S, hw * 1.6, 1.9 * S, shade(C, 0.8), S, false);
    c.fillStyle = L;
    c.fillRect(-hw * 0.42, hy - 4.4 * S, hw * 0.84, 2.1 * S);
  } else if (type === "visor") {
    const b = () => {
      c.beginPath();
      c.arc(0, hy - 0.6 * S, hw * 1.18, Math.PI, 0);
      c.closePath();
    };
    ppath(c, b, C, S, hy - 0.6 * S - hw * 1.18, hy - 0.6 * S, true, K);
    c.fillStyle = A;
    c.fillRect(-hw * 1.08, hy - 2.9 * S, hw * 2.16, 2.1 * S);
    c.globalAlpha = 0.4;
    c.fillRect(-hw * 1.3, hy - 2.9 * S, hw * 2.6, 2.1 * S);
    c.globalAlpha = 1;
  }
}
export function torsoTex(
  c: CanvasRenderingContext2D,
  tex: string,
  P: EraPalette,
  x: number,
  y: number,
  w: number,
  h: number,
  S: number,
  K: string,
): void {
  if (!DET || S < 0.5) return;
  if (tex === "plate") {
    c.fillStyle = K;
    c.globalAlpha = 0.42;
    for (let i = 1; i < 4; i++) c.fillRect(x, y + (h * i) / 4, w, Math.max(0.8, 1.2 * S));
    c.globalAlpha = 1;
  } else if (tex === "clay") {
    c.fillStyle = K;
    c.globalAlpha = 0.5;
    c.fillRect(x + w * 0.24, y + h * 0.3, 2.0 * S, 2.0 * S);
    c.fillRect(x + w * 0.58, y + h * 0.52, 2.0 * S, 2.0 * S);
    c.globalAlpha = 1;
  } else if (tex === "uniform") {
    c.fillStyle = K;
    c.globalAlpha = 0.45;
    c.fillRect(x, y + h * 0.62, w, 2.4 * S);
    c.globalAlpha = 1;
    c.fillStyle = shade(P.metal, 1.1);
    c.fillRect(x + w * 0.42, y + h * 0.16, 2.0 * S, 2.0 * S);
    c.fillRect(x + w * 0.42, y + h * 0.36, 2.0 * S, 2.0 * S);
  } else if (tex === "tech") {
    c.fillStyle = P.accent;
    c.fillRect(x + w * 0.16, y + h * 0.3, w * 0.68, 1.7 * S);
    c.globalAlpha = 0.55;
    c.fillRect(x + w * 0.3, y + h * 0.54, w * 0.4, 1.3 * S);
    c.globalAlpha = 1;
  } else if (tex === "fur") {
    c.fillStyle = shade(P.cloth2, DRK * 0.9);
    c.beginPath();
    c.moveTo(x, y + h);
    for (let i = 0; i < 6; i++) c.lineTo(x + (w * i) / 5, y + h - (i % 2 ? 3.6 : 1.0) * S);
    c.lineTo(x + w, y + h);
    c.closePath();
    c.fill();
  }
}

/* ---------- 機巧：人体ではなく兵器として描く ----------
   造る者は小さな二輪砲、轟く者は低く長い四輪の臼砲。輪郭だけで見分くようにする。 */
export function wheel(
  c: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  wr: number,
  cloth2: string,
  metal: string,
  K: string,
  S: number,
  spin: number,
): void {
  c.fillStyle = mixK(cloth2, 0.42);
  c.beginPath();
  c.arc(wx, wy, wr, 0, 7);
  c.fill();
  c.strokeStyle = K;
  c.lineWidth = Math.max(0.9, 1.4 * S);
  c.beginPath();
  c.arc(wx, wy, wr, 0, 7);
  c.stroke();
  c.strokeStyle = mixW(cloth2, 0.16);
  c.lineWidth = Math.max(0.7, 1.1 * S);
  for (let k = 0; k < (DET ? 4 : 0); k++) {
    const a = k * 0.785 + spin;
    c.beginPath();
    c.moveTo(wx - Math.cos(a) * wr * 0.82, wy - Math.sin(a) * wr * 0.82);
    c.lineTo(wx + Math.cos(a) * wr * 0.82, wy + Math.sin(a) * wr * 0.82);
    c.stroke();
  }
  c.fillStyle = mixW(metal, 0.1);
  c.beginPath();
  c.arc(wx, wy, wr * 0.3, 0, 7);
  c.fill();
}
