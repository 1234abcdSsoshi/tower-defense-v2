import { BAL } from "@/data/master";
import { buildBg } from "@/render/background";
import { bgCache, fgCache } from "@/render/caches";
import { drawCastle } from "@/render/castle";
import { drawDis } from "@/render/disaster";
import { drawFg } from "@/render/foreground";
import { drawMark } from "@/render/marks";
import { drawShots } from "@/render/shots";
import { effectSprite } from "@/render/effectSprites";
import { drawUnitAt } from "@/render/unit";
import { GY, H, SC, W, sx } from "@/render/viewport";
// 戦場そのものを描く唯一の場所。ここだけが本物の 2D コンテキストを直に触る
import { ctx as g } from "@/render/viewport";
import { G, vrng } from "@/sim/state";
import { lordAlive } from "@/sim/summons";
import { CFG } from "@/ui/config";
import type { Unit } from "@/sim/types";

/** 描画順の並べ替えにかかるもの。奥行き z と位置 x さえあればよい */
type ZItem = { z?: number; x: number };

/* ================================================================== 描画1フレーム */
/* 手前ほど後に描くため、奥行き z の降順（同値なら x 昇順）へ並べ直す作業用。
   毎フレーム確保し直さないよう、配列は使い回して長さだけ 0 に戻す。 */
