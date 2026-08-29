import { AU } from "@/audio/index";
import { DT } from "@/core/constants";
import { BAL } from "@/data/master";
import { DET } from "@/render/quality";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { hurt } from "@/sim/combat";
import { spawnParts } from "@/sim/fx";
import { G, vrng } from "@/sim/state";
import type { SkillKind } from "@/data/types";
import type { Disaster, Unit } from "@/sim/types";

/* ---------- 天災：しばらく戦場に居座る災い ---------- */
export function disTick(): void {
  const D = G.dis;
  D.t -= DT;
  D.acc -= DT;
  if (D.t <= 0) {
    G.dis = null;
    return;
  }
  if (D.acc > 0) return;
  D.acc = D.every;
  // 回数が決まっている災い（津波）は、その回数だけ起きて終わる。
  // 秒数まかせにすると、間隔をいじったとたん回数がずれる
  if (D.n !== undefined) {
    if (D.n <= 0) {
      G.dis = null;
      return;
    }
    D.n--;
  }
  const foes = G.units;
  if (D.k === "bug") {
    // 蟲：戦場じゅうを削り続ける
    for (const u of foes) if (u.side === 1 && !u.dead) hurt(u, D.d);
    if (!REPLAY && DET)
      for (let i = 0; i < 3; i++)
        spawnParts(
          sx(BAL.laneL + (BAL.laneR - BAL.laneL) * vrng()),
          GY - (16 + vrng() * 26) * SC,
          2,
          "#8FA34A",
          2.2,
        );
  } else if (D.k === "thunder") {
    // 雷：敵の多い所に落ちる
    let bx = null,
      best = -1;
    for (const u of foes) {
      if (u.side !== 1 || u.dead) continue;
      let c = 0;
      for (const o of foes) if (o.side === 1 && !o.dead && Math.abs(o.x - u.x) < 60) c++;
      if (c > best) {
        best = c;
        bx = u.x;
      }
    }
    if (bx === null) return;
    D.lx = bx;
    D.flash = 1;
    for (const u of foes) if (u.side === 1 && !u.dead && Math.abs(u.x - bx) < 62) hurt(u, D.d);
    if (!REPLAY) {
      AU.fx("skill");
      G.shake = Math.max(G.shake, 7);
      spawnParts(sx(bx), GY - 26 * SC, 14, "#CFE6FF", 4.6);
    }
  } else if (D.k === "tsunami") {
    // 津波：一波ごとに打ち、生き残りを拠点側へ押し流す
    for (const u of foes) {
      if (u.side !== 1 || u.dead) continue;
      hurt(u, D.d);
      if (!u.noKnock && !u.fly) u.x = Math.min(BAL.laneR - 8, u.x + (D.push || 0));
    }
    G.wave = 1; // 波の絵は updateFx が 1 から 0 へ落として横に走らせる
    if (!REPLAY) {
      AU.fx("skill");
      G.shake = Math.max(G.shake, 18);
      for (let i = 0; i < 12; i++)
        spawnParts(
          sx(BAL.laneL + (BAL.laneR - BAL.laneL) * vrng()),
          GY - (6 + vrng() * 30) * SC,
          3,
          "#8FC6D8",
          4.2,
        );
    }
  } else if (D.k === "fire") {
    // 噴火のあとの燃える地面
    for (const u of foes) if (u.side === 1 && !u.dead && !u.fly && Math.abs(u.x - D.x) < D.r) hurt(u, D.d);
    if (!REPLAY && DET)
      for (let i = 0; i < 3; i++)
        spawnParts(sx(D.x + (vrng() * 2 - 1) * D.r), GY - 4 * SC, 2, i % 2 ? "#F0A050" : "#E8582E", 3.4);
  }
}
export function startDis(
  k: SkillKind,
  dur: number,
  every: number,
  d: number,
  extra?: Partial<Disaster>,
): void {
  G.dis = Object.assign({ k, t: dur, dur, every, acc: 0, d, flash: 0 }, extra || {});
}
// 弱体化：攻撃を落とす。より強い弱体が来たら上書きする
export function weaken(o: Unit, d: { mul?: number; dur?: number }): void {
  const mul = d.mul || 0.6,
    dur = d.dur || 6;
  if (!(o.curse > 0) || mul < (o.curseV || 1)) {
    o.curseV = mul;
  }
  o.curse = Math.max(o.curse || 0, dur);
  o.hexFx = 1;
}
