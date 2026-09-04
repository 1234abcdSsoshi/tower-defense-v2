import { AU } from "@/audio/index";
import { LIN, MASTER_STAGES, MASTER_VER, META, linIndex } from "@/data/master";
import { SAVE, koyomiLeft, koyomiTick, matTotal } from "@/save/save";
import { $ } from "@/ui/dom";
import { showSheet } from "@/ui/sheets";
import { setPaused } from "@/ui/state";

export function showHome(): void {
  koyomiTick();
  setPaused(true);
  AU.startMenuBgm();
  showSheet("homeSheet");
  refreshHome();
}
export function refreshHome(): void {
  koyomiTick();
  $("magN").textContent = String(SAVE.mag);
  $("koyN").textContent = String(SAVE.koyomi);
  $("koyMax").textContent = String(META.koyomiMax);
  $("koyT").textContent = koyomiLeft() ? "＋" + koyomiLeft() : "";
  $("matN").textContent = String(matTotal());
  const owned = LIN.filter((L) => SAVE.lin[L.id].owned).length;
  /* 編成の副題。陣営の内訳を出す ── 三すくみを組むゲームなので、
     名前を並べるより「妖2 人3」のほうが手が読める */
  const n: Record<string, number> = { tami: 0, hito: 0, yo: 0, tai: 0 };
  for (const id of SAVE.team) {
    const L = LIN[linIndex(id)];
    n[L.civil ? "tami" : L.attr]++;
  }
  const label = [
    n.tami ? "民" + n.tami : "",
    n.hito ? "人" + n.hito : "",
    n.yo ? "妖" + n.yo : "",
    n.tai ? "退" + n.tai : "",
  ]
    .filter(Boolean)
    .join("　");
  $("mTeamSub").textContent = (label ? label + "　／　" : "") + SAVE.team.map((id) => LIN[linIndex(id)].name).join("・");
  $("mUpSub").textContent = "所持 " + owned + "系譜／素材 " + matTotal();
  $("mGachaSub").textContent =
    owned >= LIN.length ? "全系譜を所持済み" : "未所持 " + (LIN.length - owned) + "系譜";
  const cl = Object.keys(SAVE.cleared).length;
  $("homeNote").textContent = "踏破 " + cl + "／" + MASTER_STAGES.length + "　データ v" + MASTER_VER;
}
