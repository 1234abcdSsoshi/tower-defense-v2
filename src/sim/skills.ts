import { AU } from "@/audio/index";
import { BAL, ERAS } from "@/data/master";
import { LINE_COL, defaultPick, skById } from "@/data/skills";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { SAVE } from "@/save/save";
import { hurt } from "@/sim/combat";
import { startDis } from "@/sim/disaster";
import { spawnDust, spawnParts } from "@/sim/fx";
import { G, vrng } from "@/sim/state";
import { summonYokai, yokaiAlive } from "@/sim/summons";
import { toast } from "@/ui/dom";
import type { Skill } from "@/data/skills";
import type { Unit } from "@/sim/types";

export function pickOf(): string[][] {
  return (G && G.pick) || (SAVE && SAVE.pick) || defaultPick();
}
// 対局中の参照：時代とボタンの位置から実際の技を引く
export function skillAt(era: number, slot: number): Skill {
  const p = pickOf()[era] || [];
  return skById(p[slot]);
}
export function skLv(line: string): number {
  return (SAVE && SAVE.sk && SAVE.sk[line]) || 1;
}
export function skPow(line: string): number {
  return 1 + (skLv(line) - 1) * (BAL.skGain || 0.08);
}
export function skCdOfS(s: Skill): number {
  const base = (s.cd || BAL.skillCdDefault || 26) * (BAL.skCdMul || 1);
  return base * (1 - (skLv(s.line) - 1) * (BAL.skCdGain || 0.04));
}
export function frontFoes(n: number): Unit[] {
  return G.units
    .filter((u) => u.side === 1 && !u.dead)
    .sort((a, b) => a.x - b.x)
    .slice(0, n);
}
export function useSkill(slot: number): boolean {
  slot = slot | 0;
  if (!G.running || G.over || G.evolving) return false;
  if (G.skCd[slot] > 0) return false;
  {
    // 妖は一度に一体まで
    const S0 = skillAt(G.era, slot);
    if (!S0.id) return false;
    if ((S0.kind || "") === "summon" && yokaiAlive()) return false;
  }
  if (!REPLAY) G.rec.in.push([G.frame, 2, slot]);
  const e = G.era,
    S = skillAt(e, slot),
    line = S.line,
    k = S.kind || "bug";
  const m = BAL.statMul[e] * skPow(line) * (BAL.hpMul || 1),
    pw = skPow(line);
  G.skCd[slot] = skCdOfS(S);
  // 同じ系統を二つ持ち込んだ場合は、間隔を分け合う。
  // 揃えれば手数が増える、ではなく「同じ手が二種類」になるようにするため。
  for (let j = 0; j < G.skCd.length; j++) {
    if (j === slot) continue;
    const S2 = skillAt(e, j);
    if (S2.id && S2.line === S.line) G.skCd[j] = Math.max(G.skCd[j], skCdOfS(S) * (BAL.skSameCd || 0.6));
  }
  const foes = G.units.filter((u) => u.side === 1 && !u.dead);

  /* ---- 天災：戦線をまとめて崩す ---- */
  if (k === "bug") {
    // 蟲の群れ：6秒 戦場じゅうを削り続ける
    startDis("bug", 6, 0.5, 4.2 * m);
  } else if (k === "thunder") {
    // 雷雲：6秒 敵の多い所に落ちる
    startDis("thunder", 6, 0.75, 15 * m);
  } else if (k === "quake2") {
    // 地震：足が半分・受ける被害が2倍
    G.bQuake = 8 * pw;
    for (const u of foes) if (!u.fly) u.hitFx = 1;
    if (!REPLAY) {
      G.shake = Math.max(G.shake, 26);
      G.hitStop = Math.max(G.hitStop, 0.16);
      for (let i = 0; i < 10; i++)
        spawnDust(sx(BAL.laneL + ((BAL.laneR - BAL.laneL) * (i + 0.5)) / 10), GY, 3, 2.6);
    }
  } else if (k === "tsunami") {
    // 津波：まとめて押し流す
    for (const u of foes) {
      hurt(u, 46 * m);
      if (!u.noKnock && !u.fly) u.x = Math.min(BAL.laneR - 8, u.x + 82);
    }
    G.wave = 1;
    if (!REPLAY) {
      G.shake = Math.max(G.shake, 22);
      for (let i = 0; i < 14; i++)
        spawnParts(
          sx(BAL.laneL + (BAL.laneR - BAL.laneL) * vrng()),
          GY - (6 + vrng() * 30) * SC,
          3,
          "#8FC6D8",
          4.2,
        );
    }
  } else if (k === "erupt") {
    // 噴火：一撃のあと地面が燃え続ける
    const f = frontFoes(1)[0],
      cx = f ? f.x : (BAL.laneL + BAL.laneR) * 0.5;
    for (const u of foes) if (Math.abs(u.x - cx) < 130) hurt(u, 90 * m);
    startDis("fire", 7, 0.5, 4.6 * m, { x: cx, r: 130 });
    if (!REPLAY) {
      G.shake = Math.max(G.shake, 24);
      G.hitStop = Math.max(G.hitStop, 0.14);
      spawnParts(sx(cx), GY - 30 * SC, 30, "#F0A050", 5.6);
    }
  } else if (k === "typhoon") {
    // 台風：押し戻し続け、飛行を落とす
    G.bWind = 8 * pw;
    G.windD = 26 * m;
    if (!REPLAY) {
      G.shake = Math.max(G.shake, 14);
      for (let i = 0; i < 12; i++)
        spawnDust(sx(BAL.laneL + (BAL.laneR - BAL.laneL) * vrng()), GY - vrng() * 20 * SC, 3, 3.4);
    }
  }
  /* ---- 妖：味方として戦う ---- */
  else if (k === "summon") {
    const y = summonYokai(e, pw);
    if (y && !REPLAY) toast((S.n || "妖") + "　顕る", "#C79BE8");
  }

  AU.fx("skill");
  G.hitStop = Math.max(G.hitStop, 0.06);
  if (k !== "summon") {
    toast(S.n || "天災", "#F0A08C");
    G.shake = Math.max(G.shake, 6);
    spawnParts(sx(BAL.laneL + 60), GY - 30 * SC, 20, LINE_COL[line] || ERAS[e].pal.accent, 4.0);
  }
  return true;
}
