import { AU } from "@/audio/index";
import { LIN, META } from "@/data/master";
import { SAVE, saveNow } from "@/save/save";
import { $ } from "@/ui/dom";
import { refreshHome } from "@/ui/home";
import { showSheet } from "@/ui/sheets";

/* ---------- 召集（ガチャ） ---------- */
export function showGacha(): void {
  showSheet("gachaSheet");
  $("gOneC").textContent = String(META.gacha.one);
  $("gTenC").textContent = String(META.gacha.ten);
  $("gachaOut").innerHTML = '<span class="note">勾玉 ' + SAVE.mag + " 所持</span>";
}
export function pull(n: number): void {
  const cost = n === 1 ? META.gacha.one : META.gacha.ten;
  if (SAVE.mag < cost) {
    AU.fx("deny");
    $("gachaOut").innerHTML = '<span class="note">勾玉が足りません（' + SAVE.mag + " / " + cost + "）</span>";
    return;
  }
  SAVE.mag -= cost;
  const out = [];
  for (let k = 0; k < n; k++) {
    const i = Math.floor(Math.random() * LIN.length),
      L = LIN[i],
      sv = SAVE.lin[L.id];
    if (!sv.owned) {
      sv.owned = true;
      out.push({ name: L.name, neu: true });
    } else {
      sv.dup++;
      const m = META.gacha.dupMat || 8;
      SAVE.mats[Math.floor(Math.random() * 4)] += m;
      out.push({ name: L.name, neu: false, m });
    }
  }
  saveNow();
  AU.fx(out.some((o) => o.neu) ? "evoDone" : "produce", 0, 4);
  $("gachaOut").innerHTML =
    out
      .map(
        (o) =>
          '<span class="gitem' +
          (o.neu ? " new" : "") +
          '">' +
          o.name +
          (o.neu ? " 解放" : "　素材+" + o.m) +
          "</span>",
      )
      .join("") +
    '<span class="note" style="width:100%">残り勾玉 ' +
    SAVE.mag +
    "</span>";
  refreshHome();
}
