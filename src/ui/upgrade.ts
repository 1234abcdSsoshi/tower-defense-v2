import { AU } from "@/audio/index";
import { BAL, LIN, META } from "@/data/master";
import { LINE_COL, SKLINES } from "@/data/skills";
import { SAVE, lvCostOf, matTotal, saveNow, spendMats } from "@/save/save";
import { skLv } from "@/sim/skills";
import { $ } from "@/ui/dom";
import { refreshHome } from "@/ui/home";
import { showSheet } from "@/ui/sheets";
import { lineCard } from "@/ui/team";

export function showUp(): void {
  showSheet("upSheet");
  renderUp();
}
export function renderUp(): void {
  const G2 = $("upGrid");
  G2.innerHTML = "";
  LIN.forEach((L, i) => {
    const sv = SAVE.lin[L.id],
      max = sv.lv >= (META.lvMax || 10);
    const cost = max ? 0 : lvCostOf(sv.lv);
    const can = sv.owned && !max && matTotal() >= cost;
    const el = lineCard(i, { on: can, dis: !sv.owned, cost: max ? "最大" : String(cost) });
    if (can)
      el.addEventListener("click", () => {
        spendMats(cost);
        sv.lv++;
        saveNow();
        AU.fx("evoDone");
        renderUp();
        refreshHome();
      });
    G2.appendChild(el);
  });
  const lb = $("upLines");
  lb.innerHTML = "";
  SKLINES.forEach((L) => {
    const lv = skLv(L.id),
      max = lv >= (META.skLvMax || 5);
    const cost = max ? 0 : lvCostOf(lv) * 2;
    const can = !max && matTotal() >= cost;
    const el = document.createElement("div");
    el.className = "lcell" + (can ? " on" : "");
    el.innerHTML =
      '<div class="h"><span class="dot2" style="background:' +
      (LINE_COL[L.id] || "#888") +
      '"></span>' +
      '<span class="t">' +
      L.n +
      '</span><span class="lv">Lv ' +
      lv +
      "</span></div>" +
      '<div class="s">' +
      (max ? "最大" : "素材 " + cost) +
      "</div>";
    if (can)
      el.addEventListener("click", () => {
        spendMats(cost);
        SAVE.sk[L.id] = lv + 1;
        saveNow();
        AU.fx("evoDone");
        renderUp();
        refreshHome();
      });
    lb.appendChild(el);
  });
  $("upNote").textContent =
    "素材 " +
    matTotal() +
    "　／　系譜はレベル1につき体力と攻撃が" +
    Math.round((META.lvGain || 0.09) * 100) +
    "%、技はレベル1につき効果が" +
    Math.round((BAL.skGain || 0.08) * 100) +
    "%上昇";
}
