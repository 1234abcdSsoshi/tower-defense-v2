import { BAL } from "@/data/master";
import { DET } from "@/render/quality";
import { GY, SC, sx } from "@/render/viewport";
import { G } from "@/sim/state";

/* ---------- 天災の絵。判定はシム側で済んでいて、ここは見た目だけ ---------- */
export function drawDis(g: CanvasRenderingContext2D, t: number): void {
  const L = sx(BAL.laneL),
    R = sx(BAL.laneR),
    W2 = R - L,
    top = GY - 108 * SC;
  const HD = DET ? 1 : 0; // 余裕があるときだけ描き込む
  // 地震：地面沿いに土煙が走り、画面が細かく揺れる
  if (G.bQuake > 0) {
    const k = Math.min(1, G.bQuake / 1.2);
    g.save();
    // 地面に走る割れ目
    g.globalAlpha = 0.82 * k;
    g.strokeStyle = "#1A120C";
    g.lineWidth = Math.max(1.6, 3.2 * SC);
    g.lineJoin = "round";
    const NC = HD ? 6 : 4;
    for (let i = 0; i < NC; i++) {
      const px = L + W2 * ((i + 0.5) / NC) + Math.sin(t * 2 + i) * 3 * SC;
      g.beginPath();
      g.moveTo(px - 26 * SC, GY + 2 * SC);
      g.lineTo(px - 8 * SC, GY - 6 * SC);
      g.lineTo(px + 8 * SC, GY + 1 * SC);
      g.lineTo(px + 28 * SC, GY - 5 * SC);
      g.stroke();
    }
    if (HD) {
      g.globalAlpha = 0.55 * k;
      g.strokeStyle = "#C8622E";
      g.lineWidth = Math.max(0.8, 1.3 * SC);
      for (let i = 0; i < NC; i++) {
        const px = L + W2 * ((i + 0.5) / NC) + Math.sin(t * 2 + i) * 3 * SC;
        g.beginPath();
        g.moveTo(px - 26 * SC, GY + 2 * SC);
        g.lineTo(px - 8 * SC, GY - 6 * SC);
        g.lineTo(px + 8 * SC, GY + 1 * SC);
        g.lineTo(px + 28 * SC, GY - 5 * SC);
        g.stroke();
      }
    }
    // 舞い上がる土
    g.globalAlpha = 0.44 * k;
    g.fillStyle = "#9C8A6E";
    const ND = HD ? 11 : 6;
    for (let i = 0; i < ND; i++) {
      const px = L + W2 * ((i + 0.5) / ND) + Math.sin(t * 7 + i) * 6 * SC;
      const hh2 = (9 + Math.sin(t * 4.2 + i * 1.7) * 6) * SC;
      g.beginPath();
      g.ellipse(px, GY - hh2 * 0.5, (15 + Math.sin(t * 3 + i) * 6) * SC, hh2, 0, 0, 7);
      g.fill();
    }
    g.restore();
    // 揺れを絶やさない
    if (G.shake < 3) G.shake = 3;
  }
  // 台風：斜めの雨脚と渦
  if (G.bWind > 0) {
    const k = Math.min(1, G.bWind / 1.4);
    g.save();
    g.globalAlpha = 0.34 * k;
    g.strokeStyle = "#B8CBD8";
    g.lineWidth = Math.max(1, 1.5 * SC);
    g.lineCap = "round";
    const NW = HD ? 26 : 12;
    for (let i = 0; i < NW; i++) {
      const ph = (t * 1.9 + i * 0.37) % 1,
        px = L + W2 * ((i * 0.137 + ph) % 1),
        py = top + (GY - top) * ((i * 0.29 + ph * 1.4) % 1);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + 13 * SC, py + 7 * SC);
      g.stroke();
    }
    g.globalAlpha = 0.16 * k;
    g.fillStyle = "#26333F";
    g.fillRect(L, top, W2, GY - top);
    g.restore();
  }
  // 津波：左から右へ波が抜ける
  if (G.wave > 0) {
    const p = 1 - G.wave,
      px = L + W2 * (p * 1.3 - 0.18);
    const A = Math.min(1, G.wave * 1.6);
    g.save();
    // 後ろに引く水
    g.globalAlpha = A * 0.46;
    g.fillStyle = "#5E93A6";
    g.fillRect(
      Math.max(L - 40 * SC, px - 260 * SC),
      GY - 14 * SC,
      Math.min(260 * SC, px - (L - 40 * SC)),
      18 * SC,
    );
    // 波頭
    g.globalAlpha = A * 0.92;
    const wg = g.createLinearGradient(px - 150 * SC, 0, px + 50 * SC, 0);
    wg.addColorStop(0, "rgba(74,132,152,.10)");
    wg.addColorStop(0.55, "rgba(110,176,196,.80)");
    wg.addColorStop(1, "rgba(232,244,248,.96)");
    g.fillStyle = wg;
    g.beginPath();
    g.moveTo(px - 170 * SC, GY + 4 * SC);
    g.lineTo(px - 150 * SC, GY - 22 * SC);
    g.quadraticCurveTo(px - 58 * SC, GY - 92 * SC, px + 14 * SC, GY - 58 * SC);
    g.quadraticCurveTo(px + 40 * SC, GY - 40 * SC, px + 30 * SC, GY - 6 * SC);
    g.lineTo(px + 26 * SC, GY + 4 * SC);
    g.closePath();
    g.fill();
    // 巻き込む縁
    g.globalAlpha = A;
    g.strokeStyle = "#F2F8FA";
    g.lineWidth = Math.max(1.6, 3.0 * SC);
    g.beginPath();
    g.moveTo(px - 150 * SC, GY - 22 * SC);
    g.quadraticCurveTo(px - 58 * SC, GY - 92 * SC, px + 14 * SC, GY - 58 * SC);
    g.stroke();
    // 飛沫
    g.fillStyle = "#F4FAFC";
    for (let i = 0; i < 16; i++) {
      const fx = px - i * 13 * SC + Math.sin(t * 9 + i) * 4 * SC,
        fy = GY - (20 + ((i * 17) % 56)) * SC;
      g.globalAlpha = A * (0.5 + (0.5 * ((i * 7) % 5)) / 5);
      g.beginPath();
      g.arc(fx, fy, (1.8 + (i % 3) * 1.2) * SC, 0, 7);
      g.fill();
    }
    g.restore();
  }
  const D = G.dis;
  if (!D) return;
  const kk = Math.min(1, D.t / 0.6);
  if (D.k === "bug") {
    // 蟲：黒い粒がうねりながら漂う
    g.save();
    g.globalAlpha = 0.72 * kk;
    g.fillStyle = "#3E3A22";
    const NB = HD ? 40 : 18;
    for (let i = 0; i < NB; i++) {
      const ph = t * 1.4 + i * 0.51;
      const px = L + W2 * ((i * 0.0257 + t * 0.06) % 1) + Math.sin(ph) * 9 * SC;
      const py = GY - (10 + ((i * 7) % 46)) * SC + Math.cos(ph * 1.3) * 7 * SC;
      g.fillRect(px, py, 1.9 * SC, 1.5 * SC);
    }
    g.restore();
  } else if (D.k === "thunder") {
    // 雷雲と落雷
    g.save();
    for (let lay = 0; lay < (HD ? 3 : 2); lay++) {
      g.globalAlpha = (0.3 + lay * 0.16) * kk;
      g.fillStyle = ["#39424F", "#2B3340", "#1E242E"][lay];
      for (let i = 0; i < 8; i++) {
        const px = L + W2 * ((i + 0.4 + lay * 0.14) / 8) + Math.sin(t * (0.4 + lay * 0.2) + i + lay) * 9 * SC;
        g.beginPath();
        g.ellipse(
          px,
          top + (10 + lay * 7) * SC,
          (30 + ((i * 7 + lay * 11) % 17)) * SC,
          (11 + lay * 3) * SC,
          0,
          0,
          7,
        );
        g.fill();
      }
    }
    if (D.flash > 0 && D.lx !== undefined) {
      const px = sx(D.lx);
      g.globalAlpha = Math.min(1, D.flash);
      g.strokeStyle = "#EAF4FF";
      g.lineWidth = Math.max(2, 4.2 * SC);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(px, top + 26 * SC);
      let yy = top + 26 * SC,
        xx = px;
      while (yy < GY - 4 * SC) {
        yy += (GY - top) * 0.19;
        xx += (((yy * 7) % 13) - 6) * 2.2 * SC;
        g.lineTo(xx, yy);
      }
      g.stroke();
      g.globalAlpha = Math.min(1, D.flash) * 0.3;
      g.lineWidth = Math.max(5, 11 * SC);
      g.stroke();
      g.globalAlpha = Math.min(1, D.flash) * 0.18;
      g.fillStyle = "#CFE6FF";
      g.fillRect(L, top, W2, GY - top);
    }
    g.restore();
  } else if (D.k === "fire") {
    // 燃え続ける地面
    const cx = sx(D.x);
    const rr = Math.abs(sx(D.x + D.r) - cx);
    g.save();
    g.globalAlpha = 0.3 * kk;
    g.fillStyle = "#5A1E10";
    g.beginPath();
    g.ellipse(cx, GY - 2 * SC, rr, 7 * SC, 0, 0, 7);
    g.fill();
    const NF = HD ? 16 : 8;
    for (let i = 0; i < NF; i++) {
      const ph = t * 3.2 + i * 0.9,
        h = (9 + ((i * 11) % 16)) * SC * (0.7 + 0.3 * Math.sin(ph));
      const px = cx + ((i / 15) * 2 - 1) * rr * 0.94 + Math.sin(ph) * 3 * SC;
      g.globalAlpha = (0.38 + 0.24 * Math.sin(ph * 1.7)) * kk;
      g.fillStyle = i % 3 ? "#E8582E" : "#F0A050";
      g.beginPath();
      g.moveTo(px - 3.4 * SC, GY);
      g.quadraticCurveTo(px, GY - h * 1.4, px + 3.4 * SC, GY);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
}
