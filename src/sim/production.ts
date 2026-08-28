import { AU } from "@/audio/index";
import { BAL, LIN, unlockedLin } from "@/data/master";
import { REPLAY } from "@/save/replay";
import { legacyMul } from "@/sim/evolution";
import { G, addUnit } from "@/sim/state";
import { airAlive, lvMulOf, makeUnit, unitCost } from "@/sim/unit";

/* ---------- 生産 ---------- */
// 生産の状態は「枠」ではなく「系譜」に紐づける。
// こうしておくと、戦闘中にカードを並べ替えても待機時間も記録も破綻しない。
export function linOf(slot: number): number {
  return G.team[slot];
}
export function costOfLin(lin: number): number {
  return Math.max(1, Math.round(unitCost(lin, G.era) * (G.bCheap > 0 ? 0.5 : 1)));
}
export function canProduceLin(lin: number): boolean {
  if (!unlockedLin(lin, G.era)) return false;
  if (!(G.running && !G.evolving && !G.over && G.prodCd[lin] <= 0 && G.koku >= costOfLin(lin))) return false;
  if (LIN[lin].arm === "air" && airAlive(0) >= G.airCap) return false;
  return true;
}
export function produceLin(lin: number): boolean {
  if (!canProduceLin(lin)) return false;
  if (!REPLAY) G.rec.in.push([G.frame, 0, lin]);
  G.koku -= costOfLin(lin);
  G.prodCd[lin] = LIN[lin].cd * (G.bFast > 0 ? 0.5 : 1);
  addUnit(makeUnit(0, lin, G.era, BAL.laneL + 14, false, lvMulOf(lin) * legacyMul()));
  G.st.spawned++;
  AU.fx("produce", lin % 5, G.era);
  return true;
}
export function costOf(i: number): number {
  return costOfLin(linOf(i));
}
export function canProduce(i: number): boolean {
  return canProduceLin(linOf(i));
}
export function produce(i: number): boolean {
  return produceLin(linOf(i));
}
