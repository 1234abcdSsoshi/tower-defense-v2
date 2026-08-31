import { ERAS } from "@/data/master";
import { fgCache } from "@/render/caches";
import { mixK } from "@/render/color";
import { bakeGrade } from "@/render/palette";
import { foregroundSprite } from "@/render/scenerySprites";
import { DPR, GY, SC, W } from "@/render/viewport";
import { G } from "@/sim/state";

/** 前景は「揺れる草」と「動かない静止物」の二枚に分けて焼く */
export interface FgLayer {
  /** 風で揺らす層 */
  sway: HTMLCanvasElement;
  /** 揺らさない層（鳥居・石灯籠・ガードレールなど） */
  stat: HTMLCanvasElement;
  /** 画面上での上端 Y */
  y0: number;
  /** 層の高さ */
  hh: number;
}

/* ---------- 前景レイヤー ----------
   兵より手前に草木のシルエットを置く。奥（丘）／中（兵）／手前（草木）の三層になり、
   兵の足元が草に隠れることで奥行きが一気に出る。
   静止物と風で揺れる草を別々に焼き、揺れは「地面を軸にした剪断」1回で表現する。 */
export function fgRng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >> 17;
    a ^= a << 5;
    a >>>= 0;
    return a / 4294967296;
  };
}

