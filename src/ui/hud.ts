import { AU } from "@/audio/index";
import { BAL, ERAS, NE, unlockedLin } from "@/data/master";
import { ghostAt } from "@/save/ghost";
import { canEvolve, legacySteps } from "@/sim/evolution";
import { canProduce, costOfLin, linOf } from "@/sim/production";
import { skillAt } from "@/sim/skills";
import { G } from "@/sim/state";
import { yokaiAlive } from "@/sim/summons";
import { kokuCapOf } from "@/sim/unit";
import { cards, refreshCards, skillCards } from "@/ui/cards";
import { $ } from "@/ui/dom";
import { dsec } from "@/ui/format";

export function updateHud(): void {
  if (!G) return;
  const e = G.era,
    E = ERAS[e];
  $("eraName").innerHTML = E.n + "<small>" + E.yr + (E.concept ? "　" + E.concept : "") + "</small>";
  const need = BAL.fumiNeed[e],
    fr = e >= NE - 1 ? 1 : Math.min(1, G.fumi / need);
  $("fumiFill").style.width = fr * 100 + "%";
  $("fumiTxt").textContent = e >= NE - 1 ? "最終時代" : Math.floor(G.fumi) + " / " + need;
  const tt = $("timeTxt");
  if (!isFinite(G.timeLimit)) {
    tt.textContent = "時間無制限";
    tt.className = "";
  } else {
    const left = Math.max(0, Math.ceil(dsec(G.timeLimit - G.t)));
    tt.textContent = "残り " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    tt.className = left <= 20 ? "crit" : left <= 60 ? "warn" : "";
  }
  const kmx = Math.round(kokuCapOf(e));
  const kr = G.koku / kmx;
  $("kokuFill").style.width = kr * 100 + "%";
  $("kokuTxt").textContent = Math.floor(G.koku) + " / " + kmx;
  const lg = legacySteps();
  $("legacyTxt").textContent = lg ? "遺産 +" + Math.round(lg * (BAL.legacyGain || 0.015) * 100) + "%" : "";
  $("hpMe").style.width = (Math.max(0, G.hpMe) / G.hpMeMax) * 100 + "%";
  $("hpFoe").style.width = (Math.max(0, G.hpFoe) / G.hpFoeMax) * 100 + "%";
  $("hpMeTxt").textContent = String(Math.max(0, Math.ceil(G.hpMe)));
  let ftx = Math.max(0, Math.ceil(G.hpFoe)) + "　" + ERAS[G.foeEra].n;
  const gm = $("ghostMark"),
    gp = G.ghost ? ghostAt(G.t) : null;
  if (gp && G.running && !G.over) {
    gm.style.left = gp[0] * 100 + "%";
    gm.classList.add("on");
    const d = Math.round((gp[0] - Math.max(0, G.hpFoe) / G.hpFoeMax) * 100);
    ftx +=
      '<span class="gdelta ' +
      (d >= 0 ? "a" : "b") +
      '">' +
      (d > 0 ? "ベストより先行 " + d + "%" : d < 0 ? "ベストに遅れ " + -d + "%" : "ベストと互角") +
      "</span>";
  } else gm.classList.remove("on");
  $("hpFoeTxt").innerHTML = ftx;
  const eb = $("evoBtn");
  if (G.evolving) {
    eb.className = "busy";
    eb.textContent = "硬直 " + dsec(G.evoT).toFixed(1) + "s";
  } else if (e >= NE - 1) {
    eb.className = "";
    eb.textContent = "最終時代";
  } else if (canEvolve()) {
    eb.className = "ready";
    eb.textContent = "進化 → " + ERAS[e + 1].n;
  } else {
    eb.className = "";
    eb.textContent = "進化 → " + ERAS[e + 1].n;
  }
  AU.danger = G.running && !G.over && G.hpMe / G.hpMeMax < 0.35;
  refreshCards(false);
  for (let i = 0; i < cards.length; i++) {
    const cd = cards[i],
      li = linOf(i);
    if (li === undefined) continue;
    const open = unlockedLin(li, e),
      c = costOfLin(li),
      ok = canProduce(i);
    cd.cost.textContent = open ? String(c) : "—";
    cd.el.className =
      "card" +
      (open ? "" : " lock") +
      (ok ? " afford" : "") +
      (!open || G.koku < c || G.evolving ? " off" : "") +
      (G.prodCd[li] > 0 ? " cooling" : "");
    cd.cd.textContent = open && G.prodCd[li] > 0 ? dsec(G.prodCd[li]).toFixed(1) : "";
  }
  for (let s = 0; s < skillCards.length; s++) {
    const sc = skillCards[s],
      cd = G.skCd[s] || 0;
    const isSum = skillAt(G.era, s).kind === "summon";
    const busy = isSum && !!yokaiAlive();
    sc.cost.textContent = busy ? "顕現中" : cd > 0 ? Math.ceil(dsec(cd)) + "s" : "可";
    sc.el.className = "card skill" + (cd <= 0 && !busy && !G.evolving && G.running ? " afford" : " off");
  }
}
