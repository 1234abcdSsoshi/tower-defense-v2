import { mixK, mixW, shade } from "@/render/color";
import { blend } from "@/render/palette";
import { limb, ppath } from "@/render/primitives";
import { DET } from "@/render/quality";
import type { EraPalette } from "@/data/types";
import type { Drawable } from "@/sim/types";

/* ---------- 妖：呼び出された味方 ---------- */
export const MON_COL: Record<string, string> = {
  kappa: "#5E8C5A",
  snake: "#6E7A4A",
  oni: "#C44536",
  tengu: "#A83A3A",
  kamaitachi: "#C8A45E",
  yamata: "#4A5A6E",
};
export function drawYokai(
  c: CanvasRenderingContext2D,
  u: Drawable,
  S: number,
  P: EraPalette,
  K: string,
  t: number,
): void {
  const BS = Math.max(1, u.w / 2.0);
  if (BS !== 1) c.scale(BS, BS);
  const kw = 15 * (u.w / BS) * S,
    art = u.art || "oni",
    ph = t * 2.4 + u.x * 0.07;
  const base = MON_COL[art] || "#7A6A8C";
  const body = blend(base, P.cloth, 0.1),
    body2 = shade(body, 0.72),
    met = P.metal;
  const sw = u.atkA > 0 ? 1 - Math.abs(1 - u.atkA - 0.46) * 2.4 : 0;

  if (art === "kappa") {
    const bob = Math.abs(Math.sin(ph)) * 1.6 * S;
    // 脚
    const leg = mixK(body2, 0.24);
    limb(c, -kw * 0.3, -14 * S, -kw * 0.4, -0.6 * S, 4.2 * S, leg, S, K);
    limb(c, kw * 0.24, -14 * S, kw * 0.34, -0.6 * S, 4.2 * S, leg, S, K);
    // 甲羅（背中側）
    const sh = () => {
      c.beginPath();
      c.ellipse(-kw * 0.34, -19 * S - bob, kw * 0.6, 11 * S, -0.1, 0, 7);
      c.closePath();
    };
    ppath(c, sh, mixK(body, 0.26), S, -30 * S, -8 * S, true, K);
    // 胴
    const bd = () => {
      c.beginPath();
      c.ellipse(0, -19 * S - bob, kw * 0.62, 10.4 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, bd, body, S, -30 * S, -9 * S, true, K);
    // 腕（平手）
    const hx = kw * (0.62 + sw * 0.52),
      hy = -22 * S - bob + sw * 3 * S;
    limb(c, kw * 0.34, -22 * S - bob, hx, hy, 3.4 * S, body, S, K);
    const pw2 = () => {
      c.beginPath();
      c.ellipse(hx + 3 * S, hy, 5.4 * S, 3.6 * S, 0.2, 0, 7);
      c.closePath();
    };
    ppath(c, pw2, mixW(body, 0.14), S, hy - 4 * S, hy + 4 * S, true, K);
    // 頭と嘴
    const hd = () => {
      c.beginPath();
      c.arc(kw * 0.14, -34 * S - bob, 8.4 * S, 0, 7);
      c.closePath();
    };
    ppath(c, hd, mixW(body, 0.06), S, -43 * S, -26 * S, true, K);
    const bk = () => {
      c.beginPath();
      c.moveTo(kw * 0.14 + 6.4 * S, -35 * S - bob);
      c.lineTo(kw * 0.14 + 14 * S, -32.6 * S - bob);
      c.lineTo(kw * 0.14 + 6.4 * S, -30.4 * S - bob);
      c.closePath();
    };
    ppath(c, bk, "#E0C46A", S, -36 * S, -30 * S, true, K);
    c.fillStyle = "#241812";
    c.beginPath();
    c.arc(kw * 0.14 + 4.6 * S, -36.6 * S - bob, 1.7 * S, 0, 7);
    c.fill();
    // 皿
    const dish = () => {
      c.beginPath();
      c.ellipse(kw * 0.14, -42.4 * S - bob, 6.6 * S, 2.4 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, dish, "#CFE4E8", S, -45 * S, -40 * S, true, K);
    c.fillStyle = "rgba(150,206,214,.9)";
    c.beginPath();
    c.ellipse(kw * 0.14, -42.8 * S - bob, 4.6 * S, 1.5 * S, 0, 0, 7);
    c.fill();
  } else if (art === "snake") {
    // とぐろ
    const co = () => {
      c.beginPath();
      c.ellipse(-kw * 0.18, -9 * S, kw * 1.0, 8.2 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, co, body2, S, -18 * S, -1 * S, true, K);
    const co2 = () => {
      c.beginPath();
      c.ellipse(-kw * 0.06, -20 * S, kw * 0.72, 7.0 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, co2, body, S, -28 * S, -13 * S, true, K);
    // 立ち上がる首
    const nk = () => {
      c.beginPath();
      c.moveTo(-kw * 0.1, -24 * S);
      c.quadraticCurveTo(kw * 0.44, -34 * S, kw * 0.3, -48 * S);
      c.quadraticCurveTo(kw * 0.16, -36 * S, -kw * 0.3, -24 * S);
      c.closePath();
    };
    ppath(c, nk, body, S, -48 * S, -24 * S, true, K);
    // 頭
    const hd = () => {
      c.beginPath();
      c.moveTo(kw * 0.16, -50 * S);
      c.lineTo(kw * 0.86, -53 * S);
      c.lineTo(kw * 0.9, -45 * S);
      c.lineTo(kw * 0.18, -43 * S);
      c.closePath();
    };
    ppath(c, hd, mixW(body, 0.08), S, -53 * S, -43 * S, true, K);
    c.fillStyle = "#F0C165";
    c.beginPath();
    c.arc(kw * 0.56, -50 * S, 2.2 * S, 0, 7);
    c.fill();
    // 舌
    c.strokeStyle = "#C4436A";
    c.lineWidth = Math.max(1, 1.6 * S);
    c.lineCap = "round";
    const tl = kw * (0.9 + sw * 0.3);
    c.beginPath();
    c.moveTo(kw * 0.88, -48 * S);
    c.lineTo(tl + 6 * S, -47 * S);
    c.moveTo(tl + 6 * S, -47 * S);
    c.lineTo(tl + 11 * S, -49.6 * S);
    c.moveTo(tl + 6 * S, -47 * S);
    c.lineTo(tl + 11 * S, -44.6 * S);
    c.stroke();
    // 毒の滴
    if (DET) {
      c.fillStyle = "rgba(150,214,110,.72)";
      for (let k = 0; k < 3; k++) {
        const yy = -44 * S + ((t * 30 + k * 13) % 16) * S;
        c.beginPath();
        c.ellipse(kw * (0.78 + k * 0.05), yy, 1.8 * S, 2.6 * S, 0, 0, 7);
        c.fill();
      }
    }
    // 鱗の帯
    c.strokeStyle = mixK(body2, 0.24);
    c.lineWidth = Math.max(0.8, 1.3 * S);
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.moveTo(-kw * 0.7 + k * kw * 0.34, -26 * S);
      c.lineTo(-kw * 0.62 + k * kw * 0.34, -14 * S);
      c.stroke();
    }
  } else if (art === "oni") {
    const bob = Math.abs(Math.sin(ph)) * 1.5 * S;
    const leg = mixK(body2, 0.26);
    limb(c, -kw * 0.26, -20 * S, -kw * 0.38, -0.6 * S, 5.4 * S, leg, S, K);
    limb(c, kw * 0.22, -20 * S, kw * 0.32, -0.6 * S, 5.4 * S, leg, S, K);
    // 胴
    const bd = () => {
      c.beginPath();
      c.ellipse(0, -30 * S - bob, kw * 0.66, 13 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, bd, body, S, -44 * S, -17 * S, true, K);
    // 虎の腰布
    c.fillStyle = "#D8B048";
    c.fillRect(-kw * 0.6, -24 * S - bob, kw * 1.2, 7.4 * S);
    c.fillStyle = "#2A2018";
    for (let k = 0; k < 4; k++) c.fillRect(-kw * 0.48 + k * kw * 0.3, -24 * S - bob, kw * 0.09, 7.4 * S);
    // 腕と金棒
    const hx = kw * (0.72 + sw * 0.66),
      hy = -40 * S - bob + sw * 10 * S;
    limb(c, kw * 0.44, -38 * S - bob, hx, hy, 5.0 * S, body, S, K);
    c.save();
    c.translate(hx, hy);
    c.rotate(-1.05 + sw * 1.7);
    const cl = () => {
      c.beginPath();
      c.moveTo(-3.4 * S, 2 * S);
      c.lineTo(-5.0 * S, -30 * S);
      c.lineTo(5.0 * S, -30 * S);
      c.lineTo(3.4 * S, 2 * S);
      c.closePath();
    };
    ppath(c, cl, mixK(met, 0.2), S, -30 * S, 2 * S, true, K);
    if (DET) {
      c.fillStyle = mixW(met, 0.3);
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.arc(-3.6 * S, -6 * S - k * 7 * S, 1.6 * S, 0, 7);
        c.fill();
        c.beginPath();
        c.arc(3.6 * S, -6 * S - k * 7 * S, 1.6 * S, 0, 7);
        c.fill();
      }
    }
    c.restore();
    // 頭
    const hd = () => {
      c.beginPath();
      c.arc(kw * 0.1, -52 * S - bob, 10.4 * S, 0, 7);
      c.closePath();
    };
    ppath(c, hd, mixW(body, 0.08), S, -63 * S, -41 * S, true, K);
    // 角
    for (const sgn of [-1, 1]) {
      const hn = () => {
        c.beginPath();
        c.moveTo(kw * 0.1 + sgn * 5.4 * S, -60 * S - bob);
        c.quadraticCurveTo(kw * 0.1 + sgn * 9 * S, -72 * S - bob, kw * 0.1 + sgn * 4.4 * S, -74 * S - bob);
        c.quadraticCurveTo(kw * 0.1 + sgn * 5.2 * S, -66 * S - bob, kw * 0.1 + sgn * 1.8 * S, -60 * S - bob);
        c.closePath();
      };
      ppath(c, hn, "#EDE6D2", S, -74 * S, -60 * S, true, K);
    }
    // 顔
    c.fillStyle = "#F0C165";
    c.beginPath();
    c.arc(kw * 0.1 + 3.4 * S, -54 * S - bob, 2.2 * S, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(kw * 0.1 - 3.4 * S, -54 * S - bob, 2.2 * S, 0, 7);
    c.fill();
    c.fillStyle = "#EDE6D2";
    c.fillRect(kw * 0.1 - 4.4 * S, -48 * S - bob, 8.8 * S, 2.4 * S);
    c.strokeStyle = "#2A1A16";
    c.lineWidth = Math.max(0.8, 1.2 * S);
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(kw * 0.1 - 3.4 * S + k * 3.4 * S, -48 * S - bob);
      c.lineTo(kw * 0.1 - 3.4 * S + k * 3.4 * S, -45.6 * S - bob);
      c.stroke();
    }
  } else if (art === "tengu") {
    const fl = Math.sin(ph * 0.9) * 2.4 * S;
    // 翼
    for (const sgn of [-1, 1]) {
      const wg = () => {
        c.beginPath();
        c.moveTo(sgn * kw * 0.2, -42 * S + fl);
        c.quadraticCurveTo(sgn * kw * 1.3, -58 * S + fl, sgn * kw * 1.06, -24 * S + fl);
        c.quadraticCurveTo(sgn * kw * 0.72, -32 * S + fl, sgn * kw * 0.2, -30 * S + fl);
        c.closePath();
      };
      ppath(c, wg, "#2E2A32", S, -58 * S, -24 * S, true, K);
      c.strokeStyle = "#4A4450";
      c.lineWidth = Math.max(0.8, 1.2 * S);
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(sgn * kw * (0.3 + k * 0.2), -38 * S + fl);
        c.lineTo(sgn * kw * (0.42 + k * 0.2), -27 * S + fl);
        c.stroke();
      }
    }
    // 高下駄と脚
    const leg = mixK(body2, 0.24);
    limb(c, -kw * 0.2, -20 * S, -kw * 0.26, -4 * S, 4.0 * S, leg, S, K);
    limb(c, kw * 0.18, -20 * S, kw * 0.24, -4 * S, 4.0 * S, leg, S, K);
    c.fillStyle = mixK("#6E4A2E", 0.06);
    c.fillRect(-kw * 0.4, -5 * S, kw * 0.34, 4.4 * S);
    c.fillRect(kw * 0.06, -5 * S, kw * 0.34, 4.4 * S);
    // 山伏の装束
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 0.52, -46 * S + fl);
      c.lineTo(kw * 0.52, -46 * S + fl);
      c.lineTo(kw * 0.64, -16 * S);
      c.lineTo(-kw * 0.64, -16 * S);
      c.closePath();
    };
    ppath(c, bd, body, S, -46 * S, -16 * S, true, K);
    c.fillStyle = mixW(P.accent, 0.1);
    c.fillRect(-kw * 0.56, -32 * S + fl, kw * 1.12, 3.4 * S);
    // 杖
    const hx = kw * (0.66 + sw * 0.4);
    c.save();
    c.translate(hx, -38 * S + fl);
    c.rotate(-0.28 + sw * 1.1);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.5, 3.0 * S);
    c.beginPath();
    c.moveTo(0, 14 * S);
    c.lineTo(0, -34 * S);
    c.stroke();
    c.strokeStyle = mixK("#6E4A2E", 0.02);
    c.lineWidth = Math.max(1.0, 2.0 * S);
    c.beginPath();
    c.moveTo(0, 14 * S);
    c.lineTo(0, -34 * S);
    c.stroke();
    c.fillStyle = mixW(met, 0.24);
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(0, -34 * S + k * 3.4 * S, 3.0 * S, 0, 7);
      c.fill();
    }
    c.restore();
    limb(c, kw * 0.4, -38 * S + fl, hx, -38 * S + fl, 3.6 * S, body, S, K);
    // 葉団扇（使った直後だけ大きく振る）
    const fan = u.fanFx || 0;
    c.save();
    c.translate(-kw * 0.6, -40 * S + fl);
    c.rotate(-0.5 - fan * 1.2);
    const fa = () => {
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-13 * S, -8 * S, -15 * S, -22 * S);
      c.quadraticCurveTo(-2 * S, -16 * S, 4 * S, -20 * S);
      c.quadraticCurveTo(2 * S, -8 * S, 0, 0);
      c.closePath();
    };
    ppath(c, fa, "#4A7A3E", S, -22 * S, 0, true, K);
    c.restore();
    if (fan > 0) {
      c.globalAlpha = fan * 0.5;
      c.strokeStyle = "#DCEAF2";
      c.lineWidth = Math.max(1.4, 2.8 * S);
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(kw * 0.3, -34 * S, kw * (0.9 + k * 0.42), -0.9, 0.6);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // 頭・鼻
    const hd = () => {
      c.beginPath();
      c.arc(kw * 0.06, -56 * S + fl, 9.0 * S, 0, 7);
      c.closePath();
    };
    ppath(c, hd, "#C4564A", S, -65 * S, -47 * S, true, K);
    const ns = () => {
      c.beginPath();
      c.moveTo(kw * 0.06 + 4 * S, -58 * S + fl);
      c.lineTo(kw * 0.06 + 22 * S, -54 * S + fl);
      c.lineTo(kw * 0.06 + 4 * S, -51 * S + fl);
      c.closePath();
    };
    ppath(c, ns, "#B0463C", S, -58 * S, -51 * S, true, K);
    c.fillStyle = "#241812";
    c.beginPath();
    c.arc(kw * 0.06 + 2.6 * S, -60 * S + fl, 1.9 * S, 0, 7);
    c.fill();
    // 頭巾（兜巾）
    c.fillStyle = mixW(P.cloth, 0.2);
    c.fillRect(kw * 0.06 - 4 * S, -68 * S + fl, 8 * S, 5 * S);
  } else if (art === "kamaitachi") {
    const wh = u.whirlFx || 0;
    // つむじ風
    c.save();
    c.globalAlpha = 0.22 + wh * 0.5;
    c.strokeStyle = "#CFE0EA";
    c.lineWidth = Math.max(1, 1.8 * S);
    for (let k = 0; k < 4; k++) {
      const rr = kw * (0.5 + k * 0.26),
        yy = -6 * S - k * 9 * S;
      c.beginPath();
      c.ellipse(0, yy, rr, rr * 0.26, 0, 0, 7);
      c.stroke();
    }
    c.restore();
    // 胴（いたち）
    const bd = () => {
      c.beginPath();
      c.ellipse(-kw * 0.06, -20 * S, kw * 0.86, 7.6 * S, -0.14, 0, 7);
      c.closePath();
    };
    ppath(c, bd, body, S, -30 * S, -11 * S, true, K);
    // 尾
    c.strokeStyle = mixK(body2, 0.1);
    c.lineWidth = Math.max(2, 4.4 * S);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-kw * 0.8, -20 * S);
    c.quadraticCurveTo(-kw * 1.24, -30 * S + Math.sin(ph) * 3 * S, -kw * 1.1, -38 * S);
    c.stroke();
    // 後脚
    const leg = mixK(body2, 0.24);
    limb(c, -kw * 0.36, -15 * S, -kw * 0.44, -0.6 * S, 3.4 * S, leg, S, K);
    limb(c, kw * 0.1, -15 * S, kw * 0.18, -0.6 * S, 3.4 * S, leg, S, K);
    // 鎌の前脚
    for (let k = 0; k < 2; k++) {
      const oy = -24 * S - k * 5 * S,
        ex = kw * (0.72 + sw * 0.62 + k * 0.06);
      limb(c, kw * 0.36, oy, ex, oy - 4 * S, 3.0 * S, body, S, K);
      c.save();
      c.translate(ex, oy - 4 * S);
      c.rotate(-0.9 + sw * 1.5 + k * 0.2);
      const sc = () => {
        c.beginPath();
        c.moveTo(0, 2 * S);
        c.quadraticCurveTo(11 * S, -6 * S, 7 * S, -19 * S);
        c.quadraticCurveTo(5 * S, -7 * S, -2 * S, 2 * S);
        c.closePath();
      };
      ppath(c, sc, mixW(met, 0.28), S, -19 * S, 2 * S, true, K);
      c.restore();
    }
    // 頭
    const hd = () => {
      c.beginPath();
      c.ellipse(kw * 0.62, -28 * S, 8.0 * S, 6.0 * S, -0.12, 0, 7);
      c.closePath();
    };
    ppath(c, hd, mixW(body, 0.08), S, -35 * S, -21 * S, true, K);
    for (const sgn of [-1, 1]) {
      const er = () => {
        c.beginPath();
        c.moveTo(kw * 0.56 + sgn * 2.6 * S, -33 * S);
        c.lineTo(kw * 0.56 + sgn * 4.4 * S, -40 * S);
        c.lineTo(kw * 0.62 + sgn * 1.0 * S, -33.6 * S);
        c.closePath();
      };
      ppath(c, er, body2, S, -40 * S, -33 * S, true, K);
    }
    c.fillStyle = "#F0C165";
    c.beginPath();
    c.arc(kw * 0.72, -29 * S, 2.0 * S, 0, 7);
    c.fill();
    c.fillStyle = "#241812";
    c.beginPath();
    c.arc(kw * 0.92, -26.4 * S, 1.5 * S, 0, 7);
    c.fill();
  } else {
    // yamata：八岐大蛇
    // とぐろ（三段）
    for (let k = 0; k < 3; k++) {
      const cy = -8 * S - k * 10 * S,
        rx = kw * (1.02 - k * 0.16),
        ry = (9 - k * 1.2) * S;
      const co = () => {
        c.beginPath();
        c.ellipse(-kw * 0.1 + k * 3 * S, cy, rx, ry, 0, 0, 7);
        c.closePath();
      };
      ppath(c, co, k % 2 ? body : body2, S, cy - ry, cy + ry, true, K);
    }
    // 八つの首
    const N = u.heads || 8;
    for (let k = 0; k < N; k++) {
      const a0 = -1.34 + k * (2.05 / (N - 1));
      const sway = Math.sin(ph * 0.9 + k * 0.8) * 0.1;
      const ang = a0 + sway;
      const L0 = kw * 1.36,
        bx = -kw * 0.06 + k * 1.4 * S,
        by = -32 * S;
      const ex = bx + Math.sin(ang) * L0,
        ey = by - Math.cos(ang) * L0 * 0.86;
      const mx = bx + Math.sin(ang * 0.5) * L0 * 0.52,
        my = by - Math.cos(ang * 0.5) * L0 * 0.46;
      // 首
      c.strokeStyle = K;
      c.lineWidth = Math.max(2.2, 5.4 * S);
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(mx, my, ex, ey);
      c.stroke();
      c.strokeStyle = k % 2 ? mixW(body, 0.05) : body;
      c.lineWidth = Math.max(1.5, 3.8 * S);
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(mx, my, ex, ey);
      c.stroke();
      // 頭
      c.save();
      c.translate(ex, ey);
      c.rotate(ang * 0.82);
      const hd = () => {
        c.beginPath();
        c.moveTo(-3.4 * S, 2.6 * S);
        c.lineTo(3.4 * S, 2.6 * S);
        c.lineTo(2.4 * S, -9.6 * S);
        c.lineTo(-2.4 * S, -9.6 * S);
        c.closePath();
      };
      ppath(c, hd, mixW(body, 0.1), S, -9.6 * S, 2.6 * S, true, K);
      c.fillStyle = "#E8503A";
      c.beginPath();
      c.arc(-1.6 * S, -5.4 * S, 1.5 * S, 0, 7);
      c.fill();
      c.beginPath();
      c.arc(1.6 * S, -5.4 * S, 1.5 * S, 0, 7);
      c.fill();
      if (sw > 0.2) {
        c.fillStyle = "#EDE6D2";
        c.beginPath();
        c.moveTo(-2.2 * S, -9.6 * S);
        c.lineTo(0, -14.4 * S);
        c.lineTo(2.2 * S, -9.6 * S);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    // 鱗の照り
    c.strokeStyle = mixW(body, 0.24);
    c.lineWidth = Math.max(0.8, 1.4 * S);
    for (let k = 0; k < 6; k++) {
      c.beginPath();
      c.moveTo(-kw * 0.8 + k * kw * 0.3, -14 * S);
      c.lineTo(-kw * 0.72 + k * kw * 0.3, -4 * S);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  // 味方の目印
  c.fillStyle = "rgba(96,152,214,.95)";
  c.fillRect(-kw * 0.5, -3.4 * S, kw * 1.0, 3.0 * S);
}