export function buildFg(era: number): FgLayer {
  const E = ERAS[era];
  const y0 = GY - 80 * SC,
    hh = Math.max(8, 92 * SC),
    gy = GY - y0;
  const mk = () => {
    const cn = document.createElement("canvas");
    cn.width = Math.round(W * DPR);
    cn.height = Math.round(hh * DPR);
    const x = cn.getContext("2d");
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    return x;
  };
  const sw = mk(),
    st = mk();
  const sprite = foregroundSprite(era, () => {
    delete fgCache[era];
  });
  if (sprite) {
    const size = Math.min(150 * SC, hh * 1.48);
    const y = gy - size + 8 * SC;
    st.drawImage(sprite, -8 * SC, y, size, size);
    st.save();
    st.translate(W, 0);
    st.scale(-1, 1);
    st.drawImage(sprite, -8 * SC, y, size, size);
    st.restore();
    return { sway: sw.canvas, stat: st.canvas, y0, hh };
  }
  const ink = mixK(E.ground, 0.78),
    ink2 = mixK(E.ground, 0.66),
    inkA = mixK(E.pal.accent, 0.55);
  const R = fgRng(era + 7),
    S = SC;

  /* --- 草の基本形 --- */
  function blades(
    c: CanvasRenderingContext2D,
    px: number,
    h: number,
    n: number,
    col: string,
    spread: number,
    lw: number,
  ): void {
    c.strokeStyle = col;
    c.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n - 0.5) * spread,
        hv = h * (0.55 + 0.45 * R());
      c.lineWidth = lw * (0.75 + R() * 0.6) * S;
      c.beginPath();
      c.moveTo(px, gy + 2 * S);
      c.quadraticCurveTo(px + a * hv * 0.22, gy - hv * 0.55, px + a * hv * 0.58, gy - hv);
      c.stroke();
    }
  }
  function susuki(c: CanvasRenderingContext2D, px: number, h: number): void {
    // ススキ：穂が付く
    blades(c, px, h * 0.8, 6, ink, 1.05, 1.7);
    for (let i = 0; i < 2; i++) {
      const a = (i - 0.5) * 0.62,
        hv = h * (0.95 + R() * 0.22);
      c.strokeStyle = ink;
      c.lineWidth = 1.4 * S;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(px, gy + 2 * S);
      c.quadraticCurveTo(px + a * hv * 0.18, gy - hv * 0.6, px + a * hv * 0.44, gy - hv);
      c.stroke();
      c.fillStyle = ink2;
      c.save();
      c.translate(px + a * hv * 0.44, gy - hv);
      c.rotate(a * 0.6);
      c.beginPath();
      c.ellipse(0, -2.4 * S, 1.35 * S, 3.4 * S, 0, 0, 7);
      c.fill();
      c.restore();
    }
  }
  function inaho(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 稲穂：先が垂れる
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) / 5 - 0.5) * 0.95,
        hv = h * (0.62 + 0.38 * R());
      c.strokeStyle = ink;
      c.lineWidth = 1.5 * S;
      c.lineCap = "round";
      const tx = px + a * hv * 0.5,
        ty = gy - hv;
      c.beginPath();
      c.moveTo(px, gy + 2 * S);
      c.quadraticCurveTo(px + a * hv * 0.3, gy - hv * 0.7, tx, ty);
      c.stroke();
      c.fillStyle = ink2;
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.ellipse(tx + a * k * 1.4 * S, ty + k * 2.3 * S, 1.5 * S, 2.1 * S, a * 0.4, 0, 7);
        c.fill();
      }
    }
  }
  function sasa(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 笹：面で見せる
    for (let i = 0; i < 6; i++) {
      const a = ((i + 0.5) / 6 - 0.5) * 1.15,
        hv = h * (0.5 + 0.5 * R());
      c.fillStyle = i % 2 ? ink : ink2;
      c.save();
      c.translate(px, gy + 2 * S);
      c.rotate(a * 0.72);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(3.2 * S, -hv * 0.6, 0.8 * S, -hv);
      c.quadraticCurveTo(-2.6 * S, -hv * 0.55, 0, 0);
      c.fill();
      c.restore();
    }
  }
  function yanagi(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 柳：高い位置から垂れる
    c.strokeStyle = ink;
    c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const a = ((i + 0.5) / 7 - 0.5) * 1.25,
        hv = h * (0.7 + 0.3 * R());
      c.lineWidth = 1.3 * S;
      c.beginPath();
      c.moveTo(px, gy - hv);
      c.quadraticCurveTo(px + a * hv * 0.5, gy - hv * 0.45, px + a * hv * 0.62, gy + 3 * S);
      c.stroke();
    }
    c.strokeStyle = ink2;
    c.lineWidth = 3.4 * S;
    c.beginPath();
    c.moveTo(px - 6 * S, gy - h * 1.05);
    c.lineTo(px + 5 * S, gy - h * 0.75);
    c.stroke();
  }
  function zassou(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 雑草：短く硬い
    blades(c, px, h * 0.66, 7, ink, 1.3, 1.8);
  }

  /* --- 時代ごとの静止物 --- */
  function torii(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 鳥居：古代の目印
    c.fillStyle = inkA;
    c.fillRect(px - h * 0.42, gy - h, h * 0.16, h);
    c.fillRect(px + h * 0.28, gy - h, h * 0.16, h);
    c.fillStyle = ink;
    c.beginPath();
    c.moveTo(px - h * 0.72, gy - h * 1.02);
    c.lineTo(px + h * 0.72, gy - h * 1.02);
    c.lineTo(px + h * 0.64, gy - h * 0.9);
    c.lineTo(px - h * 0.64, gy - h * 0.9);
    c.closePath();
    c.fill();
    c.fillRect(px - h * 0.54, gy - h * 0.76, h * 1.1, h * 0.1);
  }
  function stones(c: CanvasRenderingContext2D, px: number, r: number): void {
    c.fillStyle = ink;
    c.beginPath();
    c.ellipse(px, gy + 1 * S, r, r * 0.62, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = ink2;
    c.beginPath();
    c.ellipse(px + r * 0.5, gy + 2 * S, r * 0.5, r * 0.34, 0, Math.PI, 0);
    c.fill();
  }
  function fence(c: CanvasRenderingContext2D, px: number, w2: number, h: number): void {
    // 柵・矢来
    c.strokeStyle = ink;
    c.lineWidth = 3.0 * S;
    c.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const x = px + (i * w2) / 3.4;
      c.beginPath();
      c.moveTo(x, gy + 3 * S);
      c.lineTo(x + (R() - 0.5) * 3 * S, gy - h * (0.7 + R() * 0.4));
      c.stroke();
    }
    c.lineWidth = 2.2 * S;
    c.beginPath();
    c.moveTo(px - 3 * S, gy - h * 0.62);
    c.lineTo(px + w2, gy - h * 0.55);
    c.stroke();
  }
  function pole(c: CanvasRenderingContext2D, px: number, h: number, wire: boolean): void {
    // 電柱／標識
    c.fillStyle = ink;
    c.fillRect(px - 1.9 * S, gy - h, 3.8 * S, h + 4 * S);
    if (wire) {
      c.strokeStyle = ink;
      c.lineWidth = 1.5 * S;
      c.beginPath();
      c.moveTo(px - 11 * S, gy - h * 0.93);
      c.lineTo(px + 11 * S, gy - h * 0.93);
      c.stroke();
      c.strokeStyle = ink2;
      c.lineWidth = 1.1 * S;
      c.beginPath();
      c.moveTo(px - 9 * S, gy - h * 0.9);
      c.quadraticCurveTo(px + 30 * S, gy - h * 0.66, px + 70 * S, gy - h * 0.9);
      c.stroke();
    }
  }
  function guardrail(c: CanvasRenderingContext2D, px: number, w2: number): void {
    c.fillStyle = ink;
    c.fillRect(px, gy - 13 * S, w2, 4.4 * S);
    for (let i = 0; i <= 2; i++) c.fillRect(px + (i * w2) / 2 - 1.6 * S, gy - 13 * S, 3.2 * S, 16 * S);
    c.fillStyle = inkA;
    c.fillRect(px, gy - 13 * S, w2, 1.2 * S);
  }
  function toro(c: CanvasRenderingContext2D, px: number, h: number): void {
    // 石灯籠の下部
    c.fillStyle = ink;
    c.fillRect(px - 7 * S, gy - h * 0.34, 14 * S, h * 0.34 + 3 * S);
    c.fillRect(px - 4 * S, gy - h * 0.74, 8 * S, h * 0.42);
    c.fillRect(px - 9 * S, gy - h * 0.88, 18 * S, h * 0.17);
  }
  function ya(c: CanvasRenderingContext2D, px: number): void {
    // 折れた矢
    c.strokeStyle = ink;
    c.lineWidth = 1.8 * S;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(px, gy + 3 * S);
    c.lineTo(px + 7 * S, gy - 15 * S);
    c.stroke();
    c.fillStyle = ink2;
    c.beginPath();
    c.moveTo(px + 7 * S, gy - 15 * S);
    c.lineTo(px + 11 * S, gy - 19 * S);
    c.lineTo(px + 9 * S, gy - 13 * S);
    c.closePath();
    c.fill();
  }

  /* --- 配置：中央は薄く、両端は濃く。戦線を隠さない --- */
  const PLANT: Record<string, (c: CanvasRenderingContext2D, px: number, h: number) => void> = {
    susuki,
    inaho,
    sasa,
    yanagi,
    zassou,
  };
  const plant = PLANT[E.plant] || susuki;
  // 額縁のように両端を茂らせ、中央の戦線は空ける
  const N = Math.round(W / 34);
  for (let i = 0; i < N; i++) {
    const t = (i + R() * 0.8) / N,
      px = t * W;
    const edge = Math.min(t, 1 - t) * 2; // 0=画面端 1=中央
    const keep = edge < 0.32 ? 1 : edge < 0.62 ? 0.46 : 0.15;
    if (R() > keep) continue;
    const h = (13 + R() * 15) * S * (1.75 - edge * 0.95);
    plant(sw, px, h);
  }
  const PROPS: Record<string, (c: CanvasRenderingContext2D) => void> = {
    stones: (c) => {
      stones(c, W * 0.13, 9 * S);
      stones(c, W * 0.88, 7 * S);
    },
    torii: (c) => {
      torii(c, W * 0.09, 32 * S);
      stones(c, W * 0.91, 7 * S);
    },
    fence: (c) => {
      fence(c, W * 0.06, 30 * S, 22 * S);
      ya(c, W * 0.32);
      fence(c, W * 0.88, 26 * S, 19 * S);
    },
    toro: (c) => {
      toro(c, W * 0.1, 34 * S);
      toro(c, W * 0.9, 26 * S);
    },
    pole: (c) => {
      pole(c, W * 0.08, 66 * S, true);
      pole(c, W * 0.93, 54 * S, false);
    },
    guardrail: (c) => {
      guardrail(c, W * 0.02, W * 0.16);
      guardrail(c, W * 0.82, W * 0.16);
      pole(c, W * 0.49, 40 * S, false);
    },
  };
  const props = PROPS[E.props] || PROPS.stones;
  props(st);
  bakeGrade(sw, era, W, hh, true);
  bakeGrade(st, era, W, hh, true);
  return { sway: sw.canvas, stat: st.canvas, y0, hh };
}

export function drawFg(c: CanvasRenderingContext2D, era: number, t: number, alpha: number): void {
  let f = fgCache[era];
  if (!f) f = fgCache[era] = buildFg(era);
  const gust = (G.evoFlash > 0 ? G.evoFlash * 2.4 : 0) + (G.shake > 0 ? G.shake * 0.06 : 0);
  const wind = Math.sin(t * 0.85) * 0.62 + Math.sin(t * 2.17 + 1.7) * 0.26 + Math.sin(t * 4.9 + 0.4) * 0.1;
  const shear = wind * (0.115 + gust * 0.1);
  if (alpha !== undefined) c.globalAlpha = alpha;
  c.drawImage(f.stat, 0, f.y0, W, f.hh);
  c.save();
  c.transform(1, 0, shear, 1, -shear * GY, 0); // 地面の高さを軸にして、上ほど大きく揺れる
  c.drawImage(f.sway, 0, f.y0, W, f.hh);
  c.restore();
  if (alpha !== undefined) c.globalAlpha = 1;
}
