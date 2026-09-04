import { BAL, LIN, META, civ } from "@/data/master";
import { SAVE } from "@/save/save";
import { G } from "@/sim/state";
import type { Lineage } from "@/data/types";
import type { Record_, Side, Unit } from "@/sim/types";

export function makeUnit(
  side: Side,
  linIdx: number,
  era: number,
  x: number,
  foe?: boolean,
  lvMul?: number,
): Unit {
  const L = LIN[linIdx],
    b = L.base,
    cv = civ(era);
  const fs = (G && G.foeStat) || BAL.foeStat;
  const m = BAL.statMul[era] * (foe ? fs : lvMul || 1);
  // 打ち合いを長くするための共通のつまみ。敵味方どちらにも同じだけ掛ける
  const hp = b.hp * m * (1 + cv.hp) * (BAL.hpMul || 1);
  const sp = b.speed * (L.arm === "cavalry" ? 1 + cv.cavSpeed : 1);
  return {
    side,
    lin: linIdx,
    era,
    arm: L.arm,
    fly: L.arm === "air",
    x,
    hp,
    maxHp: hp,
    atk: b.atk * m,
    range: b.range * (1 + cv.rng),
    speed: sp,
    // 三すくみの属性。系譜が決める（術＝退魔師、それ以外＝人間）
    attr: L.attr || "hito",
    hush: 0,
    // 系譜ごとの得意・不得意。ここで一度だけ写しておく
    vs: L.vs || null,
    weak: L.weak || null,
    even: !!L.even,
    tough: L.tough || 1,
    noKnock: !!L.noKnock,
    debuff: L.debuff || null,
    int: b.int * (BAL.intMul || 1),
    cd: b.int * (BAL.intMul || 1) * 0.45,
    aoe: b.aoe || 0,
    w: b.w,
    hh: b.hh || b.w,
    dir: side === 0 ? 1 : -1,
    st: "move",
    flash: 0,
    hitFx: 0,
    atkA: 0,
    z: 0,
    dead: false,
    slow: 0,
    haste: 0,
    buff: 0,
    lane: pickLane(L),
  };
}
/**
 * その兵が立つ道を決める。
 *
 * 一本道（lanes === 1）のときは必ず 0 を返すので、
 * 既存の戦の挙動はビット単位で変わらない。
 * 乱数は G.rng だけを使う ── Math.random を使うとゴーストが全滅する。
 */
function pickLane(L: Lineage): number {
  const n = G ? G.lanes || 1 : 1;
  if (n <= 1) return 0;
  const allow = (L.lanes && L.lanes.length ? L.lanes : [0]).filter((v: number) => v < n);
  if (!allow.length) return 0;
  return allow[Math.min(allow.length - 1, Math.floor(G.rng() * allow.length))];
}

export function unitCost(linIdx: number, era: number): number {
  return Math.max(1, Math.round(LIN[linIdx].base.cost * BAL.costMul[era] * (1 + civ(era).cost)));
}
export function kokuCapOf(era: number): number {
  return BAL.kokuMax[era] * (1 + civ(era).kokuMax) * (G && G.bCap > 0 ? 1.28 : 1);
}
export function airAlive(side: Side): number {
  let k = 0;
  for (const u of G.units) if (!u.dead && u.side === side && u.fly) k++;
  return k;
}
// 強化レベルによる倍率。対局中は G.lvOf に凍結する。
// リプレイは記録時のレベルで再現しなければならないため。
export function lvMulOf(linIdx: number): number {
  if (G && G.lvOf && G.lvOf[linIdx] !== undefined) return G.lvOf[linIdx];
  const lv = (SAVE && SAVE.lin[LIN[linIdx].id] && SAVE.lin[LIN[linIdx].id].lv) || 1;
  return 1 + (lv - 1) * META.lvGain;
}
export function linLevels(rec?: Record_): Record<string, number> {
  const o: Record<string, number> = {};
  for (const L of LIN)
    o[L.id] =
      rec && rec.lv && rec.lv[L.id] !== undefined
        ? rec.lv[L.id]
        : (SAVE && SAVE.lin[L.id] && SAVE.lin[L.id].lv) || 1;
  return o;
}
