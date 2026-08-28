import { AU } from "@/audio/index";
import { BAL } from "@/data/master";
import { linPal } from "@/render/palette";
import { DET } from "@/render/quality";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { addCorpse, spawnCastleShot, spawnDust, spawnParts, spawnSpark } from "@/sim/fx";
import { G, vrng } from "@/sim/state";
import { toast } from "@/ui/dom";
import type { Side, Unit } from "@/sim/types";

export function castleAA(side: Side): boolean {
  const era = side === 0 ? G.era : G.foeEra;
  const cx = side === 0 ? BAL.laneL : BAL.laneR;
  let best = null,
    bd = 1e9;
  for (const o of G.units) {
    if (o.dead || o.side === side || !o.fly) continue;
    const d = Math.abs(o.x - cx);
    if (d < (BAL.aaRange || 250) && d < bd) {
      bd = d;
      best = o;
    }
  }
  if (!best) return false;
  spawnCastleShot(side, best.x);
  hurt(best, (BAL.aaDamage || 0.55) * BAL.statMul[era] * 100 * (BAL.hpMul || 1));
  return true;
}
export function hurt(u: Unit, d: number, by?: Unit): void {
  if (u.side === 0) {
    if (G.bDef > 0) d *= G.bDefV;
    if (G.bLast > 0 && u.hp - d < 1) d = u.hp - 1;
  }
  u.hp -= d;
  u.flash = 0.09;
  u.hitFx = 1;
  AU.fx("hit", 0, u.era);
  const ay = u.fly ? (BAL.airY || 56) * SC : 0;
  const hx = sx(u.x),
    hy = GY - 16 * SC * u.w - (u.z || 0) * 13 * SC - ay;
  spawnParts(hx, hy, 2, "#FFD9A0", 2.6);
  // 近接どうしがぶつかったときは火花を散らす
  if (DET && by && !REPLAY && !by.fly && !u.fly && by.range <= 46 && G.parts.length < 300) {
    const dir = by.dir || 1;
    const cx = sx((by.x + u.x) * 0.5),
      cy = GY - (13 + 5 * u.w) * SC - (u.z || 0) * 13 * SC;
    spawnSpark(
      cx,
      cy,
      u.tough && u.tough < 1 ? 4 : 2,
      u.tough && u.tough < 1 ? "#DCE8FF" : "#FFE7B4",
      3.4,
      dir,
    );
    if (vrng() < 0.22) spawnDust(cx, GY - (u.z || 0) * 13 * SC, 2, 1.5);
  }
  if (u.hp <= 0 && !u.dead) {
    u.dead = true;
    AU.fx("kill");
    addCorpse(u);
    G.hitStop = Math.max(G.hitStop, 0.038);
    if (!u.fly && DET && G.parts.length < 330) spawnDust(sx(u.x), GY - (u.z || 0) * 13 * SC, 3, 2.0);
    spawnParts(
      sx(u.x),
      GY - 14 * SC * u.w - (u.z || 0) * 13 * SC - ay,
      u.fly ? 18 : 9,
      linPal(u.lin, u.era).cloth,
      u.fly ? 4.4 : 3.4,
    );
    if (u.side === 1) {
      G.st.kills++;
      G.fumi += BAL.fumiKill * (1 + u.era * BAL.fumiKillE);
      G.legacy = (G.legacy || 0) + (BAL.legacyRate || 1);
      if (u.lord) {
        G.lordKill = 1;
        G.shake = Math.max(G.shake, 18);
        G.hitStop = Math.max(G.hitStop, 0.22);
        if (!REPLAY) {
          AU.fx("win");
          toast((G.lordName || "時代の主") + "　討伐", "#F5D68C");
          spawnParts(sx(u.x), GY - 40 * SC, 54, "#F5D68C", 6.4);
        }
      }
    }
  }
}
