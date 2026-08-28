import { AU } from "@/audio/index";
import { BAL, ERAS, NE } from "@/data/master";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { spawnParts } from "@/sim/fx";
import { G } from "@/sim/state";
import { kokuCapOf } from "@/sim/unit";
import { toast } from "@/ui/dom";

/* ---------- 進化 ---------- */
export function canEvolve(): boolean {
  return G.running && !G.evolving && !G.over && G.era < NE - 1 && G.fumi >= BAL.fumiNeed[G.era];
}
export function startEvolve(): boolean {
  if (!canEvolve()) return false;
  if (!REPLAY) G.rec.in.push([G.frame, 1, 0]);
  G.fumi -= BAL.fumiNeed[G.era];
  G.evolving = true;
  G.evoT = G.lock;
  G.koku = 0;
  AU.fx("evoStart");
  toast("進化中 ── 無防備", "#F0C165");
  return true;
}
export function finishEvolve(): void {
  G.bgPrev = G.era;
  G.era++;
  G.bgFade = 0;
  G.evolving = false;
  G.evoFlash = 1;
  G.shake = 13;
  G.st.evo++;
  G.st.peak = Math.max(G.st.peak, G.era);
  G.legacy = (G.legacy || 0) + (BAL.legacyPer || 10) * 2;
  if (G.st.line) G.st.line.push([G.era, Math.round(G.t)]);
  G.koku = kokuCapOf(G.era) * 0.3;
  AU.fx("evoDone");
  AU.setEra(G.era);
  G.hitStop = Math.max(G.hitStop, 0.1);
  const cv = ERAS[G.era].civ || {},
    cn = [];
  if (cv.kokuMax) cn.push("石高上限+" + Math.round(cv.kokuMax * 100) + "%");
  if (cv.cavSpeed) cn.push("騎馬の脚+" + Math.round(cv.cavSpeed * 100) + "%");
  if (cv.cost) cn.push("生産費" + Math.round(cv.cost * 100) + "%");
  if (cv.hp) cn.push("体力+" + Math.round(cv.hp * 100) + "%");
  if (cv.rng) cn.push("射程+" + Math.round(cv.rng * 100) + "%");
  if (cv.aa) cn.push("拠点に対空砲");
  toast(ERAS[G.era].n + "　" + ERAS[G.era].concept + (cn.length ? "　" + cn.join("／") : ""), "#FFF3D0");
  spawnParts(sx(BAL.laneL + 40), GY - 40 * SC, 40, "#F5D68C", 5);
}

/* ---------- 時代の遺産：置いてきた時代が味方を底上げする ---------- */
export function legacySteps(): number {
  const per = BAL.legacyPer || 10,
    cap = BAL.legacyCap || 24;
  return Math.min(cap, Math.floor((G.legacy || 0) / per));
}
export function legacyMul(): number {
  return 1 + legacySteps() * (BAL.legacyGain || 0.015);
}
