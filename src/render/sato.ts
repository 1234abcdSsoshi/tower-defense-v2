/* =====================================================================
   里の絵。設計どおり、数を出さずに盤面だけで読ませる。

   煙が上がっていれば生きている、黒く傾いていれば喰われた。
   保有者は色で示す（自軍＝青、敵＝赤、無主＝土）── 兵科が形、属性が色、
   という決まりを里にも通す。
   ===================================================================== */
import { GY, SC, sx } from "@/render/viewport";
import { G } from "@/sim/state";

const MINE = "#5f8fbf";
const FOE = "#c2604e";
const FREE = "#9d8b6a";
const RUIN = "#3a3128";

export function drawSato(g: CanvasRenderingContext2D, t: number): void {
  if (!G || !G.sato || !G.sato.length) return;

  for (const s of G.sato) {
    const x = sx(s.x);
    const y = GY;
    const w = 17 * SC;
    const h = 21 * SC;
    const col = s.ruin ? RUIN : s.side === 0 ? MINE : s.side === 1 ? FOE : FREE;

    g.save();
    g.translate(x, y);
    // 喰われた瞬間は身震いさせる
    if (s.fx > 0) g.translate((Math.sin(t * 60) * s.fx * 3) * SC, 0);
    // 廃村は傾いで焼け落ちる
    if (s.ruin) g.rotate(0.16);

    // 壁。屋根だけだと三角形の記号に見えて、触れるものに見えない
    const wallH = h * 0.46;
    g.globalAlpha = s.ruin ? 0.5 : 0.95;
    g.fillStyle = s.ruin ? "#241e18" : "#2b241a";
    g.fillRect(-w * 0.52, -wallH, w * 1.04, wallH);

    // 屋根。切妻。保有者の色はここに出す
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w * 0.78, -wallH);
    g.lineTo(-w * 0.78, -wallH);
    g.closePath();
    g.fillStyle = col;
    g.fill();

    // 入口。生きている里だけ、灯りが漏れる
    if (!s.ruin) {
      g.globalAlpha = 0.85;
      g.fillStyle = "#f0c165";
      g.fillRect(-w * 0.12, -wallH * 0.72, w * 0.24, wallH * 0.72);
    }

    // 棟木
    g.globalAlpha = 1;
    g.strokeStyle = col;
    g.lineWidth = 1.5 * SC;
    g.beginPath();
    g.moveTo(-w * 0.86, -wallH);
    g.lineTo(w * 0.86, -wallH);
    g.stroke();

    // 生きている里は煙を上げる。遠くからでも生死が分かる
    if (!s.ruin) {
      g.globalAlpha = 0.3;
      g.strokeStyle = "#e8e0cf";
      g.lineWidth = 1.1 * SC;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const p = t * 0.6 + i * 0.4;
        g.moveTo(Math.sin(p) * 2 * SC, -h - i * 5 * SC);
        g.lineTo(Math.sin(p + 0.6) * 3 * SC, -h - (i + 1) * 5 * SC);
      }
      g.stroke();
    }
    g.restore();
  }
}
