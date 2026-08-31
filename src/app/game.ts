/* =====================================================================
   一戦の開始と、画面寸法が変わったときの作り直し。
   「対局を始める」入口はここ一箇所に絞ってある。
   ===================================================================== */
import { resetAcc } from "@/app/loop";
import { AU } from "@/audio/index";
import { SPD_OPTS } from "@/core/constants";
import { ERAS, MASTER_STAGES } from "@/data/master";
import { clearSceneryCache } from "@/render/caches";
import { resize } from "@/render/viewport";
import { newGame } from "@/sim/game";
import { G, setG } from "@/sim/state";
import { refreshCards } from "@/ui/cards";
import { CFG } from "@/ui/config";
import { $, toast } from "@/ui/dom";
import { updateHud } from "@/ui/hud";
import { applySpeed } from "@/ui/input";
import { setPaused, setSpeedIdx } from "@/ui/state";

/** 画面寸法が変わった。焼いてある背景・前景とカードの実寸は作り直す */
export function onResize(): void {
  resize();
  if (G) {
    clearSceneryCache();
    refreshCards(true);
  }
}

let rt: ReturnType<typeof setTimeout> = null;

/** 起動時に一度だけ呼ぶ。リサイズは連打されるので束ねる */
export function initResizeHandlers(): void {
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(onResize, 80);
  });
}

/** ステージを指定して一戦を始める */
export function start(stageIdx?: number): void {
  setG(newGame((Date.now() ^ 0x9e3779b9) >>> 0, stageIdx || 0));
  setPaused(false);
  resetAcc();
  setSpeedIdx(Math.max(0, (SPD_OPTS as readonly number[]).indexOf(CFG.spd)));
  applySpeed();
  $("pauseBtn").textContent = "II";
  $("pauseBtn").classList.remove("on");
  clearSceneryCache();
  refreshCards(true);
  updateHud();
  G.running = true;
  if (AU.ready) {
    AU.resume();
    AU.startBgm(0);
  }
  toast(((MASTER_STAGES[G.stage] || ({} as never)).name || "") + "　" + ERAS[0].n, "#FFF3D0");
}
