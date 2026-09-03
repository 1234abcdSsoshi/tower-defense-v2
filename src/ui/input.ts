/* =====================================================================
   戦闘中の入力と、システムボタンの結線。
   すべて initInput() の中に閉じてあり、起動シーケンス（main.ts）から
   一度だけ呼ぶ。モジュールを読んだだけでは何も起きない。
   ===================================================================== */
import { start } from "@/app/game";
import { AU } from "@/audio/index";
import { SPD_BASE, SPD_OPTS } from "@/core/constants";
import { tryLock } from "@/platform/orientation";
import { startEvolve } from "@/sim/evolution";
import { produce } from "@/sim/production";
import { useSkill } from "@/sim/skills";
import { G } from "@/sim/state";
import { cards } from "@/ui/cards";
import { CFG, saveCfg } from "@/ui/config";
import { syncCfgUI } from "@/ui/configPanel";
import { $, toast } from "@/ui/dom";
import { showHome } from "@/ui/home";
import { nextStage } from "@/ui/result";
import { paused, setPaused, setSpeedIdx, setSpeedMul, speedIdx } from "@/ui/state";

/** 選択中の速度をシムとボタン表示へ反映する */
export function applySpeed(): void {
  const v = SPD_OPTS[speedIdx];
  setSpeedMul(v * SPD_BASE);
  CFG.spd = v;
  saveCfg();
  $("spdBtn").textContent = "x" + v;
  $("spdBtn").classList.toggle("on", v > 1);
}

function setPauseUI(next: boolean): void {
  setPaused(next);
  $("pauseBtn").textContent = next ? "▶" : "II";
  $("pauseBtn").classList.toggle("on", next);
}

/**
 * 設定を開く。
 * 「拠点へ戻る」は戦の最中にだけ出す ── 拠点に居るときに出しても
 * 行き先が同じで意味がなく、押せる物が増えるだけ紛らわしい。
 */
function openCfg(): void {
  $("quitBtn").hidden = !(G && G.running);
  $("cfgSheet").classList.add("show");
}

export function initInput(): void {
  $("evoBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startEvolve();
  });
  $("pauseBtn").addEventListener("click", () => setPauseUI(!paused));

  $("spdBtn").addEventListener("click", () => {
    setSpeedIdx((speedIdx + 1) % SPD_OPTS.length);
    AU.fx("ui");
    applySpeed();
  });

  $("muteBtn").addEventListener("click", () => {
    AU.init();
    AU.resume();
    CFG.mute = !CFG.mute;
    saveCfg();
    AU.setVol();
    syncCfgUI();
    if (!CFG.mute) AU.fx("ui");
  });

  $("cfgBtn").addEventListener("click", () => {
    AU.fx("ui");
    openCfg();
    setPaused(true);
    $("pauseBtn").textContent = "▶";
  });

  $("cfgClose").addEventListener("click", () => {
    $("cfgSheet").classList.remove("show");
    if (G && G.running) setPauseUI(false);
    else showHome();
  });

  $("quitBtn").addEventListener("click", () => {
    AU.fx("ui");
    // 戦を切り上げて拠点へ。褒賞も記録も無い ── 決着していないので、
    // 勝ちにも負けにもしない。
    $("cfgSheet").classList.remove("show");
    if (G) G.running = false;
    setPaused(false);
    $("pauseBtn").textContent = "II";
    $("pauseBtn").classList.remove("on");
    showHome();
    toast("戦を切り上げました");
  });

  $("restartBtn").addEventListener("click", () => {
    $("cfgSheet").classList.remove("show");
    setPaused(false);
    start(G ? G.stage : 0);
  });

  $("startBtn").addEventListener("click", () => {
    AU.init();
    AU.resume();
    syncCfgUI();
    tryLock();
    showHome();
  });

  $("nextBtn").addEventListener("click", () => {
    AU.fx("ui");
    $("resSheet").classList.remove("show");
    setPaused(false);
    // 突破した戦の次へそのまま進む。拠点まで戻らせない
    start(nextStage);
  });

  $("againBtn").addEventListener("click", () => {
    AU.fx("ui");
    $("resSheet").classList.remove("show");
    setPaused(false);
    start(G ? G.stage : 0);
  });

  $("resCfg").addEventListener("click", () => {
    $("resSheet").classList.remove("show");
    openCfg();
  });

  $("markOpt").addEventListener("click", () => {
    AU.fx("ui");
    CFG.mark = !CFG.mark;
    saveCfg();
    syncCfgUI();
  });
  $("fpsOpt").addEventListener("click", () => {
    AU.fx("ui");
    CFG.fps = !CFG.fps;
    saveCfg();
    syncCfgUI();
  });
  $("bgmOpt").addEventListener("click", () => {
    AU.init();
    AU.resume();
    CFG.bgm = !CFG.bgm;
    saveCfg();
    AU.setBgm();
    syncCfgUI();
  });
  $("sfxOpt").addEventListener("click", () => {
    AU.init();
    AU.resume();
    CFG.sfx = !CFG.sfx;
    saveCfg();
    AU.setSfx();
    AU.fx("ui");
    syncCfgUI();
  });

  // どの操作からでも音声を起こせるようにする保険（ブラウザの自動再生制限対策）。
  // キーボードだけで登録・開始する人もいるため、pointer と key の両方を入口にする。
  const wakeAudio = () => {
    AU.init();
    AU.resume();
  };
  addEventListener("pointerdown", wakeAudio, { capture: true });
  addEventListener("keydown", wakeAudio, { capture: true });
  addEventListener("click", wakeAudio, { capture: true });

  initKeyboard();
}

/**
 * キーボード操作。PC が主戦場なので、ここが一番よく使われる入力になる。
 *   1..9 … 生産カード   Space … 進化   Q / W … 技
 */
function initKeyboard(): void {
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = e.key;
    // 枠数は編成（META.teamSize）で変わる。5固定にすると最後の枠がキーから出せなくなる
    if (k >= "1" && k <= "9") {
      const i = +k - 1;
      if (i < cards.length) {
        produce(i);
        e.preventDefault();
      }
    } else if (k === " ") {
      startEvolve();
      e.preventDefault();
    } else if (k === "q" || k === "Q") {
      useSkill(0);
    } else if (k === "w" || k === "W") {
      useSkill(1);
    }
  });
}
