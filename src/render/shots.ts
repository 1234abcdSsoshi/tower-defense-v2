import { rgba } from "@/render/color";
import { projectileSprite } from "@/render/effectSprites";
import { DET } from "@/render/quality";
import { GY, SC, sx } from "@/render/viewport";
import { G } from "@/sim/state";

/* ---------- 飛び道具 ---------- */

/**
 * 弾のまわりの淡い光。色ごとに一度だけ焼いて使い回す。
 *
 * 以前は ctx.shadowBlur で出していたが、これは弾 1 発ごとに
 * ぼかしを掛け直す。しかも主キャンバスの上では下地を読みながら
 * 広い範囲を処理するため、終盤の弾幕で描画が崩壊していた
 * （実測：70 発で 1 フレーム 736ms。外すと 26ms）。
 *
 * 光の形は弾ごとに変わらないので、焼いて重ねれば同じ絵になる。
 */
const glowCache = new Map<string, HTMLCanvasElement>();
const GLOW_R = 32;

function glowFor(col: string): HTMLCanvasElement | null {
  const hit = glowCache.get(col);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = GLOW_R * 2;
  const c2 = cv.getContext("2d");
  if (!c2) return null;
  const gr = c2.createRadialGradient(GLOW_R, GLOW_R, 0, GLOW_R, GLOW_R, GLOW_R);
  gr.addColorStop(0, rgba(col, 0.85));
  gr.addColorStop(0.4, rgba(col, 0.3));
  gr.addColorStop(1, rgba(col, 0));
  c2.fillStyle = gr;
  c2.fillRect(0, 0, GLOW_R * 2, GLOW_R * 2);
  glowCache.set(col, cv);
  return cv;
}
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
    if (s.kind === "bullet" || s.kind === "bolt" || s.kind === "orb" || s.kind === "fireball") {
      c.globalCompositeOperation = "lighter";
      // 重い端末では光を省く。弾そのものは変わらず見える
      if (DET) {
        const halo = glowFor(s.col);
        if (halo) {
          const r = (s.kind === "orb" ? 22 : 14) * S;
          c.drawImage(halo, -r, -r, r * 2, r * 2);
        }
      }
    }
    const sprite = projectileSprite(s.kind);
    if (sprite) {
      const baseSize =
        s.kind === "fireball"
          ? 34
          : s.kind === "venom"
            ? 30
            : s.kind === "orb"
              ? 19
              : s.kind === "bolt"
                ? 31
                : s.kind === "bullet"
                  ? 29
                  : s.kind === "arrow"
                    ? 30
                    : 25;
      const pulse = s.kind === "orb" ? 0.9 + 0.1 * Math.sin(t * 11 + s.x0) : 1;
      const size = baseSize * S * pulse;
      c.drawImage(sprite, -size / 2, -size / 2, size, size);
      c.restore();
      continue;
    }
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
      // 砲弾・爆弾は短い熱尾を加え、弾速と重量を両立させる。
      c.globalAlpha = 0.34;
      c.fillStyle = "#FFB45E";
      c.beginPath();
      c.moveTo(-3 * S, -2.2 * S);
      c.lineTo(-13 * S, 0);
      c.lineTo(-3 * S, 2.2 * S);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
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
