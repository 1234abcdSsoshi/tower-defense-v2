import { ERAS } from "@/data/master";
import { rgba, shade } from "@/render/color";
import { bakeGrade } from "@/render/palette";
import { DPR, GY, H, SC, W } from "@/render/viewport";

/* ---------- 背景（時代ごとにオフスクリーンへ焼く） ---------- */
export function buildBg(era: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(W * DPR);
  c.height = Math.round(H * DPR);
  const b = c.getContext("2d");
  b.setTransform(DPR, 0, 0, DPR, 0, 0);
  const E = ERAS[era];
  const gr = b.createLinearGradient(0, 0, 0, GY);
  gr.addColorStop(0, E.sky[0]);
  gr.addColorStop(1, E.sky[1]);
  b.fillStyle = gr;
  b.fillRect(0, 0, W, GY + 2);
  // 天体
  b.globalAlpha = 0.85;
  b.fillStyle = E.sun;
  b.beginPath();
  b.arc(W * 0.82, GY * 0.6, 20 * SC, 0, 7);
  b.fill();
  b.globalAlpha = 1;
  // 遠景の丘
  b.fillStyle = shade(E.far, 0.88);
  b.beginPath();
  b.moveTo(0, GY);
  for (let i = 0; i <= 10; i++) {
    const x = (W * i) / 10,
      y = GY - (34 + 26 * Math.sin(i * 1.7 + era)) * SC;
    b.lineTo(x, y);
  }
  b.lineTo(W, GY);
  b.closePath();
  b.fill();
  drawSkyline(b, era);
  b.fillStyle = shade(E.near, 0.74);
  b.beginPath();
  b.moveTo(0, GY);
  for (let i = 0; i <= 8; i++) {
    const x = (W * i) / 8,
      y = GY - (14 + 11 * Math.sin(i * 2.3 + era * 2)) * SC;
    b.lineTo(x, y);
  }
  b.lineTo(W, GY);
  b.closePath();
  b.fill();
  // 空気遠近：地平線際に薄いもやを掛けて、兵と背景を切り離す
  const hz = b.createLinearGradient(0, GY - 76 * SC, 0, GY);
  hz.addColorStop(0, rgba(E.sky[1], 0));
  hz.addColorStop(1, rgba(E.sky[1], 0.3));
  b.fillStyle = hz;
  b.fillRect(0, GY - 76 * SC, W, 76 * SC);
  // 地面
  const gg = b.createLinearGradient(0, GY, 0, H);
  gg.addColorStop(0, E.ground);
  gg.addColorStop(1, E.ground2);
  b.fillStyle = gg;
  b.fillRect(0, GY, W, H - GY);
  b.strokeStyle = "rgba(0,0,0,.22)";
  b.lineWidth = 1.5 * SC;
  b.beginPath();
  b.moveTo(0, GY);
  b.lineTo(W, GY);
  b.stroke();
  b.globalAlpha = 0.13;
  b.fillStyle = "#000";
  for (let i = 0; i < 70; i++) {
    const x = (i * 137.3 + era * 61) % W,
      y = GY + ((i * 53.7) % (H - GY));
    b.fillRect(x, y, 3 * SC, 1.4 * SC);
  }
  b.globalAlpha = 1;
  // 周辺減光。中央の戦線に目が行くようにする
  const vg = b.createRadialGradient(
    W * 0.5,
    GY * 0.86,
    Math.min(W, H) * 0.28,
    W * 0.5,
    GY * 0.86,
    Math.max(W, H) * 0.78,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.34)");
  b.fillStyle = vg;
  b.fillRect(0, 0, W, H);
  bakeGrade(b, era, W, H, false);
  return c;
}
export function drawSkyline(b: CanvasRenderingContext2D, era: number): void {
  const base = GY - 26 * SC,
    col = "rgba(0,0,0,.30)";
  b.fillStyle = col;
  // 同じ形を等間隔に n 個並べる。時代ごとの位相ずらしで単調さを消す
  const put = (fn: (x: number, y: number) => void, n: number, y0: number): void => {
    for (let i = 0; i < n; i++) {
      const x = (W * (i + 0.5)) / n + ((era * 37) % 40) - 20;
      fn(x, y0);
    }
  };
  const S = SC;
  const roof = (x: number, y: number, hw: number, rise: number): void => {
    b.beginPath();
    b.moveTo(x - hw, y);
    b.lineTo(x, y - rise);
    b.lineTo(x + hw, y);
    b.closePath();
    b.fill();
  };
  if (era === 0) {
    // 原始：竪穴住居の三角
    put(
      (x, y) => {
        roof(x, y, 19 * S, 25 * S);
      },
      7,
      base,
    );
  } else if (era === 1) {
    // 古代：高床倉庫と五重塔
    put(
      (x, y) => {
        if (((x * 7) | 0) % 3 === 0) {
          for (let k = 0; k < 5; k++) {
            const hw = (20 - k * 3.1) * S,
              yy = y - (k + 1) * 11 * S;
            b.fillRect(x - hw * 0.52, yy, hw * 1.04, 10 * S);
            roof(x, yy, hw, 5.4 * S);
          }
          b.fillRect(x - 1.2 * S, y - 70 * S, 2.4 * S, 10 * S);
        } else {
          b.fillRect(x - 16 * S, y - 19 * S, 32 * S, 12 * S);
          roof(x, y - 19 * S, 21 * S, 11 * S);
          b.fillRect(x - 12 * S, y - 7 * S, 3 * S, 7 * S);
          b.fillRect(x + 9 * S, y - 7 * S, 3 * S, 7 * S);
        }
      },
      6,
      base,
    );
  } else if (era === 2) {
    // 中世：土塁の上の櫓と板塀
    put(
      (x, y) => {
        b.beginPath();
        b.moveTo(x - 30 * S, y);
        b.lineTo(x - 21 * S, y - 11 * S);
        b.lineTo(x + 21 * S, y - 11 * S);
        b.lineTo(x + 30 * S, y);
        b.closePath();
        b.fill();
        b.fillRect(x - 13 * S, y - 30 * S, 26 * S, 20 * S);
        roof(x, y - 30 * S, 19 * S, 8 * S);
        b.fillRect(x - 24 * S, y - 17 * S, 8 * S, 7 * S);
        b.fillRect(x + 16 * S, y - 17 * S, 8 * S, 7 * S);
      },
      5,
      base,
    );
  } else if (era === 3) {
    // 近世：天守と町家の甍
    put(
      (x, y) => {
        if (((x * 11) | 0) % 3 === 0) {
          for (let k = 0; k < 3; k++) {
            const hw = (19 - k * 4.6) * S,
              yy = y - (k + 1) * 13 * S;
            b.fillRect(x - hw, yy, hw * 2, 12 * S);
            roof(x, yy, hw + 4.5 * S, 6.6 * S);
          }
        } else {
          b.fillRect(x - 21 * S, y - 14 * S, 42 * S, 14 * S);
          roof(x, y - 14 * S, 25 * S, 8 * S);
          b.fillRect(x - 25 * S, y - 15 * S, 50 * S, 2.4 * S);
        }
      },
      8,
      base,
    );
  } else if (era === 4) {
    // 近代：洋館と煙突
    put(
      (x, y) => {
        b.fillRect(x - 17 * S, y - 30 * S, 34 * S, 30 * S);
        b.fillRect(x + 12 * S, y - 50 * S, 7 * S, 21 * S);
        roof(x, y - 30 * S, 20 * S, 9 * S);
        b.fillStyle = "rgba(0,0,0,.18)";
        for (let r = 0; r < 3; r++)
          for (let c2 = 0; c2 < 3; c2++)
            b.fillRect(x - 11 * S + c2 * 8 * S, y - 25 * S + r * 8 * S, 4.4 * S, 5 * S);
        b.fillStyle = col;
      },
      6,
      base,
    );
  } else {
    // 現代：ビル群
    put(
      (x, y) => {
        const hh = (34 + ((x * 7) % 40)) * S;
        b.fillRect(x - 13 * S, y - hh, 26 * S, hh);
        b.fillStyle = "rgba(127,227,224,.30)";
        for (let r = 0; r < Math.floor(hh / (9 * S)); r++)
          for (let c2 = 0; c2 < 3; c2++) {
            if ((r * 3 + c2 + Math.floor(x)) % 4 === 0)
              b.fillRect(x - 9 * S + c2 * 7 * S, y - hh + 6 * S + r * 9 * S, 4 * S, 4 * S);
          }
        b.fillStyle = col;
      },
      7,
      base,
    );
  }
}
