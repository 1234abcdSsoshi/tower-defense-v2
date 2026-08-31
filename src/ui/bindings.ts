/* =====================================================================
   拠点まわり（出陣・編成・強化・召集・技）のボタン結線。
   画面の中身を作るのは各 ui/*.ts で、ここは「どのボタンが何を呼ぶか」だけ。
   ===================================================================== */
import { AU } from "@/audio/index";
import { META, debutOf, linIndex } from "@/data/master";
import { defaultPick } from "@/data/skills";
import { SAVE, saveNow, setUseKoyomi, useKoyomi } from "@/save/save";
import { newGame } from "@/sim/game";
import { G, setG } from "@/sim/state";
import { refreshCards } from "@/ui/cards";
import { CFG } from "@/ui/config";
import { $ } from "@/ui/dom";
import { pull, showGacha } from "@/ui/gacha";
import { showHome } from "@/ui/home";
import { showSheet } from "@/ui/sheets";
import { renderSkill, setSkDraft, showSkill, skDraft, skFrom } from "@/ui/skillSelect";
import { showStage } from "@/ui/stage";
import { renderTeam, showTeam } from "@/ui/team";
import { showUp } from "@/ui/upgrade";

export function initHomeBindings(): void {
  $("mGo").addEventListener("click", () => {
    AU.fx("ui");
    showStage();
  });
  $("mTeam").addEventListener("click", () => {
    AU.fx("ui");
    showTeam();
  });
  $("mUp").addEventListener("click", () => {
    AU.fx("ui");
    showUp();
  });
  $("mGacha").addEventListener("click", () => {
    AU.fx("ui");
    showGacha();
  });
  $("mHelp").addEventListener("click", () => {
    AU.fx("ui");
    showSheet("titleSheet");
  });
  $("mCfg").addEventListener("click", () => {
    AU.fx("ui");
    showSheet("cfgSheet");
  });

  $("skEdit").addEventListener("click", () => {
    AU.fx("ui");
    showSkill("teamSheet");
  });
  $("skOk").addEventListener("click", () => {
    AU.fx("evoDone");
    SAVE.pick = skDraft.map((a) => a.slice());
    saveNow();
    // 開いた画面へ戻す。拠点から開いたなら拠点、編成から開いたなら編成
    if (skFrom === "homeSheet") {
      showHome();
      return;
    }
    showSheet("teamSheet");
    renderTeam();
  });
  $("skAuto").addEventListener("click", () => {
    AU.fx("ui");
    setSkDraft(defaultPick());
    renderSkill();
  });

  $("stgBack").addEventListener("click", () => {
    AU.fx("ui");
    showHome();
  });
  $("koyTog").addEventListener("click", () => {
    AU.fx("ui");
    setUseKoyomi(SAVE.koyomi <= 0 ? false : !useKoyomi);
    $("koyTog").classList.toggle("on", useKoyomi);
  });

  $("teamOk").addEventListener("click", () => {
    const mp = META.minPrimal || 0;
    const prim = SAVE.team.filter((id) => debutOf(linIndex(id)) === 0).length;
    if (!(SAVE.team.length >= 1 && SAVE.team.length <= META.teamSize && prim >= mp)) return;
    AU.fx("ui");
    saveNow();
    // 拠点で編成を変えたら、タイトルの見せ盤面も新しい編成で作り直す
    if (G && !G.running) setG(newGame(1));
    refreshCards(true);
    showHome();
  });

  $("upBack").addEventListener("click", () => {
    AU.fx("ui");
    showHome();
  });
  $("gOne").addEventListener("click", () => pull(1));
  $("gTen").addEventListener("click", () => pull(10));
  $("gBack").addEventListener("click", () => {
    AU.fx("ui");
    showHome();
  });
  $("resHome").addEventListener("click", () => {
    AU.fx("ui");
    showHome();
  });

  // タブが隠れたら止め、戻ったら再開する
  addEventListener("visibilitychange", () => {
    if (!AU.ctx) return;
    if (document.hidden) AU.ctx.suspend().catch(() => {});
    else if (!CFG.mute) AU.ctx.resume().catch(() => {});
  });
}