const _drawBuf: Unit[] = [];
const _byZ = (a: ZItem, b: ZItem): number => (b.z || 0) - (a.z || 0) || a.x - b.x;
export function render(t: number): void {
  const sh = G.shake > 0 ? (vrng() - 0.5) * G.shake : 0;
  if (!bgCache[G.era]) bgCache[G.era] = buildBg(G.era);
  if (G.bgFade < 1 && bgCache[G.bgPrev]) {
    g.drawImage(bgCache[G.bgPrev], 0, 0, W, H);
    g.globalAlpha = G.bgFade;
    g.drawImage(bgCache[G.era], 0, 0, W, H);
    g.globalAlpha = 1;
  } else g.drawImage(bgCache[G.era], 0, 0, W, H);

  g.save();
  g.translate(sh, 0);
  drawCastle(g, 0, G.era, G.hpMe / G.hpMeMax, 0);
  drawCastle(g, 1, G.foeEra, G.hpFoe / G.hpFoeMax, 0);
  // 倒れた兵（見た目だけ。倒れながら薄くなる）
  for (const k of G.corpses) {
    const a = k.age / 0.62,
      e = 1 - (1 - a) * (1 - a);
    drawUnitAt(g, k, sx(k.x), t, SC, (1 - a * a) * 0.95, -1.38 * e);
  }
  _drawBuf.length = 0;
  for (let i = 0; i < G.units.length; i++) _drawBuf.push(G.units[i]);
  _drawBuf.sort(_byZ);
  const U = _drawBuf;
  for (const u of U) drawUnitAt(g, u, sx(u.x), t, SC);
  drawDis(g, t);
  if (CFG.mark) {
    g.globalAlpha = 1;
    for (const u of U) drawMark(g, u);
    g.globalAlpha = 1;
  }
  drawShots(g, t);
  // HPバー（奥行きに合わせて縮む）
  for (const u of U) {
    if (u.lord) continue; // 主は画面上部の帯で見せる
    if (u.hp >= u.maxHp) continue;
    const z = u.z || 0,
      zs = 1 - z * 0.17,
      bw = 17 * Math.min(u.w, 2.6) * SC * zs;
    const fh = u.fly ? ((BAL.airY || 56) + z * 10) * SC * zs : 0;
    const hb2 = Math.min(39 * u.w, 26 * (u.hh || u.w) + 34); // 妖のように背が高いと帯が飛ぶ
    const x = sx(u.x) - bw / 2,
      y = GY - (hb2 * zs + 9) * SC - z * 13 * SC - fh;
    g.globalAlpha = 1 - z * 0.18;
    g.fillStyle = "rgba(0,0,0,.55)";
    g.fillRect(x, y, bw, 2.6 * SC * zs);
    g.fillStyle = u.side === 0 ? "#7FB0E4" : "#E8836C";
    g.fillRect(x, y, bw * Math.max(0, u.hp / u.maxHp), 2.6 * SC * zs);
  }
  g.globalAlpha = 1;
  for (const p of G.parts) {
    const a = Math.max(0, p.l / p.m);
    const effectKind =
      p.k === 4 ? "poison-cloud" : p.k === 3 ? "impact" : p.k === 2 ? "dust" : p.k === 1 ? "spark" : "debris";
    const sprite = effectSprite(effectKind);
    if (sprite) {
      const radius = p.r || 4 * SC;
      const size =
        p.k === 4
          ? radius * (2.3 - a * 0.25)
          : p.k === 3
            ? radius * (3.3 - a * 0.5)
            : p.k === 2
              ? radius * 4.2
              : p.k === 1
                ? 18 * SC
                : 8 * SC;
      g.save();
      g.translate(p.x, p.y);
      if (p.k === 1) g.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 4);
      else if (!p.k) g.rotate((p.x * 0.17 + p.y * 0.11) % Math.PI);
      if (p.k === 1 || p.k === 3) g.globalCompositeOperation = "lighter";
      g.globalAlpha =
        p.k === 4 ? Math.min(0.82, a * 1.15) : p.k === 3 ? a * a * 0.9 : p.k === 2 ? a * 0.68 : a;
      const height = p.k === 4 ? size * 0.58 : size;
      g.drawImage(sprite, -size / 2, -height / 2, size, height);
      g.restore();
      continue;
    }
    if (p.k === 3) {
      // 着弾輪：中心の閃光から外へほどける。画像より拡大時も滑らか。
      const r = (p.r || 8 * SC) * (1.8 - a * 0.8);
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = a * a * 0.84;
      g.strokeStyle = p.c;
      g.lineWidth = Math.max(1, 2.6 * SC * a);
      g.beginPath();
      g.arc(p.x, p.y, r, 0, 7);
      g.stroke();
      g.globalAlpha = a * 0.18;
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, r * 0.62, 0, 7);
      g.fill();
      g.restore();
      continue;
    }
    if (p.k === 2) {
      // 土埃：ふくらむ丸
      g.globalAlpha = a * 0.62;
      g.fillStyle = p.c;
      g.beginPath();
      g.ellipse(p.x, p.y, p.r, p.r * 0.56, 0, 0, 7);
      g.fill();
      continue;
    }
    g.globalAlpha = a;
    if (p.k === 1) {
      // 火花：飛んだ向きに伸びる線
      g.strokeStyle = p.c;
      g.lineWidth = Math.max(1, 1.5 * SC);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      g.stroke();
      continue;
    }
    g.fillStyle = p.c;
    g.fillRect(p.x, p.y, 2.4 * SC, 2.4 * SC);
  }
  g.globalAlpha = 1;
  // 手前の草木。兵の足元を隠すことで三層目の奥行きになる
  if (G.bgFade < 1 && fgCache[G.bgPrev]) drawFg(g, G.bgPrev, t, 1);
  drawFg(g, G.era, t, G.bgFade < 1 ? G.bgFade : undefined);
  g.restore();

  // 時代の主の体力バー
  const LD = lordAlive();
  if (LD && G.lordIn <= 0.15) {
    // 登場演出の間は帯を出さない（文字と重なるため）
    const bw2 = Math.min(W * 0.52, 300),
      x0 = (W - bw2) / 2,
      y0 = GY * 0.44;
    g.fillStyle = "rgba(10,13,18,.72)";
    g.fillRect(x0 - 3, y0 - 3, bw2 + 6, 13);
    g.fillStyle = "rgba(60,22,18,.9)";
    g.fillRect(x0, y0, bw2, 7);
    g.fillStyle = "#D8523A";
    g.fillRect(x0, y0, bw2 * Math.max(0, LD.hp / LD.maxHp), 7);
    g.font = '700 12px "Shippori Mincho B1","Hiragino Mincho ProN",serif';
    g.textAlign = "center";
    g.fillStyle = "rgba(0,0,0,.6)";
    g.fillText(G.lordName || "時代の主", W / 2 + 1, y0 - 6 + 1);
    g.fillStyle = "#F2C9B4";
    g.fillText(G.lordName || "時代の主", W / 2, y0 - 6);
    g.textAlign = "left";
  }
  // 登場の見せ場
  if (G.lordIn > 0) {
    const k = G.lordIn / 1.6;
    g.fillStyle = "rgba(6,8,12," + k * 0.62 + ")";
    g.fillRect(0, 0, W, H);
    const sz = Math.min(W * 0.14, 44) * (1 + (1 - k) * 0.12);
    g.font = "800 " + sz + 'px "Shippori Mincho B1","Hiragino Mincho ProN",serif';
    g.textAlign = "center";
    g.globalAlpha = Math.min(1, k * 1.5);
    g.fillStyle = "rgba(0,0,0,.75)";
    g.fillText(G.lordName || "", W / 2 + 2, GY * 0.52 + 2);
    g.fillStyle = "#F0C165";
    g.fillText(G.lordName || "", W / 2, GY * 0.52);
    g.globalAlpha = 1;
    g.textAlign = "left";
    g.strokeStyle = "rgba(240,193,101," + k * 0.8 + ")";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(W * 0.5 - sz * 2.2, GY * 0.52 + sz * 0.42);
    g.lineTo(W * 0.5 + sz * 2.2, GY * 0.52 + sz * 0.42);
    g.stroke();
  }

  if (G.evolving) {
    g.fillStyle = "rgba(240,193,101,.10)";
    g.fillRect(0, 0, W, H);
    const r = 1 - G.evoT / G.lock;
    g.strokeStyle = "rgba(245,214,140,.85)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(sx(BAL.laneL + 8), GY - 30 * SC, (20 + r * 70) * SC, 0, 7);
    g.stroke();
  }
  if (G.evoFlash > 0) {
    g.fillStyle = "rgba(255,255,255," + G.evoFlash * 0.55 + ")";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,241,205," + G.evoFlash + ")";
    g.lineWidth = 5 * SC;
    g.beginPath();
    g.arc(sx(BAL.laneL + 40), GY - 40 * SC, (1 - G.evoFlash) * W * 0.9, 0, 7);
    g.stroke();
  }
}
