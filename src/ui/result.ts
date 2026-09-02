import { AU } from "@/audio/index";
import { ERAS, LIN, NE } from "@/data/master";
import { drawUnitAt } from "@/render/unit";
import { DPR, popCamera, pushCamera } from "@/render/viewport";
import { maybeSaveGhost } from "@/save/ghost";
import { REPLAY } from "@/save/replay";
import { setUseKoyomi } from "@/save/save";
import { onGameOver } from "@/sim/outcome";
import { G } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import { $ } from "@/ui/dom";
import { dsec, mmss } from "@/ui/format";
import { grantReward } from "@/ui/stage";

/* =====================================================================
   決着の画面。sim/outcome.ts から通知を受けて動く。
   勝敗の判定そのものはシム側で済んでいて、ここは報酬と表示だけを持つ。
   ===================================================================== */

/** 起動時に一度だけ。決着の通知に結果画面を繋ぐ */
export function initResultScreen(): void {
  onGameOver(endGame);
}

export function endGame(win: boolean, timeout?: boolean): void {
  /* ゴーストの再生中は何もしない。
     報酬付与・自己ベスト更新・結果画面の表示を再生のたびに走らせると、
     勾玉と素材が繰り返し増え、出陣した瞬間に結果画面が開いてしまう。 */
  if (REPLAY) return;

  AU.danger = false;
  // 勝敗音の奥でも曲を絶やさず、戦闘曲から御殿の曲へ穏やかに戻す。
  AU.startMenuBgm();
  AU.fx(win ? "win" : "lose");
  const T = $("resTitle");
  T.textContent = win ? "勝　利" : timeout ? "時間切れ" : "敗　北";
  T.className = win ? "win" : "lose";
  const rw = grantReward(!!win);
  const newBest = maybeSaveGhost();
  $("resSub").textContent = win
    ? "敵城を落としました。到達したのは" +
      ERAS[G.era].n +
      "（全" +
      NE +
      "時代の" +
      (G.era + 1) +
      "つ目）。" +
      (rw
        ? "　報酬 勾玉" +
          rw.mag +
          "・素材" +
          rw.mats +
          (rw.mul > 1 ? "（暦で2倍）" : "") +
          (rw.lord ? "　時代の主を討伐" : "") +
          (rw.firstTime ? "　初回突破ボーナス込み" : "")
        : "") +
      (newBest ? "　★自己ベスト更新（次からゴーストが並走します）" : "")
    : timeout
      ? "決着がつきませんでした。もっと早く時代を進める必要があります。"
      : "自城が落ちました。敵は" + ERAS[G.foeEra].n + "まで進んでいます。";
  setUseKoyomi(false);
  const endEra = G.era;
  $("cmpEraA").textContent = ERAS[0].n;
  $("cmpEraB").textContent = ERAS[endEra].n;
  const line = G.st.line || [[0, 0]];
  // 各時代へ最初に入った時刻。時代の帯を出すのに使う
  const at: Record<number, number> = {};
  for (const [er, tt] of line) if (at[er] === undefined) at[er] = tt;
  $("resLine").innerHTML = ERAS.map((E, i) => {
    const t2 = at[i],
      reach = t2 !== undefined;
    return (
      '<div class="seg' +
      (reach ? "" : " dim") +
      (i === endEra ? " now" : "") +
      '">' +
      '<div class="e">' +
      E.n +
      '</div><div class="t">' +
      (reach ? mmss(dsec(t2)) : "—") +
      "</div></div>"
    );
  }).join("");
  const dt2 = dsec(G.t),
    m = Math.floor(dt2 / 60),
    s = Math.floor(dt2 % 60);
  $("resStats").innerHTML = [
    ["到達時代", ERAS[G.era].n],
    ["進化回数", G.st.evo + " 回"],
    ["撃破数", G.st.kills],
    ["出兵数", G.st.spawned],
    ["経過", m + ":" + String(s).padStart(2, "0")],
    ["最大同時", G.st.maxUnits + " 体"],
  ]
    .map((a) => '<div><div class="k">' + a[0] + '</div><div class="v">' + a[1] + "</div></div>")
    .join("");
  setTimeout(() => {
    $("resSheet").classList.add("show");
    requestAnimationFrame(() => {
      drawLineup($("cmpA"), 0);
      drawLineup($("cmpB"), endEra);
    });
  }, 620);
}
export function drawLineup(cn: HTMLCanvasElement, era: number): void {
  const rw = cn.offsetWidth,
    rh = cn.offsetHeight; // 疑似回転の影響を受けない実寸
  if (rw < 8 || rh < 8) return;
  cn.width = Math.max(8, Math.round(rw * DPR));
  cn.height = Math.max(8, Math.round(rh * DPR));
  const c = cn.getContext("2d");
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const E = ERAS[era];
  const gr = c.createLinearGradient(0, 0, 0, rh);
  gr.addColorStop(0, E.sky[0]);
  gr.addColorStop(1, E.sky[1]);
  c.fillStyle = gr;
  c.fillRect(0, 0, rw, rh);
  c.fillStyle = E.ground;
  c.fillRect(0, rh - 5, rw, 5);
  const sc = Math.min((rh - 6) / 52, rw / 240);
  const cam = pushCamera(rh - 4, sc, 0);
  const av = [];
  for (let i = 0; i < LIN.length; i++) if ((LIN[i].debut || 0) <= era) av.push(i);
  const pick = av.slice(0, 5),
    n2 = pick.length || 1;
  for (let k = 0; k < pick.length; k++) {
    const u = makeUnit(0, pick[k], era, 0, false);
    u.st = "idle";
    drawUnitAt(c, u, (rw * (k + 0.5)) / n2, 0, sc);
  }
  popCamera(cam);
}
