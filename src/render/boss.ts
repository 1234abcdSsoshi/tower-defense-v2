import { ERAS } from "@/data/master";
import { mixK, mixW, rgba, shade } from "@/render/color";
import { blend } from "@/render/palette";
import { wheel } from "@/render/parts";
import { limb, ppath } from "@/render/primitives";
import type { EraPalette } from "@/data/types";
import type { Drawable } from "@/sim/types";

/* ---------- 時代の主：人型をやめて、それぞれ別の生き物・兵器として描く ---------- */
export function drawBoss(
  c: CanvasRenderingContext2D,
  u: Drawable,
  S: number,
  P: EraPalette,
  K: string,
  t: number,
): void {
  // u.w は今まで横幅にしか効かなかった。全体を等倍で拡大して、
  // 背丈も一緒に伸ばす。原点は足元なので地面から生えたまま大きくなる。
  const BS = Math.max(1, u.w / 2.45);
  if (BS !== 1) c.scale(BS, BS);
  const kw = 15 * (u.w / BS) * S,
    art = u.art || "oni",
    ph = t * 2.2 + u.x * 0.06;
  const H = (ERAS[u.era] && ERAS[u.era].hero) || null;
  const base = (H && H.col) || P.cloth;
  const cloth = blend(base, P.cloth, 0.12),
    cl2 = shade(cloth, 0.72),
    met = P.metal;
  const tel = u.tel > 0,
    dash = u.dash > 0;
  if (tel) {
    c.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 14));
  }

  if (art === "boar") {
    const leg = mixK(cl2, 0.26),
      bob = Math.abs(Math.sin(ph * 2)) * 1.4 * S;
    for (let k = 0; k < 4; k++) {
      const lx = (-0.62 + k * 0.42) * kw,
        sw = Math.sin(ph * 2 + k * 1.6) * 3.2 * S;
      limb(c, lx, -17 * S, lx + sw, -0.6 * S, 5.4 * S, leg, S, K);
    }
    const bd = () => {
      c.beginPath();
      c.ellipse(-kw * 0.1, -20 * S - bob, kw * 0.94, 9.2 * S, -0.06, 0, 7);
      c.closePath();
    };
    ppath(c, bd, cloth, S, -29 * S, -11 * S, true, K);
    // 剛毛
    c.strokeStyle = mixK(cl2, 0.4);
    c.lineWidth = Math.max(1.0, 1.8 * S);
    c.lineCap = "round";
    for (let k = 0; k < 8; k++) {
      const bx = (-0.76 + k * 0.21) * kw;
      c.beginPath();
      c.moveTo(bx, -27.5 * S - bob);
      c.lineTo(bx - 2.0 * S, -35 * S - bob);
      c.stroke();
    }
    // 頭
    const hd = () => {
      c.beginPath();
      c.moveTo(kw * 0.56, -28 * S - bob);
      c.lineTo(kw * 1.3, -21.0 * S - bob);
      c.lineTo(kw * 1.24, -9.0 * S - bob);
      c.lineTo(kw * 0.52, -11.0 * S - bob);
      c.closePath();
    };
    ppath(c, hd, mixW(cloth, 0.08), S, -28 * S - bob, -9.0 * S - bob, true, K);
    c.fillStyle = "#F0C165";
    c.beginPath();
    c.arc(kw * 0.96, -22.4 * S - bob, 2.6 * S, 0, 7);
    c.fill();
    c.fillStyle = "#241812";
    c.beginPath();
    c.arc(kw * 1.2, -12.0 * S - bob, 2.2 * S, 0, 7);
    c.fill();
    // 牙
    const tk = () => {
      c.beginPath();
      c.moveTo(kw * 1.14, -11.4 * S - bob);
      c.quadraticCurveTo(kw * 1.62, -17.0 * S - bob, kw * 1.36, -24.0 * S - bob);
      c.quadraticCurveTo(kw * 1.36, -16.4 * S - bob, kw * 1.04, -10.0 * S - bob);
      c.closePath();
    };
    ppath(c, tk, "#EDE6D2", S, -24.0 * S, -10.0 * S, true, K);
    ppath(
      c,
      () => {
        c.beginPath();
        c.moveTo(kw * 0.98, -10.4 * S - bob);
        c.quadraticCurveTo(kw * 1.32, -14.4 * S - bob, kw * 1.16, -19.8 * S - bob);
        c.quadraticCurveTo(kw * 1.12, -13.8 * S - bob, kw * 0.9, -9.4 * S - bob);
        c.closePath();
      },
      "#DCD2BC",
      S,
      -19.8 * S,
      -9.4 * S,
      true,
      K,
    );
    c.fillStyle = mixK(cl2, 0.5);
    c.beginPath();
    c.moveTo(-kw * 0.92, -21 * S - bob);
    c.quadraticCurveTo(-kw * 1.26, -24 * S - bob, -kw * 1.16, -15 * S - bob);
    c.quadraticCurveTo(-kw * 1.0, -18.0 * S - bob, -kw * 0.9, -17.4 * S - bob);
    c.fill();
  } else if (art === "ghost") {
    const fl = Math.sin(ph) * 3.4 * S;
    c.globalAlpha = (c.globalAlpha || 1) * 0.94;
    const rb = () => {
      c.beginPath();
      c.moveTo(-kw * 0.62, -30 * S + fl);
      c.quadraticCurveTo(-kw * 1.05, -16 * S + fl, -kw * 0.5, -2 * S + fl);
      c.quadraticCurveTo(-kw * 0.16, -8 * S + fl, 0, -1 * S + fl);
      c.quadraticCurveTo(kw * 0.2, -8 * S + fl, kw * 0.52, -2 * S + fl);
      c.quadraticCurveTo(kw * 1.06, -16 * S + fl, kw * 0.62, -30 * S + fl);
      c.closePath();
    };
    ppath(c, rb, cloth, S, -30 * S, -1 * S, true, K);
    // 袖
    for (const sgn of [-1, 1]) {
      const sl = () => {
        c.beginPath();
        c.moveTo(sgn * kw * 0.52, -26 * S + fl);
        c.quadraticCurveTo(sgn * kw * 1.36, -22 * S + fl, sgn * kw * 1.1, -12 * S + fl);
        c.quadraticCurveTo(sgn * kw * 0.86, -18 * S + fl, sgn * kw * 0.48, -18 * S + fl);
        c.closePath();
      };
      ppath(c, sl, mixK(cloth, 0.14), S, -26 * S, -12 * S, true, K);
    }
    // 面
    const fc = () => {
      c.beginPath();
      c.ellipse(0, -33 * S + fl, kw * 0.36, 7.4 * S, 0, 0, 7);
      c.closePath();
    };
    ppath(c, fc, "#EDE4D0", S, -41 * S, -26 * S, true, K);
    c.fillStyle = "#2A1620";
    c.beginPath();
    c.ellipse(-kw * 0.14, -34.6 * S + fl, 1.9 * S, 2.8 * S, 0, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(kw * 0.14, -34.6 * S + fl, 1.9 * S, 2.8 * S, 0, 0, 7);
    c.fill();
    c.fillRect(-kw * 0.15, -30.0 * S + fl, kw * 0.3, 1.7 * S);
    // 鬼火
    c.fillStyle = rgba(P.accent, 0.55);
    for (let k = 0; k < 3; k++) {
      const a2 = ph * 1.3 + k * 2.1;
      c.beginPath();
      c.arc(Math.cos(a2) * kw * 1.15, -24 * S + Math.sin(a2) * 7 * S + fl, 2.6 * S, 0, 7);
      c.fill();
    }
  } else if (art === "oni") {
    const leg = mixK(cl2, 0.24),
      bob = Math.abs(Math.sin(ph * 1.8)) * 1.6 * S;
    limb(c, -kw * 0.34, -16 * S, -kw * 0.46, -0.6 * S, 9.0 * S, leg, S, K);
    limb(c, kw * 0.34, -16 * S, kw * 0.48, -0.6 * S, 9.0 * S, leg, S, K);
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 0.72, -40 * S - bob);
      c.lineTo(kw * 0.72, -40 * S - bob);
      c.lineTo(kw * 0.86, -14 * S - bob);
      c.lineTo(-kw * 0.86, -14 * S - bob);
      c.closePath();
    };
    ppath(c, bd, "#B4523E", S, -40 * S, -14 * S, true, K);
    c.fillStyle = mixK("#B4523E", 0.22);
    c.fillRect(-kw * 0.86, -27 * S - bob, kw * 1.72, 3.0 * S);
    // 頭と角
    const hd = () => {
      c.beginPath();
      c.arc(0, -47 * S - bob, kw * 0.44, 0, 7);
      c.closePath();
    };
    ppath(c, hd, "#C25E46", S, -54 * S, -40 * S, true, K);
    for (const sgn of [-1, 1]) {
      const hn = () => {
        c.beginPath();
        c.moveTo(sgn * kw * 0.2, -52 * S - bob);
        c.quadraticCurveTo(sgn * kw * 0.52, -62 * S - bob, sgn * kw * 0.3, -66 * S - bob);
        c.quadraticCurveTo(sgn * kw * 0.34, -58 * S - bob, sgn * kw * 0.06, -53 * S - bob);
        c.closePath();
      };
      ppath(c, hn, "#EDE0C6", S, -66 * S, -52 * S, true, K);
    }
    c.fillStyle = "#F5E14A";
    c.beginPath();
    c.arc(-kw * 0.16, -48 * S - bob, 2.2 * S, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(kw * 0.16, -48 * S - bob, 2.2 * S, 0, 7);
    c.fill();
    // 金棒
    c.save();
    c.translate(kw * 0.8, -32 * S - bob);
    c.rotate(-0.38);
    const cb = () => {
      c.beginPath();
      c.rect(0, -6.0 * S, kw * 1.5, 12 * S);
      c.closePath();
    };
    ppath(c, cb, mixK(met, 0.18), S, -6 * S, 6 * S, true, K);
    c.fillStyle = mixW(met, 0.25);
    for (let r = 0; r < 3; r++)
      for (let q = 0; q < 4; q++) {
        c.beginPath();
        c.arc(kw * (0.3 + q * 0.34), (-3.2 + r * 3.2) * S, 1.5 * S, 0, 7);
        c.fill();
      }
    c.restore();
    limb(c, kw * 0.5, -34 * S - bob, kw * 0.84, -31 * S - bob, 5.2 * S, "#C25E46", S, K);
  } else if (art === "ship") {
    // 黒船：船体・煙突・砲門
    const hull = () => {
      c.beginPath();
      c.moveTo(-kw * 1.3, -8 * S);
      c.quadraticCurveTo(-kw * 1.44, -20 * S, -kw * 1.0, -22 * S);
      c.lineTo(kw * 1.16, -22 * S);
      c.quadraticCurveTo(kw * 1.52, -20 * S, kw * 1.42, -8 * S);
      c.quadraticCurveTo(0, 0, -kw * 1.3, -8 * S);
      c.closePath();
    };
    ppath(c, hull, mixK(cl2, 0.3), S, -22 * S, 0, true, K);
    c.fillStyle = mixW(cl2, 0.1);
    c.fillRect(-kw * 1.16, -25 * S, kw * 2.36, 3.6 * S);
    // 砲門
    c.fillStyle = "#0A0D12";
    for (let k = 0; k < 4; k++) c.fillRect(-kw * 0.92 + k * kw * 0.56, -18 * S, kw * 0.26, 4.4 * S);
    // 煙突と煙
    const fn = () => {
      c.beginPath();
      c.rect(-kw * 0.16, -46 * S, kw * 0.4, 22 * S);
      c.closePath();
    };
    ppath(c, fn, mixK(cl2, 0.1), S, -46 * S, -24 * S, true, K);
    c.fillStyle = mixW(P.accent, 0.1);
    c.fillRect(-kw * 0.18, -46 * S, kw * 0.44, 3.0 * S);
    c.fillStyle = "rgba(40,44,52,.52)";
    for (let k = 0; k < 4; k++) {
      const a2 = ph * 0.7 + k * 1.4;
      c.beginPath();
      c.arc(-kw * 0.02 + Math.sin(a2) * 4 * S, (-50 - k * 7) * S, (3.4 + k * 1.5) * S, 0, 7);
      c.fill();
    }
    // 帆柱
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.0, 1.8 * S);
    c.beginPath();
    c.moveTo(kw * 0.86, -24 * S);
    c.lineTo(kw * 0.86, -44 * S);
    c.stroke();
    c.fillStyle = P.accent;
    c.fillRect(kw * 0.86, -44 * S, kw * 0.44, 4.6 * S);
  } else if (art === "train") {
    // 装甲列車：装甲板・車輪・回転砲塔
    const wr = 4.4 * S;
    for (let k = 0; k < 6; k++) wheel(c, -kw * 1.05 + k * kw * 0.42, -wr, wr, cl2, met, K, S, u.x * 0.06);
    const bd = () => {
      c.beginPath();
      c.moveTo(-kw * 1.24, -9 * S);
      c.lineTo(-kw * 1.14, -25 * S);
      c.lineTo(kw * 1.2, -25 * S);
      c.lineTo(kw * 1.3, -9 * S);
      c.closePath();
    };
    ppath(c, bd, cl2, S, -25 * S, -9 * S, true, K);
    c.strokeStyle = "rgba(0,0,0,.25)";
    c.lineWidth = Math.max(0.8, 1.2 * S);
    for (let k = 1; k < 5; k++) {
      c.beginPath();
      c.moveTo(-kw * 1.2 + k * kw * 0.48, -25 * S);
      c.lineTo(-kw * 1.2 + k * kw * 0.48, -9 * S);
      c.stroke();
    }
    c.fillStyle = "#0A0D12";
    for (let k = 0; k < 4; k++) c.fillRect(-kw * 0.86 + k * kw * 0.52, -20 * S, kw * 0.22, 3.4 * S);
    // 砲塔
    const tw = () => {
      c.beginPath();
      c.moveTo(-kw * 0.44, -25 * S);
      c.lineTo(-kw * 0.34, -36 * S);
      c.lineTo(kw * 0.36, -36 * S);
      c.lineTo(kw * 0.46, -25 * S);
      c.closePath();
    };
    ppath(c, tw, mixW(cl2, 0.1), S, -36 * S, -25 * S, true, K);
    c.save();
    c.translate(kw * 0.3, -31 * S);
    c.rotate(-0.22);
    const br = () => {
      c.beginPath();
      c.rect(0, -3.2 * S, kw * 1.2, 6.4 * S);
      c.closePath();
    };
    ppath(c, br, mixK(met, 0.22), S, -3.2 * S, 3.2 * S, false, K);
    c.restore();
    // 煙
    c.fillStyle = mixK(cl2, 0.16);
    c.fillRect(-kw * 0.96, -40 * S, kw * 0.3, 15 * S);
    c.fillStyle = "rgba(40,44,52,.46)";
    for (let k = 0; k < 3; k++) {
      const a2 = ph * 0.6 + k * 1.5;
      c.beginPath();
      c.arc(-kw * 0.82 + Math.sin(a2) * 3.4 * S, (-43 - k * 6) * S, (3.0 + k * 1.4) * S, 0, 7);
      c.fill();
    }
  } else {
    // 無人機母艦：巨大な全翼機。下面から子機を吐く
    const fl = Math.sin(ph * 0.9) * 2.4 * S;
    const wg = () => {
      c.beginPath();
      c.moveTo(-kw * 1.5, -6 * S + fl);
      c.lineTo(-kw * 0.6, -16 * S + fl);
      c.lineTo(kw * 0.9, -16 * S + fl);
      c.lineTo(kw * 1.44, -5 * S + fl);
      c.lineTo(kw * 0.2, 0 * S + fl);
      c.lineTo(-kw * 1.1, -1 * S + fl);
      c.closePath();
    };
    ppath(c, wg, cl2, S, -16 * S + fl, 0 + fl, true, K);
    c.fillStyle = P.accent;
    c.globalAlpha = 0.85;
    c.fillRect(-kw * 0.9, -12 * S + fl, kw * 1.6, 2.2 * S);
    c.globalAlpha = 1;
    // 発艦口
    c.fillStyle = "#0A0D12";
    for (let k = 0; k < 3; k++) c.fillRect(-kw * 0.62 + k * kw * 0.48, -4.4 * S + fl, kw * 0.28, 3.0 * S);
    // ローター
    for (const ax of [-kw * 1.1, -kw * 0.2, kw * 0.7]) {
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.8, 1.2 * S);
      c.beginPath();
      c.moveTo(ax, -14 * S + fl);
      c.lineTo(ax, -21 * S + fl);
      c.stroke();
      const sp = 0.5 + 0.5 * Math.abs(Math.sin(ph * 8 + ax));
      c.strokeStyle = mixW(P.accent, 0.3);
      c.lineWidth = Math.max(1.0, 1.7 * S);
      c.beginPath();
      c.moveTo(ax - kw * 0.36 * sp, -21.5 * S + fl);
      c.lineTo(ax + kw * 0.36 * sp, -21.5 * S + fl);
      c.stroke();
    }
    c.fillStyle = P.accent;
    c.beginPath();
    c.arc(kw * 1.2, -9 * S + fl, 2.4 * S, 0, 7);
    c.fill();
  }

  if (dash) {
    c.globalAlpha = 0.5;
    c.strokeStyle = mixW(P.accent, 0.4);
    c.lineWidth = 2.2 * S;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(-kw * (1.4 + k * 0.5), -(10 + k * 7) * S);
      c.lineTo(-kw * (0.7 + k * 0.5), -(10 + k * 7) * S);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  c.globalAlpha = 1;
  // 陣営の目印
  c.fillStyle = u.side === 0 ? "rgba(96,152,214,.95)" : "rgba(228,100,74,.95)";
  c.fillRect(-kw * 0.55, -3.4 * S, kw * 1.1, 3.0 * S);
}
