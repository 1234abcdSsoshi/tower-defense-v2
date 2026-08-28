import { start } from "@/app/game";
import { AU } from "@/audio/index";
import { BAL, ERAS, MASTER_STAGES, META } from "@/data/master";
import { loadGhost } from "@/save/ghost";
import { SAVE, addMats, saveNow, setUseKoyomi, useKoyomi } from "@/save/save";
import { G } from "@/sim/state";
import { $ } from "@/ui/dom";
import { dsec, mmss } from "@/ui/format";
import { hideSheets, showSheet } from "@/ui/sheets";
import { setPaused } from "@/ui/state";
import type { ReplayResult } from "@/sim/types";

/* ---------- 出陣 ---------- */
export function showStage(): void {
  showSheet("stageSheet");
  $("koyTog").classList.toggle("on", useKoyomi && SAVE.koyomi > 0);
  const L = $("stageList");
  L.innerHTML = "";
  const cleared = MASTER_STAGES.filter((s) => SAVE.cleared[s.id]).length;
  const sn = $("stageNote");
  if (sn) sn.textContent = "踏破 " + cleared + " ／ " + MASTER_STAGES.length;
  let chap = "";
  // 次に挑むステージの行。描画後にここまで巻物を送る
  let firstOpen: HTMLElement = null;
  MASTER_STAGES.forEach((st, i) => {
    if (st.chapter && st.chapter !== chap) {
      chap = st.chapter;
      const done = MASTER_STAGES.filter((s) => s.chapter === chap && SAVE.cleared[s.id]).length;
      const all = MASTER_STAGES.filter((s) => s.chapter === chap).length;
      const h = document.createElement("div");
      h.className = "schap";
      h.innerHTML = "<span>" + chap + '</span><span class="cn">' + done + "／" + all + "</span>";
      L.appendChild(h);
    }
    const lock = st.needs && !SAVE.cleared[st.needs];
    const done = !!SAVE.cleared[st.id];
    const isNext = !lock && !done && !firstOpen;
    const el = document.createElement("button");
    el.className = "sitem" + (lock ? " lock" : "") + (isNext ? " now" : "");
    if (isNext) firstOpen = el;
    const best = SAVE.best[st.id];
    el.innerHTML =
      '<span class="no">' +
      (st.no || i + 1) +
      "</span>" +
      '<span class="nm">' +
      st.name +
      "</span>" +
      '<span class="sb">' +
      (lock ? "—" : st.sub) +
      (best ? "　最速 " + mmss(dsec(best.t)) + "（" + ERAS[best.era].n + "）" : "") +
      (SAVE.ghost && SAVE.ghost[st.id] ? '　<b style="color:#F2E4B8">ゴースト</b>' : "") +
      "</span>" +
      (done ? '<span class="clr">突破</span>' : "") +
      '<span class="rw">勾玉 ' +
      st.reward.mag +
      "</span>";
    if (!lock)
      el.addEventListener("click", () => {
        AU.fx("ui");
        beginStage(i);
      });
    L.appendChild(el);
  });
  // 次に挑むステージまで巻物を送る（offsetTopなら疑似回転の影響を受けない）
  if (firstOpen)
    requestAnimationFrame(() => {
      L.scrollTop = Math.max(0, firstOpen.offsetTop - L.clientHeight * 0.32);
    });
}
/** 出陣直前に走らせておいた自己ベストの推移。開戦と同時に G へ渡す */
let pendingGhost: ReplayResult = null;
export function beginStage(i: number): void {
  pendingGhost = loadGhost(i); // 自己ベストを先に走らせて推移表を作る
  if (useKoyomi && SAVE.koyomi > 0) {
    SAVE.koyomi--;
    SAVE.koyomiAt = SAVE.koyomiAt || Date.now();
    saveNow();
  } else setUseKoyomi(false);
  hideSheets();
  setPaused(false);
  start(i);
  G.ghost = pendingGhost;
  pendingGhost = null;
}
/** 一戦ぶんの報酬。結果画面の文面に出す内訳をそのまま返す */
export interface Reward {
  /** 勾玉 */
  mag: number;
  /** 素材の合計 */
  mats: number;
  /** 暦による倍率 */
  mul: number;
  /** 時代の主を討ったか */
  lord: boolean;
  /** 初回突破ボーナスが乗ったか */
  firstTime: boolean;
}

export function grantReward(win: boolean): Reward {
  if (!win) return null;
  const st = MASTER_STAGES[G.stage] || MASTER_STAGES[0];
  if (!st) return null;
  const mul = useKoyomi ? META.koyomiBonus || 2 : 1;
  let mag = Math.round(st.reward.mag * mul);
  const firstTime = !SAVE.cleared[st.id];
  if (firstTime && st.first) mag += st.first.mag;
  const lm = G.lordKill ? BAL.lordReward || 1.6 : 1;
  SAVE.mag += Math.round(mag * (G.lordKill ? 1.15 : 1));
  addMats(st.reward.mat, mul * lm);
  SAVE.cleared[st.id] = true;
  const secs = Math.round(G.t);
  if (!SAVE.best[st.id] || secs < SAVE.best[st.id].t) SAVE.best[st.id] = { t: secs, era: G.era };
  saveNow();
  return {
    mag: Math.round(mag * (G.lordKill ? 1.15 : 1)),
    mul,
    firstTime,
    lord: !!G.lordKill,
    mats: Math.round(st.reward.mat.reduce((a, b) => a + b, 0) * mul * lm),
  };
}
