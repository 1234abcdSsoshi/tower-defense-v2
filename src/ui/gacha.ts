import { AU } from "@/audio/index";
import { LIN, META } from "@/data/master";
import { SAVE, saveNow } from "@/save/save";
import { $ } from "@/ui/dom";
import { refreshHome } from "@/ui/home";
import { LIN_GROUPS, groupedLineages } from "@/ui/groups";
import { showSheet } from "@/ui/sheets";

/** その系譜がどの陣営か。引いた結果に添える */
function sideOf(L: (typeof LIN)[number]): string {
  return LIN_GROUPS.find((g) => g.has(L))?.name || "";
}

/* ---------- 召集（ガチャ） ---------- */
export function showGacha(): void {
  showSheet("gachaSheet");
  $("gOneC").textContent = String(META.gacha.one);
  $("gTenC").textContent = String(META.gacha.ten);
  $("gachaOut").innerHTML = '<span class="note">勾玉 ' + SAVE.mag + " 所持</span>";
  renderLeft();
}

/* 陣営ごとに、あと何体残っているか。
   27 系譜になったので「何が出うるのか」が見えないと、引く判断ができない */
function renderLeft(): void {
  const box = $("gachaLeft");
  if (!box) return;
  box.innerHTML = "";
  for (const { group, idx } of groupedLineages()) {
    const left = idx.filter((i) => !SAVE.lin[LIN[i].id].owned).length;
    const el = document.createElement("span");
    el.className = "gl" + (left ? "" : " done");
    el.style.color = group.col;
    el.textContent = group.name + " " + (left ? "残り " + left : "全部そろった");
    box.appendChild(el);
  }
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
      out.push({ name: L.name, neu: true, side: sideOf(L) });
    } else {
      sv.dup++;
      const m = META.gacha.dupMat || 8;
      SAVE.mats[Math.floor(Math.random() * 4)] += m;
      out.push({ name: L.name, neu: false, m, side: sideOf(L) });
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
          (o.side ? "［" + o.side + "］" : "") +
          o.name +
          (o.neu ? " 解放" : "　素材+" + o.m) +
          "</span>",
      )
      .join("") +
    '<span class="note" style="width:100%">残り勾玉 ' +
    SAVE.mag +
    "</span>";
  renderLeft();
  refreshHome();
}
