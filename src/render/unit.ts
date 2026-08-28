import { BAL, ERAS, LIN, NE } from "@/data/master";
import { drawBoss } from "@/render/boss";
import { mixK, mixW, rgba, shade } from "@/render/color";
import { drawFlyer } from "@/render/flyer";
import { drawMachine } from "@/render/machine";
import { linPal } from "@/render/palette";
import { drawHat, torsoTex } from "@/render/parts";
import { limb, outline, pbox, ppath, sideInk } from "@/render/primitives";
import { DET } from "@/render/quality";
import { GY, SC } from "@/render/viewport";
import { drawYokai } from "@/render/yokai";
import type { Drawable } from "@/sim/types";

/* ---------- ユニット本体 ---------- */
export function drawUnitAt(
  c: CanvasRenderingContext2D,
  u: Drawable,
  px: number,
  t: number,
  scale?: number,
  ghost?: number,
  tilt?: number,
): void {
  if (!(scale > 0.02)) return;
  const E = ERAS[u.era],
    P = linPal(u.lin, u.era),
    K = sideInk(P, u.side);
  const hh = u.hh || u.w;
  const z = u.z || 0,
    S = scale * (1 - z * 0.17);
  const bh = 25 * hh * S,
    bw = 12.2 * u.w * S,
    hr = 6.0 * ((u.w + hh) * 0.5) * S;
  const walking = u.st === "move";
  const ph = t * (u.speed / 22) + u.x * 0.09;
  const bob = walking ? Math.abs(Math.sin(ph)) * 1.6 * S : 0;
  const legA = walking ? Math.sin(ph) * 3.6 * S : 0;

  // 攻撃モーション：溜め→打ち→戻し
  const aa = u.atkA > 0 ? 1 - u.atkA : 1;
  let lean = 0,
    lunge = 0,
    swing = 0;
  if (u.atkA > 0) {
    if (aa < 0.28) {
      const k = aa / 0.28;
      lean = -0.13 * k;
      swing = -0.5 * k;
    } else if (aa < 0.46) {
      const k = (aa - 0.28) / 0.18;
      lean = -0.13 + 0.42 * k;
      lunge = 3.4 * S * k;
      swing = -0.5 + 2.1 * k;
    } else {
      const k = (aa - 0.46) / 0.54;
      lean = 0.29 * (1 - k);
      lunge = 3.4 * S * (1 - k);
      swing = 1.6 * (1 - k);
    }
  }
  const hf = u.hitFx > 0 ? u.hitFx : 0;

  c.save();
  c.translate(px, GY - z * 13 * SC);
  if (ghost !== undefined) c.globalAlpha = ghost;
  else if (z > 0) c.globalAlpha = 1 - z * 0.13;

  // 接地影（2層でやわらかく見せる）。飛行は地面に小さく薄い影だけ落とす
  const fh = u.fly ? (BAL.airY || 56) + z * 10 : 0;
  const shC = u.side === 0 ? "rgba(28,52,92," : "rgba(92,28,20,";
  if (fh) {
    c.fillStyle = shC + ".30)";
    c.beginPath();
    c.ellipse(0, 0, bw * 0.8, 2.2 * S, 0, 0, 7);
    c.fill();
  } else {
    c.fillStyle = "rgba(0,0,0,.16)";
    c.beginPath();
    c.ellipse(0, 0, bw * 1.15, 4.2 * S, 0, 0, 7);
    c.fill();
    c.fillStyle = shC + ".46)";
    c.beginPath();
    c.ellipse(0, 0, bw * 0.72, 2.6 * S, 0, 0, 7);
    c.fill();
  }
  if (fh) c.translate(0, -fh * S);

  if (u.dir < 0) c.scale(-1, 1);
  if (tilt) c.rotate(tilt);
  if (lean) c.rotate(lean);
  c.translate(lunge - hf * 4.6 * S, -bob);
  if (hf) c.scale(1 + hf * 0.19, 1 - hf * 0.16);

  // 弱体化されている印。輪が縮みながら回る
  if (u.curse > 0 && DET && !ghost) {
    const cp = t * 2.2 + u.x * 0.05,
      ca = 0.2 + 0.16 * Math.sin(cp * 2);
    c.save();
    c.strokeStyle = "rgba(206,128,196," + ca.toFixed(3) + ")";
    c.lineWidth = Math.max(1, 1.6 * S);
    for (let k = 0; k < 2; k++) {
      const rr = bw * (1.1 - k * 0.34) * (1 + 0.1 * Math.sin(cp + k));
      c.beginPath();
      c.ellipse(0, -bh * (0.42 + k * 0.3), rr, rr * 0.3, 0, 0, 7);
      c.stroke();
    }
    if (u.hexFx > 0) {
      c.fillStyle = "rgba(216,138,206," + (u.hexFx * 0.24).toFixed(3) + ")";
      c.beginPath();
      c.ellipse(0, -bh * 0.52, bw * 1.2, bh * 0.86, 0, 0, 7);
      c.fill();
    }
    c.restore();
  }
  const flash = u.flash > 0;
  const cloth = flash ? "#FFF3EF" : P.cloth,
    cloth2 = flash ? "#FFE9E4" : P.cloth2;
  const metal0 = flash ? "#FFFFFF" : P.metal;
  if (u.lord) {
    drawBoss(c, u, S, P, K, t);
    c.restore();
    return;
  }
  if (u.mon) {
    drawYokai(c, u, S, P, K, t);
    c.restore();
    return;
  }
  if (u.arm === "siege") {
    drawMachine(c, u, S, cloth2, metal0, K, P, t);
    c.restore();
    return;
  }
  if (u.arm === "air") {
    drawFlyer(c, u, S, cloth, cloth2, metal0, K, P, t);
    c.restore();
    return;
  }
  // 暗い時代の装束は少し持ち上げて、背景から浮かせる
  const skin = flash ? "#FFFFFF" : P.skin,
    metal = flash ? "#FFFFFF" : P.metal;

  /* --- 下半身／乗り物 --- */
  if (u.arm === "cavalry" && u.era <= 1) {
    // 馬はまだいない時代。大きく踏み出す韋駄天として描く
    const leg = mixK(cloth2, 0.22);
    limb(c, -bw * 0.18 + legA * 0.5, -6.6 * S, -bw * 0.34 + legA * 2.1, -0.4 * S, 3.2 * S, leg, S, K);
    limb(c, bw * 0.18 - legA * 0.5, -6.6 * S, bw * 0.34 - legA * 2.1, -0.4 * S, 3.2 * S, leg, S, K);
    c.globalAlpha = 0.28;
    c.strokeStyle = mixW(P.accent, 0.3);
    c.lineWidth = 1.6 * S;
    c.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(-bw * (1.2 + k * 0.5), -bh * (0.3 + k * 0.22));
      c.lineTo(-bw * (0.5 + k * 0.5), -bh * (0.3 + k * 0.22));
      c.stroke();
    }
    c.globalAlpha = 1;
    c.translate(0, -6.2 * S);
  } else if (u.arm === "cavalry") {
    const mw = 22.5 * u.w * S,
      mh = 14.0 * u.w * S,
      my = -10.0 * u.w * S;
    if (u.era >= NE - 1) {
      pbox(c, -mw * 0.72, -3.2 * S, mw * 1.5, 3.4 * S, shade(cloth2, 0.7), S, false);
      pbox(c, -mw * 0.9, my - mh * 0.5, mw * 1.8, mh, cloth2, S);
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.8, 1.3 * S);
      c.strokeRect(-mw * 0.9, my - mh * 0.5, mw * 1.8, mh);
      c.fillStyle = P.accent;
      c.fillRect(mw * 0.38, my - mh * 0.34, mw * 0.48, mh * 0.36);
      c.fillStyle = "#141A22";
      c.beginPath();
      c.arc(-mw * 0.5, -2.6 * S, 3.8 * S, 0, 7);
      c.fill();
      c.beginPath();
      c.arc(mw * 0.5, -2.6 * S, 3.8 * S, 0, 7);
      c.fill();
      c.fillStyle = shade(P.accent, 1.2);
      c.fillRect(-mw * 0.5 - 1.6 * S, -3.4 * S, 3.2 * S, 1.4 * S);
    } else {
      const leg = mixK(cloth2, 0.22);
      limb(c, -mw * 0.5 + legA, my + mh * 0.25, -mw * 0.56 + legA * 1.4, -0.5 * S, 2.9 * S, leg, S, K);
      limb(c, mw * 0.42 - legA, my + mh * 0.25, mw * 0.48 - legA * 1.4, -0.5 * S, 2.9 * S, leg, S, K);
      limb(c, -mw * 0.72 - legA, my + mh * 0.25, -mw * 0.78 - legA * 1.4, -0.5 * S, 2.9 * S, leg, S, K);
      limb(c, mw * 0.62 + legA, my + mh * 0.25, mw * 0.68 + legA * 1.4, -0.5 * S, 2.9 * S, leg, S, K);
      const body = () => {
        c.beginPath();
        c.ellipse(0, my, mw * 0.88, mh * 0.56, 0, 0, 7);
        c.closePath();
      };
      ppath(c, body, mixW(cloth2, 0.1), S, my - mh * 0.56, my + mh * 0.56, true, K);
      const neck = () => {
        c.beginPath();
        c.moveTo(mw * 0.52, my - mh * 0.15);
        c.lineTo(mw * 1.02, my - mh * 1.05);
        c.lineTo(mw * 1.3, my - mh * 0.42);
        c.lineTo(mw * 0.82, my + mh * 0.28);
        c.closePath();
      };
      ppath(c, neck, mixW(cloth2, 0.1), S, my - mh * 1.05, my + mh * 0.28, true, K);
      c.fillStyle = K;
      c.fillRect(mw * 1.06, my - mh * 0.92, 2.0 * S, 2.0 * S);
      const ear = () => {
        c.beginPath();
        c.moveTo(mw * 0.94, my - mh * 1.02);
        c.lineTo(mw * 1.0, my - mh * 1.34);
        c.lineTo(mw * 1.1, my - mh * 1.0);
        c.closePath();
      };
      ppath(c, ear, mixW(cloth2, 0.1), S, my - mh * 1.34, my - mh * 1.0, true, K);
      c.strokeStyle = mixK(cloth2, 0.34);
      c.lineWidth = Math.max(1.0, 1.8 * S);
      c.lineCap = "round";
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(mw * (0.52 + k * 0.13), my - mh * (0.24 + k * 0.2));
        c.lineTo(mw * (0.44 + k * 0.13), my - mh * (0.52 + k * 0.22));
        c.stroke();
      }
      c.fillStyle = shade(P.accent, 1.0);
      c.fillRect(-mw * 0.72, my - mh * 0.66, mw * 1.12, 2.4 * S);
    }
    c.translate(-1.5 * S, my - mh * 0.5);
    c.scale(0.62, 0.62);
  } else {
    const leg = mixK(cloth2, 0.22);
    limb(c, -bw * 0.2 + legA * 0.4, -6.2 * S, -bw * 0.22 + legA, -0.4 * S, 3.0 * S, leg, S, K);
    limb(c, bw * 0.2 - legA * 0.4, -6.2 * S, bw * 0.22 - legA, -0.4 * S, 3.0 * S, leg, S, K);
    c.translate(0, -5.8 * S);
  }

  /* --- 背負い物：系譜の目印。胴より先に描いて背中側に置く --- */
  const pack = (LIN[u.lin] && LIN[u.lin].pack) || "";
  if (pack === "sack") {
    const sk = () => {
      c.beginPath();
      c.ellipse(-bw * 0.8, -bh * 0.62, bw * 0.46, bh * 0.3, -0.18, 0, 7);
      c.closePath();
    };
    ppath(c, sk, mixW(cloth2, 0.16), S, -bh * 0.92, -bh * 0.32, true, K);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.7, 1.1 * S);
    c.beginPath();
    c.moveTo(-bw * 0.62, -bh * 0.86);
    c.lineTo(-bw * 0.3, -bh * 0.7);
    c.stroke();
  } else if (pack === "quiverHip") {
    const qv = () => {
      c.beginPath();
      c.rect(-bw * 0.86, -bh * 0.46, bw * 0.34, bh * 0.4);
      c.closePath();
    };
    ppath(c, qv, mixK(cloth2, 0.18), S, -bh * 0.46, -bh * 0.06, true, K);
    c.strokeStyle = mixW(P.metal, 0.1);
    c.lineWidth = Math.max(0.7, 1.1 * S);
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(-bw * 0.8 + k * bw * 0.11, -bh * 0.46);
      c.lineTo(-bw * 0.86 + k * bw * 0.11, -bh * 0.66);
      c.stroke();
    }
  } else if (pack === "quiverBack") {
    const qv = () => {
      c.beginPath();
      c.moveTo(-bw * 0.92, -bh * 1.0);
      c.lineTo(-bw * 0.5, -bh * 1.08);
      c.lineTo(-bw * 0.42, -bh * 0.34);
      c.lineTo(-bw * 0.82, -bh * 0.28);
      c.closePath();
    };
    ppath(c, qv, mixK(cloth2, 0.14), S, -bh * 1.08, -bh * 0.28, true, K);
    for (let k = 0; k < 4; k++) {
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.8, 1.3 * S);
      c.beginPath();
      c.moveTo(-bw * 0.86 + k * bw * 0.13, -bh * 1.02);
      c.lineTo(-bw * 1.0 + k * bw * 0.13, -bh * 1.34);
      c.stroke();
      c.fillStyle = mixW(P.cloth, 0.3);
      c.beginPath();
      c.arc(-bw * 1.0 + k * bw * 0.13, -bh * 1.36, 1.5 * S, 0, 7);
      c.fill();
    }
  } else if (pack === "shide") {
    c.strokeStyle = "rgba(245,242,232,.92)";
    c.lineWidth = Math.max(1.0, 1.7 * S);
    for (let k = 0; k < 2; k++) {
      const ox = -bw * (0.64 + k * 0.26),
        ph2 = t * 1.9 + u.x * 0.1 + k;
      c.beginPath();
      c.moveTo(ox, -bh * 1.02);
      for (let s2 = 1; s2 <= 4; s2++) {
        c.lineTo(ox + (s2 % 2 ? 3.2 : -3.2) * S + Math.sin(ph2 + s2) * 1.2 * S, -bh * 1.02 + s2 * bh * 0.19);
      }
      c.stroke();
    }
  } else if (pack === "halo") {
    const ph2 = t * 0.9 + u.x * 0.05;
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = rgba(P.accent, 0.3 + k * 0.16);
      c.lineWidth = Math.max(0.9, 1.5 * S);
      const r = bw * (1.3 - k * 0.3),
        sq = 0.3 + 0.16 * Math.sin(ph2 + k * 1.4);
      c.save();
      c.translate(-bw * 0.1, -bh * 0.92);
      c.scale(1, sq);
      c.beginPath();
      c.arc(0, 0, r, 0, 7);
      c.stroke();
      c.restore();
    }
  } else if (pack === "sashimono") {
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.0, 1.7 * S);
    c.beginPath();
    c.moveTo(-bw * 0.52, -bh * 0.7);
    c.lineTo(-bw * 0.7, -bh * 2.26);
    c.stroke();
    const wave = Math.sin(t * 2.6 + u.x * 0.12) * 2.2 * S;
    const fl = () => {
      c.beginPath();
      c.moveTo(-bw * 0.7, -bh * 2.26);
      c.lineTo(-bw * 0.7 + bw * 0.9 + wave, -bh * 2.2);
      c.lineTo(-bw * 0.66 + bw * 0.9 + wave, -bh * 1.52);
      c.lineTo(-bw * 0.66, -bh * 1.58);
      c.closePath();
    };
    ppath(c, fl, mixW(P.cloth, 0.18), S, -bh * 2.26, -bh * 1.52, true, K);
    c.fillStyle = P.accent;
    c.beginPath();
    c.arc(-bw * 0.7 + bw * 0.42 + wave * 0.5, -bh * 1.88, 2.6 * S, 0, 7);
    c.fill();
  }

  /* --- 後ろ腕 --- */
  // 機巧と飛行はこの上で専用の描画へ抜けている。ここへ来るのは人型だけ
  const shY = -bh * 0.8;
  {
    limb(c, -bw * 0.3, shY, -bw * 0.62 - swing * 1.4 * S, shY + bh * 0.34, 2.7 * S, mixK(cloth, 0.16), S, K);
  }

  /* --- 胴 --- */
  if (u.arm === "mystic") {
    const robe = () => {
      c.beginPath();
      c.moveTo(-bw * 0.46, 0);
      c.lineTo(-bw * 0.66, -bh);
      c.lineTo(bw * 0.66, -bh);
      c.lineTo(bw * 0.46, 0);
      c.closePath();
    };
    ppath(c, robe, cloth, S, -bh, 0);
    torsoTex(c, E.tex, P, -bw * 0.6, -bh, bw * 1.2, bh, S, K);
    outline(c, robe, S, K);
  } else {
    pbox(c, -bw / 2, -bh, bw, bh, cloth, S);
    torsoTex(c, E.tex, P, -bw / 2, -bh, bw, bh, S, K);
    c.strokeStyle = K;
    c.lineWidth = Math.max(0.8, 1.35 * S);
    c.strokeRect(-bw / 2, -bh, bw, bh);
  }
  // 陣営帯
  c.fillStyle = u.side === 0 ? "rgba(96,152,214,.95)" : "rgba(228,100,74,.95)";
  c.fillRect(-bw / 2, -bh + 1.2 * S, bw, 2.4 * S);

  /* --- 頭 --- */
  const hy = -bh - hr * 1.05;
  const head = () => {
    c.beginPath();
    c.arc(0, hy + hr * 0.1, hr, 0, 7);
    c.closePath();
  };
  ppath(c, head, skin, S, hy + hr * 0.1 - hr, hy + hr * 0.1 + hr, true, K);
  if (!flash && DET) {
    c.fillStyle = K;
    c.fillRect(hr * 0.3, hy + hr * 0.02, Math.max(1, 1.35 * S), Math.max(1.4, 1.9 * S));
  }
  drawHat(c, E.hat, P, hr * 0.92, hy - hr * 0.55, S, K);

  /* --- 前腕＋得物：系譜ごとに形が違う --- */
  const gx = bw * 0.62,
    gy = shY + bh * 0.1;
  const wep = (LIN[u.lin] && LIN[u.lin].wep) || "spear";
  c.lineCap = "round";

  // 振り抜きの軌跡。刃物だけ、打ちの瞬間に弧が残る
  const ARC: Record<string, number> = { spear: 0.92, club: 0.86, naginata: 1.24, katana: 1.42, sabre: 1.14 };
  if (u.atkA > 0 && DET && ARC[wep] && aa > 0.24 && aa < 0.8) {
    const k = Math.max(0, 1 - Math.abs(aa - 0.46) * 3.0);
    if (k > 0.03) {
      const R = bh * ARC[wep],
        a0 = -1.42,
        a1 = a0 + 1.95 * Math.min(1, (aa - 0.24) / 0.42);
      c.save();
      c.translate(bw * 0.3, -bh * 0.62);
      c.lineCap = "round";
      c.strokeStyle = "rgba(255,250,238,1)";
      c.globalAlpha = k * 0.16;
      c.lineWidth = Math.max(3.0, 7.6 * S);
      c.beginPath();
      c.arc(0, 0, R, a0, a1);
      c.stroke();
      c.globalAlpha = k * 0.46;
      c.lineWidth = Math.max(1.2, 2.6 * S);
      c.beginPath();
      c.arc(0, 0, R, a0, a1);
      c.stroke();
      c.globalAlpha = 1;
      c.restore();
    }
  }

  if (wep === "spear") {
    // 歩む者：長柄の槍と丸盾。近代からは銃剣つきの小銃に変わる
    const sx2 = gx + swing * 2.0 * S,
      sy2 = gy - swing * 1.2 * S;
    c.save();
    c.translate(sx2, sy2);
    c.rotate(swing * 0.22);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.4, 2.9 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.42);
    c.lineTo(0, -bh * 0.72);
    c.stroke();
    c.strokeStyle = u.era >= 4 ? mixK(metal, 0.34) : mixW(P.cloth2, 0.12);
    c.lineWidth = Math.max(0.9, 1.9 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.42);
    c.lineTo(0, -bh * 0.72);
    c.stroke();
    const tip = () => {
      c.beginPath();
      c.moveTo(-2.4 * S, -bh * 0.66);
      c.lineTo(0, -bh * 0.98);
      c.lineTo(2.4 * S, -bh * 0.66);
      c.closePath();
    };
    ppath(c, tip, metal, S, -bh * 0.98, -bh * 0.66, true, K);
    c.restore();
    limb(c, bw * 0.26, shY, sx2, sy2, 2.7 * S, cloth, S, K);
    if (u.era < 4) {
      const sh = () => {
        c.beginPath();
        c.ellipse(-bw * 0.66, -bh * 0.5, 4.9 * S, 6.1 * S, 0, 0, 7);
        c.closePath();
      };
      ppath(c, sh, shade(P.cloth2, 0.94), S, -bh * 0.5 - 6.1 * S, -bh * 0.5 + 6.1 * S, true, K);
      if (DET) {
        c.fillStyle = shade(metal, 1.05);
        c.beginPath();
        c.arc(-bw * 0.66, -bh * 0.5, 1.7 * S, 0, 7);
        c.fill();
      }
    }
  } else if (wep === "club") {
    // 群れる者：短くて太い得物。低く構えるので背が低く見える
    const sx2 = gx + swing * 2.6 * S,
      sy2 = gy - swing * 0.6 * S;
    c.save();
    c.translate(sx2, sy2);
    c.rotate(-0.42 + swing * 0.5);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.3, 2.6 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.18);
    c.lineTo(0, -bh * 0.34);
    c.stroke();
    c.strokeStyle = mixW(P.cloth2, 0.16);
    c.lineWidth = Math.max(0.9, 1.7 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.18);
    c.lineTo(0, -bh * 0.34);
    c.stroke();
    const hd = () => {
      c.beginPath();
      c.rect(-3.6 * S, -bh * 0.56, 7.2 * S, bh * 0.24);
      c.closePath();
    };
    ppath(c, hd, u.era >= 4 ? mixK(metal, 0.22) : mixW(P.cloth2, 0.02), S, -bh * 0.56, -bh * 0.32, true, K);
    c.restore();
    limb(c, bw * 0.26, shY, sx2, sy2, 2.7 * S, cloth, S, K);
  } else if (wep === "shortbow") {
    // 投げる者：低く構える。原始は投石紐、中世まで短弓、近世から短筒
    if (u.era >= NE - 1) {
      limb(c, bw * 0.26, shY, bw * 0.66, -bh * 0.84, 2.6 * S, cloth, S, K);
      const ph2 = t * 3.2 + u.x * 0.1;
      c.fillStyle = mixW(metal, 0.2);
      c.beginPath();
      c.ellipse(bw * 0.98, -bh * 0.92 + Math.sin(ph2) * 1.6 * S, 4.6 * S, 1.9 * S, 0, 0, 7);
      c.fill();
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.7, 1.1 * S);
      c.stroke();
      c.fillStyle = P.accent;
      c.beginPath();
      c.arc(bw * 1.24, -bh * 0.92 + Math.sin(ph2) * 1.6 * S, 1.7 * S, 0, 7);
      c.fill();
    } else if (u.era >= 3) {
      const gun = () => {
        c.beginPath();
        c.rect(bw * 0.2, -bh * 0.6, bw * 0.98, 2.4 * S);
        c.closePath();
      };
      ppath(c, gun, mixK(metal, 0.38), S, -bh * 0.6, -bh * 0.6 + 2.4 * S, false, K);
      const stock = () => {
        c.beginPath();
        c.moveTo(bw * 0.22, -bh * 0.6);
        c.lineTo(bw * 0.22, -bh * 0.6 + 4.0 * S);
        c.lineTo(bw * -0.1, -bh * 0.46);
        c.lineTo(bw * -0.1, -bh * 0.56);
        c.closePath();
      };
      ppath(c, stock, cloth2, S, -bh * 0.6, -bh * 0.46, true, K);
      limb(c, bw * 0.26, shY, bw * 0.5, -bh * 0.54, 2.6 * S, cloth, S, K);
    } else if (u.era === 0) {
      const ph2 = t * 5.0 + u.x * 0.14;
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.9, 1.5 * S);
      c.beginPath();
      c.moveTo(bw * 0.42, -bh * 0.62);
      c.quadraticCurveTo(bw * 0.86, -bh * 0.4 + Math.sin(ph2) * 3 * S, bw * 0.62, -bh * 0.14);
      c.stroke();
      c.fillStyle = mixK(P.metal, 0.28);
      c.beginPath();
      c.arc(bw * 0.62, -bh * 0.12, 2.8 * S, 0, 7);
      c.fill();
      limb(c, bw * 0.26, shY, bw * 0.42, -bh * 0.62, 2.6 * S, cloth, S, K);
    } else {
      c.strokeStyle = K;
      c.lineWidth = Math.max(1.2, 2.4 * S);
      c.beginPath();
      c.arc(bw * 0.5, -bh * 0.44, 5.2 * S, -1.15, 1.15);
      c.stroke();
      c.strokeStyle = shade(metal, 0.95);
      c.lineWidth = Math.max(0.8, 1.4 * S);
      c.beginPath();
      c.arc(bw * 0.5, -bh * 0.44, 5.2 * S, -1.15, 1.15);
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,.55)";
      c.lineWidth = Math.max(0.5, 0.8 * S);
      const r = 5.2 * S,
        cx = bw * 0.5,
        cy = -bh * 0.44;
      c.beginPath();
      c.moveTo(cx + r * Math.cos(-1.15), cy + r * Math.sin(-1.15));
      c.lineTo(cx + r * Math.cos(1.15), cy + r * Math.sin(1.15));
      c.stroke();
      limb(c, bw * 0.26, shY, bw * 0.32, -bh * 0.44, 2.6 * S, cloth, S, K);
    }
  } else if (wep === "longbow") {
    // 射抜く者：背丈より長い得物。高く構える
    if (u.era >= NE - 1) {
      limb(c, bw * 0.26, shY, bw * 0.7, -bh * 1.12, 2.6 * S, cloth, S, K);
      c.strokeStyle = K;
      c.lineWidth = Math.max(1.0, 2.0 * S);
      c.beginPath();
      c.moveTo(bw * 0.58, -bh * 1.28);
      c.lineTo(bw * 1.86, -bh * 1.28);
      c.stroke();
      c.strokeStyle = shade(metal, 1.0);
      c.lineWidth = Math.max(0.7, 1.2 * S);
      c.beginPath();
      c.moveTo(bw * 0.58, -bh * 1.28);
      c.lineTo(bw * 1.86, -bh * 1.28);
      c.stroke();
      c.fillStyle = P.accent;
      c.beginPath();
      c.arc(bw * 1.4, -bh * 1.34, 3.2 * S, 0, 7);
      c.fill();
      c.globalAlpha = 0.3;
      c.beginPath();
      c.arc(bw * 1.4, -bh * 1.34, 6.4 * S, 0, 7);
      c.fill();
      c.globalAlpha = 1;
    } else if (u.era >= 3) {
      const gun = () => {
        c.beginPath();
        c.rect(bw * 0.14, -bh * 0.96, bw * 1.86, 2.6 * S);
        c.closePath();
      };
      ppath(c, gun, mixK(metal, 0.44), S, -bh * 0.96, -bh * 0.96 + 2.6 * S, false, K);
      const stock = () => {
        c.beginPath();
        c.moveTo(bw * 0.16, -bh * 0.96);
        c.lineTo(bw * 0.16, -bh * 0.96 + 5.0 * S);
        c.lineTo(bw * -0.24, -bh * 0.74);
        c.lineTo(bw * -0.24, -bh * 0.88);
        c.closePath();
      };
      ppath(c, stock, cloth2, S, -bh * 0.96, -bh * 0.74, true, K);
      c.strokeStyle = K;
      c.lineWidth = Math.max(0.8, 1.3 * S);
      c.beginPath();
      c.moveTo(bw * 1.34, -bh * 0.9);
      c.lineTo(bw * 1.2, -bh * 0.62);
      c.moveTo(bw * 1.34, -bh * 0.9);
      c.lineTo(bw * 1.52, -bh * 0.62);
      c.stroke();
      limb(c, bw * 0.26, shY, bw * 0.52, -bh * 0.88, 2.6 * S, cloth, S, K);
    } else {
      c.strokeStyle = K;
      c.lineWidth = Math.max(1.4, 2.8 * S);
      c.beginPath();
      c.arc(bw * 0.52, -bh * 0.7, 10.4 * S, -1.36, 1.36);
      c.stroke();
      c.strokeStyle = shade(metal, 0.92);
      c.lineWidth = Math.max(0.9, 1.6 * S);
      c.beginPath();
      c.arc(bw * 0.52, -bh * 0.7, 10.4 * S, -1.36, 1.36);
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,.55)";
      c.lineWidth = Math.max(0.5, 0.9 * S);
      const r = 10.4 * S,
        cx = bw * 0.52,
        cy = -bh * 0.7;
      c.beginPath();
      c.moveTo(cx + r * Math.cos(-1.36), cy + r * Math.sin(-1.36));
      c.lineTo(cx + r * Math.cos(1.36), cy + r * Math.sin(1.36));
      c.stroke();
      limb(c, bw * 0.26, shY, bw * 0.34, -bh * 0.7, 2.6 * S, cloth, S, K);
    }
  } else if (wep === "staff") {
    // 祈る者：錫杖と玉
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.4, 2.9 * S);
    c.beginPath();
    c.moveTo(bw * 0.6, bh * 0.06);
    c.lineTo(bw * 0.6, -bh * 1.36);
    c.stroke();
    c.strokeStyle = mixW(P.cloth2, 0.14);
    c.lineWidth = Math.max(0.9, 1.8 * S);
    c.beginPath();
    c.moveTo(bw * 0.6, bh * 0.06);
    c.lineTo(bw * 0.6, -bh * 1.36);
    c.stroke();
    limb(c, bw * 0.3, shY, bw * 0.56, -bh * 0.62, 2.6 * S, cloth, S, K);
    const pulse = 0.86 + 0.14 * Math.sin(t * 4.2 + u.x);
    c.fillStyle = P.accent;
    c.globalAlpha = 0.26 * pulse;
    c.beginPath();
    c.arc(bw * 0.6, -bh * 1.48, 7.4 * S, 0, 7);
    c.fill();
    c.globalAlpha = 1;
    c.beginPath();
    c.arc(bw * 0.6, -bh * 1.48, 3.8 * S * pulse, 0, 7);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.75)";
    c.beginPath();
    c.arc(bw * 0.6 - 1.1 * S, -bh * 1.52, 1.4 * S, 0, 7);
    c.fill();
  } else if (wep === "baton") {
    // 統べる者：采配。短い柄に房が垂れる。現代は端末になる
    const ph2 = t * 3.0 + u.x * 0.08;
    c.save();
    c.translate(bw * 0.62, -bh * 0.88);
    c.rotate(-0.3 + swing * 0.4);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.2, 2.4 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.26);
    c.lineTo(0, -bh * 0.24);
    c.stroke();
    c.strokeStyle = mixW(P.metal, 0.18);
    c.lineWidth = Math.max(0.8, 1.5 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.26);
    c.lineTo(0, -bh * 0.24);
    c.stroke();
    if (u.era >= NE - 1) {
      const pl = () => {
        c.beginPath();
        c.rect(-4.4 * S, -bh * 0.48, 8.8 * S, bh * 0.26);
        c.closePath();
      };
      ppath(c, pl, mixK(metal, 0.3), S, -bh * 0.48, -bh * 0.22, true, K);
      c.fillStyle = P.accent;
      c.globalAlpha = 0.55 + 0.35 * Math.sin(ph2);
      c.fillRect(-3.0 * S, -bh * 0.42, 6.0 * S, bh * 0.12);
      c.globalAlpha = 1;
    } else {
      c.strokeStyle = "rgba(246,240,226,.92)";
      c.lineWidth = Math.max(0.9, 1.5 * S);
      for (let k = 0; k < 5; k++) {
        const ox = (-2.4 + k * 1.2) * S;
        c.beginPath();
        c.moveTo(ox, -bh * 0.24);
        c.quadraticCurveTo(
          ox + Math.sin(ph2 + k) * 1.8 * S,
          -bh * 0.46,
          ox + Math.sin(ph2 + k) * 3.0 * S,
          -bh * 0.62,
        );
        c.stroke();
      }
    }
    c.restore();
    limb(c, bw * 0.28, shY, bw * 0.58, -bh * 0.8, 2.6 * S, cloth, S, K);
  } else if (wep === "naginata") {
    // 駆ける者：反りのある薙刀
    const sw2 = swing * 0.3;
    c.save();
    c.translate(bw * 0.34, -bh * 0.62);
    c.rotate(-0.16 + sw2);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.4, 2.8 * S);
    c.beginPath();
    c.moveTo(-bw * 0.3, bh * 0.24);
    c.lineTo(bw * 1.24, -bh * 0.16);
    c.stroke();
    c.strokeStyle = mixW(P.cloth2, 0.1);
    c.lineWidth = Math.max(0.9, 1.8 * S);
    c.beginPath();
    c.moveTo(-bw * 0.3, bh * 0.24);
    c.lineTo(bw * 1.24, -bh * 0.16);
    c.stroke();
    const bl = () => {
      c.beginPath();
      c.moveTo(bw * 1.2, -bh * 0.12);
      c.quadraticCurveTo(bw * 1.86, -bh * 0.44, bw * 2.02, -bh * 0.14);
      c.quadraticCurveTo(bw * 1.72, -bh * 0.1, bw * 1.24, bh * 0.06);
      c.closePath();
    };
    ppath(c, bl, metal, S, -bh * 0.44, bh * 0.06, true, K);
    c.restore();
    limb(c, bw * 0.24, shY, bw * 0.44, -bh * 0.58, 2.7 * S, cloth, S, K);
  } else if (wep === "shield") {
    // 阻む者：身の丈ほどの大盾。得物は腰に差した短い物だけ
    const sw2 = swing * 0.16;
    c.save();
    c.translate(bw * 0.3 - sw2 * 4 * S, -bh * 0.52);
    c.rotate(sw2 * 0.2);
    const sd = () => {
      c.beginPath();
      c.moveTo(-bw * 0.3, -bh * 0.66);
      c.lineTo(bw * 0.62, -bh * 0.72);
      c.lineTo(bw * 0.7, bh * 0.4);
      c.lineTo(bw * 0.16, bh * 0.62);
      c.lineTo(-bw * 0.3, bh * 0.34);
      c.closePath();
    };
    ppath(c, sd, mixW(cloth2, 0.06), S, -bh * 0.72, bh * 0.62, true, K);
    // 補強の帯と鋲
    c.strokeStyle = mixK(metal, 0.1);
    c.lineWidth = Math.max(1.1, 2.1 * S);
    c.beginPath();
    c.moveTo(-bw * 0.26, -bh * 0.16);
    c.lineTo(bw * 0.66, -bh * 0.2);
    c.stroke();
    c.beginPath();
    c.moveTo(-bw * 0.28, bh * 0.12);
    c.lineTo(bw * 0.68, bh * 0.08);
    c.stroke();
    if (DET) {
      c.fillStyle = mixW(metal, 0.24);
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(-bw * 0.14 + k * bw * 0.34, -bh * 0.18, 1.5 * S, 0, 7);
        c.fill();
        c.beginPath();
        c.arc(-bw * 0.14 + k * bw * 0.34, bh * 0.1, 1.5 * S, 0, 7);
        c.fill();
      }
    }
    // 受けの光：叩かれた直後だけ盾の面が光る
    if (u.hitFx > 0) {
      c.globalAlpha = Math.min(0.85, u.hitFx * 0.9);
      c.fillStyle = "#EAF2FF";
      c.beginPath();
      sd();
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
    limb(c, bw * 0.22, shY, bw * 0.3, -bh * 0.46, 2.8 * S, cloth, S, K);
    // 腰の短刀
    c.strokeStyle = mixK(metal, 0.16);
    c.lineWidth = Math.max(1.0, 1.8 * S);
    c.beginPath();
    c.moveTo(-bw * 0.5, -bh * 0.22);
    c.lineTo(-bw * 0.86, -bh * 0.02);
    c.stroke();
  } else if (wep === "crossbow") {
    // 兵を射る者：水平に構える弩。近代からは小銃
    const rc = Math.max(0, 1 - Math.abs(u.atkA - 0.5) * 3.2); // 撃った瞬間だけ後座
    c.save();
    c.translate(bw * 0.1 - rc * 2.6 * S, -bh * 0.6);
    // 銃床（斜め下）と機関部（水平）
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.5, 3.0 * S);
    c.beginPath();
    c.moveTo(-bw * 0.46, bh * 0.16);
    c.lineTo(-bw * 0.16, -bh * 0.02);
    c.lineTo(bw * 1.34, -bh * 0.06);
    c.stroke();
    c.strokeStyle = u.era >= 3 ? mixK(metal, 0.28) : mixW(P.cloth2, 0.06);
    c.lineWidth = Math.max(1.0, 2.0 * S);
    c.beginPath();
    c.moveTo(-bw * 0.46, bh * 0.16);
    c.lineTo(-bw * 0.16, -bh * 0.02);
    c.lineTo(bw * 1.34, -bh * 0.06);
    c.stroke();
    if (u.era < 3) {
      // 弩の弓：柄に対して直角に張り出す
      c.strokeStyle = mixK(metal, 0.02);
      c.lineWidth = Math.max(1.2, 2.2 * S);
      c.beginPath();
      c.moveTo(bw * 0.92, -bh * 0.62);
      c.quadraticCurveTo(bw * 1.14, -bh * 0.02, bw * 0.92, bh * 0.56);
      c.stroke();
      c.strokeStyle = "rgba(242,238,224,.92)";
      c.lineWidth = Math.max(0.8, 1.2 * S);
      c.beginPath();
      c.moveTo(bw * 0.92, -bh * 0.62);
      c.lineTo(bw * 0.42 - rc * 3 * S, -bh * 0.02);
      c.lineTo(bw * 0.92, bh * 0.56);
      c.stroke();
      // 装填した矢
      c.strokeStyle = mixW(metal, 0.2);
      c.lineWidth = Math.max(0.9, 1.4 * S);
      c.beginPath();
      c.moveTo(bw * 0.3, -bh * 0.06);
      c.lineTo(bw * 1.3, -bh * 0.02);
      c.stroke();
    } else {
      const bx = () => {
        c.beginPath();
        c.rect(bw * 0.44, -bh * 0.26, bw * 0.5, bh * 0.22);
        c.closePath();
      };
      ppath(c, bx, mixK(metal, 0.24), S, -bh * 0.26, -bh * 0.04, true, K);
    }
    if (rc > 0.6) {
      c.globalAlpha = (rc - 0.6) * 2.2;
      c.fillStyle = "#FFE6A8";
      c.beginPath();
      c.arc(bw * 1.38, -bh * 0.02, 3.6 * S, 0, 7);
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
    limb(c, bw * 0.24, shY, bw * 0.46 - rc * 2 * S, -bh * 0.56, 2.6 * S, cloth, S, K);
    limb(c, -bw * 0.14, shY, bw * 0.0, -bh * 0.36, 2.4 * S, cloth, S, K);
  } else if (wep === "heavybow") {
    // 馬を射る者：地に据える大弩。二脚と太い弓で「対騎馬の据え物」に見せる
    const rc = Math.max(0, 1 - Math.abs(u.atkA - 0.5) * 3.2);
    c.save();
    c.translate(bw * 0.34 - rc * 3.0 * S, -bh * 0.34);
    // 二脚（体より前に置く）
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.2, 2.2 * S);
    c.beginPath();
    c.moveTo(bw * 0.96, -bh * 0.06);
    c.lineTo(bw * 0.68, bh * 0.34);
    c.moveTo(bw * 0.96, -bh * 0.06);
    c.lineTo(bw * 1.26, bh * 0.34);
    c.stroke();
    // 太い台
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.8, 3.6 * S);
    c.beginPath();
    c.moveTo(-bw * 0.3, bh * 0.06);
    c.lineTo(bw * 1.46, -bh * 0.12);
    c.stroke();
    c.strokeStyle = mixK(metal, 0.26);
    c.lineWidth = Math.max(1.2, 2.4 * S);
    c.beginPath();
    c.moveTo(-bw * 0.3, bh * 0.06);
    c.lineTo(bw * 1.46, -bh * 0.12);
    c.stroke();
    if (u.era < 4) {
      // 太い弓（縦に長い）
      c.strokeStyle = mixW(metal, 0.02);
      c.lineWidth = Math.max(1.5, 2.8 * S);
      c.beginPath();
      c.moveTo(bw * 1.04, -bh * 1.0);
      c.quadraticCurveTo(bw * 1.42, -bh * 0.12, bw * 1.04, bh * 0.74);
      c.stroke();
      c.strokeStyle = "rgba(244,240,226,.95)";
      c.lineWidth = Math.max(0.8, 1.3 * S);
      c.beginPath();
      c.moveTo(bw * 1.04, -bh * 1.0);
      c.lineTo(bw * 0.52 - rc * 4 * S, -bh * 0.12);
      c.lineTo(bw * 1.04, bh * 0.74);
      c.stroke();
      // 太い矢
      c.strokeStyle = mixK(metal, 0.1);
      c.lineWidth = Math.max(1.1, 1.9 * S);
      c.beginPath();
      c.moveTo(bw * 0.4, -bh * 0.14);
      c.lineTo(bw * 1.5, -bh * 0.12);
      c.stroke();
      const tp = () => {
        c.beginPath();
        c.moveTo(bw * 1.44, -bh * 0.24);
        c.lineTo(bw * 1.72, -bh * 0.12);
        c.lineTo(bw * 1.44, -bh * 0.0);
        c.closePath();
      };
      ppath(c, tp, metal, S, -bh * 0.24, 0, true, K);
    } else {
      // 近代から：対騎・対装甲の長い筒
      const tb = () => {
        c.beginPath();
        c.rect(bw * 0.1, -bh * 0.36, bw * 1.44, bh * 0.28);
        c.closePath();
      };
      ppath(c, tb, mixK(metal, 0.22), S, -bh * 0.36, -bh * 0.08, true, K);
      c.fillStyle = mixK(metal, 0.42);
      c.fillRect(bw * 1.46, -bh * 0.4, bw * 0.22, bh * 0.36);
      c.strokeStyle = mixW(metal, 0.14);
      c.lineWidth = Math.max(1.0, 1.8 * S);
      c.beginPath();
      c.moveTo(bw * 0.52, -bh * 0.4);
      c.lineTo(bw * 0.52, -bh * 0.62);
      c.stroke();
      // 後方の噴煙
      if (rc > 0.5) {
        c.globalAlpha = (rc - 0.5) * 1.4;
        c.fillStyle = "rgba(210,206,196,.9)";
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.arc(bw * (-0.1 - k * 0.34), -bh * 0.22 + k * 2 * S, (3.0 + k * 2.2) * S, 0, 7);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    }
    if (rc > 0.6) {
      c.globalAlpha = (rc - 0.6) * 2.2;
      c.fillStyle = "#FFD9B0";
      c.beginPath();
      c.arc(bw * 1.62, -bh * 0.12, 4.6 * S, 0, 7);
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
    limb(c, bw * 0.22, shY, bw * 0.52 - rc * 2 * S, -bh * 0.36, 2.6 * S, cloth, S, K);
  } else if (wep === "sabre") {
    // 馳せる者：片手の反り刀。馬上でも見えるよう高く掲げる
    const sw2 = swing * 0.6;
    c.save();
    c.translate(bw * 0.4, -bh * 0.7);
    c.rotate(0.42 + sw2 * 1.1);
    // 柄
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.4, 2.7 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.26);
    c.lineTo(0, -bh * 0.02);
    c.stroke();
    c.strokeStyle = mixK(P.cloth2, 0.3);
    c.lineWidth = Math.max(1.0, 1.9 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.26);
    c.lineTo(0, -bh * 0.02);
    c.stroke();
    c.fillStyle = mixK(metal, 0.18);
    c.fillRect(-4.2 * S, -bh * 0.08, 8.4 * S, 2.4 * S);
    // 太くて短い反り身
    const bl2 = () => {
      c.beginPath();
      c.moveTo(-2.8 * S, -bh * 0.06);
      c.quadraticCurveTo(bw * 0.52, -bh * 0.62, bw * 0.46, -bh * 1.02);
      c.quadraticCurveTo(bw * 0.18, -bh * 0.62, 2.8 * S, -bh * 0.06);
      c.closePath();
    };
    ppath(c, bl2, mixW(metal, 0.28), S, -bh * 1.02, -bh * 0.06, true, K);
    c.strokeStyle = "rgba(255,252,240,.55)";
    c.lineWidth = Math.max(0.8, 1.1 * S);
    c.beginPath();
    c.moveTo(1.6 * S, -bh * 0.12);
    c.quadraticCurveTo(bw * 0.34, -bh * 0.6, bw * 0.4, -bh * 0.96);
    c.stroke();
    c.restore();
    limb(c, bw * 0.22, shY, bw * 0.36, -bh * 0.7, 2.5 * S, cloth, S, K);
  } else if (wep === "katana") {
    // 断つ者：長い太刀。溜めの構えと振り抜きがはっきり分かれる
    const sw2 = swing * 0.78;
    c.save();
    c.translate(bw * 0.3, -bh * 0.7);
    c.rotate(-0.34 + sw2 * 1.3);
    // 長い柄（両手で握る）
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.7, 3.2 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.46);
    c.lineTo(0, -bh * 0.04);
    c.stroke();
    c.strokeStyle = mixK(P.cloth2, 0.34);
    c.lineWidth = Math.max(1.2, 2.3 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.46);
    c.lineTo(0, -bh * 0.04);
    c.stroke();
    // 鍔
    c.fillStyle = mixW(metal, 0.06);
    c.fillRect(-5.2 * S, -bh * 0.1, 10.4 * S, 3.0 * S);
    // 厚い刃
    const bl2 = () => {
      c.beginPath();
      c.moveTo(-3.4 * S, -bh * 0.08);
      c.quadraticCurveTo(bw * 0.34, -bh * 0.94, bw * 0.14, -bh * 1.5);
      c.quadraticCurveTo(bw * 0.0, -bh * 0.88, 3.4 * S, -bh * 0.08);
      c.closePath();
    };
    ppath(c, bl2, mixW(metal, 0.34), S, -bh * 1.5, -bh * 0.08, true, K);
    // 刃筋の光
    c.strokeStyle = "rgba(255,253,244,.72)";
    c.lineWidth = Math.max(0.9, 1.3 * S);
    c.beginPath();
    c.moveTo(2.0 * S, -bh * 0.16);
    c.quadraticCurveTo(bw * 0.24, -bh * 0.9, bw * 0.12, -bh * 1.42);
    c.stroke();
    c.restore();
    limb(c, bw * 0.26, shY, bw * 0.3, -bh * 0.68, 2.7 * S, cloth, S, K);
    limb(c, -bw * 0.18, shY, bw * 0.16, -bh * 0.56, 2.4 * S, cloth, S, K); // 両手持ち
  } else if (wep === "hexrod") {
    // 惑わす者：二股の呪具。玉が二つ回り、当てた先を弱らせる
    const ph3 = t * 2.6 + u.x * 0.08;
    c.save();
    c.translate(bw * 0.52, -bh * 0.42);
    c.rotate(0.06 + swing * 0.24);
    c.strokeStyle = K;
    c.lineWidth = Math.max(1.5, 2.9 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.36);
    c.lineTo(0, -bh * 0.78);
    c.stroke();
    c.strokeStyle = mixW(P.cloth2, 0.2);
    c.lineWidth = Math.max(1.0, 1.9 * S);
    c.beginPath();
    c.moveTo(0, bh * 0.36);
    c.lineTo(0, -bh * 0.78);
    c.stroke();
    // 二股の先
    c.strokeStyle = mixW(metal, 0.16);
    c.lineWidth = Math.max(1.2, 2.1 * S);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, -bh * 0.74);
    c.quadraticCurveTo(-6.4 * S, -bh * 1.06, -3.6 * S, -bh * 1.3);
    c.moveTo(0, -bh * 0.74);
    c.quadraticCurveTo(6.4 * S, -bh * 1.06, 3.6 * S, -bh * 1.3);
    c.stroke();
    // 回る玉（弱体化を放っている最中はさらに光る）
    const gl = 1 + (u.atkA > 0 ? (1 - Math.abs(u.atkA - 0.5) * 2) * 0.55 : 0);
    const orb = mixW(P.cloth, 0.22);
    for (let k = 0; k < 2; k++) {
      const a2 = ph3 + k * Math.PI,
        rr = 5.6 * S;
      c.fillStyle = rgba(orb, 0.3);
      c.beginPath();
      c.arc(Math.cos(a2) * rr, -bh * 0.98 + Math.sin(a2) * rr * 0.4, 4.2 * S * gl, 0, 7);
      c.fill();
      c.fillStyle = mixW(orb, 0.4);
      c.beginPath();
      c.arc(Math.cos(a2) * rr, -bh * 0.98 + Math.sin(a2) * rr * 0.4, 2.2 * S, 0, 7);
      c.fill();
    }
    c.restore();
    limb(c, bw * 0.24, shY, bw * 0.52, -bh * 0.56, 2.5 * S, cloth, S, K);
  }
  c.restore();
}
