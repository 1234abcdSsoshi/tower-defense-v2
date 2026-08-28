/* =====================================================================
   時代戦線 序戦
   Canvas2D / 決定論固定タイムステップ / 画像アセット0枚（全て手続き描画）

   このファイルは「起動の順番」だけを持つ。ロジックは一切書かないこと。
   順番には意味がある：
     1. 設定    … マスタ既定値＋保存値。以降の画面構築が CFG を読む
     2. 進行    … SAVE。編成が決まらないと盤面が作れない
     3. 描画準備 … パレット→画面寸法。この順でないと焼き直しが二度走る
     4. 画面    … 設定・遊びかた・カード
     5. 結線    … ここまでで DOM が揃ってから listener を張る
     6. 盤面    … タイトルの裏で動く見せ盤面
     7. ループ
   ===================================================================== */
import "@/styles/index.css";

import { initResizeHandlers, onResize } from "@/app/game";
import { frame, setLast } from "@/app/loop";
import { tryExternalMaster } from "@/app/externalMaster";
import { SPD_OPTS } from "@/core/constants";
import { IS_WEB } from "@/platform/env";
import { gate, initOrientation } from "@/platform/orientation";
import { preparePalettes } from "@/render/palette";
import { initCanvas, resize } from "@/render/viewport";
import { loadSave } from "@/save/save";
import { newGame } from "@/sim/game";
import { setG } from "@/sim/state";
import { initHomeBindings } from "@/ui/bindings";
import { buildCards } from "@/ui/cards";
import { CFG, initConfig } from "@/ui/config";
import { syncCfgUI } from "@/ui/configPanel";
import { $ } from "@/ui/dom";
import { renderHelp } from "@/ui/help";
import { initResultScreen } from "@/ui/result";
import { updateHud } from "@/ui/hud";
import { applySpeed, initInput } from "@/ui/input";
import { setSpeedIdx } from "@/ui/state";

/* 1. 設定と進行データ */
initConfig();
loadSave();

/* 2. 描画の下ごしらえ */
preparePalettes();
initCanvas();
gate();
resize();

/* 3. 画面の中身 */
syncCfgUI();
renderHelp();
buildCards();
setSpeedIdx(Math.max(0, (SPD_OPTS as readonly number[]).indexOf(CFG.spd)));
applySpeed();

/* 4. 結線。DOM が揃ってから張る */
initInput();
initHomeBindings();
initResultScreen();
initResizeHandlers();
initOrientation(onResize);

/* 5. タイトルの裏で動く見せ盤面 */
setG(newGame(1));
updateHud();
$("titleSheet").classList.add("show");

/* 6. 外部マスタがあれば差し替える（Web 配布のみ。無くても内蔵データで完全に動く） */
void tryExternalMaster();

/* 7. Service Worker。オフラインで遊べるようにする（itch.io 版のみ） */
if (IS_WEB && "serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* 登録できなくてもオンラインなら遊べる */
    });
  });
}

/* 8. ループ開始 */
requestAnimationFrame((t) => {
  setLast(t / 1000);
  requestAnimationFrame(frame);
});
