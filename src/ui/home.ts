import { AU } from "@/audio/index";
import { ERAS, LIN, MASTER_STAGES, MASTER_VER, META, linIndex } from "@/data/master";
import { defaultPick } from "@/data/skills";
import { SAVE, koyomiLeft, koyomiTick, matTotal } from "@/save/save";
import { $ } from "@/ui/dom";
import { showSheet } from "@/ui/sheets";
import { setPaused } from "@/ui/state";

export function showHome(): void {
  koyomiTick();
  setPaused(true);
  AU.stopBgm();
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
  $("mTeamSub").textContent = SAVE.team.map((id) => LIN[linIndex(id)].name).join("・");
  $("mUpSub").textContent = "所持 " + owned + "系譜／素材 " + matTotal();
  $("mGachaSub").textContent =
    owned >= LIN.length ? "全系譜を所持済み" : "未所持 " + (LIN.length - owned) + "系譜";
  const pk = SAVE.pick || defaultPick(),
    df = defaultPick();
  let skCustom = 0;
  for (let e = 0; e < ERAS.length; e++) {
    const a = (pk[e] || []).slice().sort().join(","),
      b = (df[e] || []).slice().sort().join(",");
    if (a !== b) skCustom++;
  }
  $("mSkillSub").textContent = skCustom ? skCustom + "時代で選び直し済み" : "時代ごとに二つ選ぶ";
  const cl = Object.keys(SAVE.cleared).length;
  $("homeNote").textContent = "踏破 " + cl + "／" + MASTER_STAGES.length + "　データ v" + MASTER_VER;
}
