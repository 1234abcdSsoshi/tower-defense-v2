import { AU } from "@/audio/index";
import { DT } from "@/core/constants";
import { BAL, ERAS, LIN, linIndex } from "@/data/master";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { aweSummon } from "@/sim/awe";
import { hurt } from "@/sim/combat";
import { spawnCastleShot, spawnDust, spawnParts, spawnSpark } from "@/sim/fx";
import { G, addUnit } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import { toast } from "@/ui/dom";
import type { Unit } from "@/sim/types";

// 拠点からの対空射撃。飛行は矢と拠点でしか落とせない
export function spawnLord(fe: number, boost?: number): void {
  const H = (ERAS[fe] && ERAS[fe].hero) || null;
  if (!H) return;
  let bl = linIndex(H.lin);
  if (fe < (LIN[bl].debut || 0)) bl = 0;
  const mu = H.mul || { hp: 6, atk: 1.5, w: 2.4 };
  const u = makeUnit(1, bl, fe, BAL.laneR - 20, true);
  u.hp *= mu.hp * boost;
  u.maxHp = u.hp;
  u.atk *= mu.atk * boost;
  u.w *= mu.w;
  u.hh = (u.hh || 1) * mu.w;
  u.lord = 1;
  // 時代の主は大猪・怨霊・鬼武者・黒船・化け列車 ── いずれも妖怪。
  // これで術（退魔師）が主に強く当たるようになる
  u.attr = "yo";
  u.art = H.art || "oni";
  u.power = H.power || "";
  u.pcd = 4.5;
  u.dash = 0;
  u.tel = 0;
  // 図体が大きいのに間合いが兵と同じだと、体に食い込んでから殴る絵になる
  u.range = Math.max(u.range, 13 * u.w);
  if (u.power === "armor") u.armor = true;
  if (u.power === "sweep") u.aoe = Math.max(u.aoe || 0, 10 * u.w + 18);
  addUnit(u);
  G.lordName = H.n || "時代の主";
  G.lordIn = 1.6;
  AU.fx("boss");
  AU.fx("evoStart");
  G.hitStop = Math.max(G.hitStop, 0.4);
  G.shake = 22;
  toast(G.lordName + "　現る", "#F0C165");
}
/* ---------- 妖：呼び出すと味方として戦う ---------- */

/**
 * 出ている妖を一体返す（居なければ null）。
 * かつては「一度に一体まで」の門番だったが、いまは縛りに使わない。
 * 出ているかどうかを問うためだけの道具。
 */
export function yokaiAlive(): Unit {
  for (const u of G.units) if (u.mon && u.side === 0 && !u.dead) return u;
  return null;
}
export function summonYokai(era: number, pw: number): Unit {
  const S = (ERAS[era].skills && ERAS[era].skills.you) || null;
  const M2 = S && S.mon;
  if (!M2) return null;
  const sm = BAL.statMul[era],
    hm = BAL.hpMul || 1;
  const hp = M2.hp * sm * hm * pw;
  const u: Unit = {
    side: 0,
    lin: 0,
    attr: "yo",
    hush: 0,
    era,
    arm: "foot",
    fly: false,
    x: BAL.laneL + 30,
    hp,
    maxHp: hp,
    atk: M2.atk * sm * pw,
    range: M2.range || 34,
    speed: M2.speed || 30,
    int: (M2.intv || 1.3) * (BAL.intMul || 1),
    cd: 0.6,
    aoe: M2.aoe || 0,
    w: M2.w || 2.0,
    hh: M2.hh || M2.w || 2.0,
    dir: 1,
    st: "move",
    flash: 0,
    hitFx: 0,
    atkA: 0,
    z: 0,
    dead: false,
    slow: 0,
    haste: 0,
    buff: 0,
    lane: 0,
    vs: null as Unit["vs"],
    weak: null as Unit["weak"],
    even: true,
    tough: 0.82,
    noKnock: true,
    debuff: M2.power === "venom" ? { mul: 0.66, dur: 5 } : (null as Unit["debuff"]),
    mon: 1,
    art: M2.art || "oni",
    power: M2.power || "",
    heads: M2.heads || 0,
    pcd: M2.pcd || 0,
    pt: M2.pcd || 0,
    born: G.t,
  }; // 留まれる時間。技のレベルで少し伸びる
  G.units.push(u);
  G.st.spawned++;
  // 妖を呼べば、世はそれを見る。畏が高まり、退魔師が力を得る
  aweSummon();
  // いま出ている数を数え直す。並べられるようになったので 1 固定にはできない
  G.yokai = 0;
  for (const o of G.units) if (o.mon && o.side === 0 && !o.dead) G.yokai++;
  G.monName = S.n || "妖";
  if (!REPLAY) {
    AU.fx("evoDone");
    G.shake = Math.max(G.shake, 12);
    G.hitStop = Math.max(G.hitStop, 0.12);
    spawnParts(sx(u.x), GY - 30 * SC, 30, "#C79BE8", 5.0);
  }
  return u;
}
// 妖の固有の動き。天狗の団扇と鎌鼬のつむじ風は数秒に一度だけ
export function monTick(u: Unit): void {
  if (!u.pcd) return;
  u.pt -= DT;
  if (u.pt > 0) return;
  const near = [];
  for (const o of G.units)
    if (o.side === 1 && !o.dead && !o.fly) {
      const dx = (o.x - u.x) * u.dir;
      if (dx > -10 && dx < u.range + 52) near.push(o);
    }
  if (!near.length) return;
  u.pt = u.pcd;
  if (u.power === "fan") {
    // 天狗：葉団扇でまとめて吹き飛ばす
    for (const o of near) {
      hurt(o, u.atk * 1.15, u);
      if (!o.noKnock) o.x = Math.min(BAL.laneR - 8, o.x + 46);
    }
    u.fanFx = 1;
    if (!REPLAY) {
      AU.fx("skill");
      G.shake = Math.max(G.shake, 8);
      spawnDust(sx(u.x + 40), GY, 6, 3.0);
    }
  } else if (u.power === "whirl") {
    // 鎌鼬：つむじ風で前の敵をまとめて斬る
    for (const o of near) hurt(o, u.atk * 1.3, u);
    u.whirlFx = 1;
    if (!REPLAY) {
      AU.fx("skill");
      for (const o of near) spawnSpark(sx(o.x), GY - 16 * SC, 3, "#E8F4FF", 4.0, u.dir);
    }
  }
}
export function lordAlive(): Unit {
  for (const u of G.units) if (!u.dead && u.lord) return u;
  return null;
}
// 時代の主の固有の動き
export function lordTick(u: Unit): void {
  if (u.tel > 0) {
    u.tel -= DT;
    if (u.tel <= 0) {
      u.dash = 1.5;
    }
    return;
  }
  if (u.dash > 0) {
    u.dash -= DT;
    if (u.dash <= 0) u.pcd = 6.5;
    return;
  }
  u.pcd -= DT;
  if (u.pcd > 0) return;
  const k = u.power;
  if (k === "dash") {
    u.tel = 1.1;
    u.pcd = 99;
    G.shake = Math.max(G.shake, 8);
    toast("突進が来る", "#E8907A");
  } else if (k === "curse") {
    u.pcd = 7.5;
    for (const o of G.units)
      if (o.side === 0 && !o.dead && Math.abs(o.x - u.x) < 180) {
        o.curse = 8;
        o.curseV = 0.6;
      }
    G.shake = Math.max(G.shake, 5);
    if (!REPLAY) spawnParts(sx(u.x), GY - 40 * SC, 20, "#9A7ACC", 3.6);
  } else if (k === "naval") {
    u.pcd = 5.0;
    G.hpMe -= u.atk * BAL.castleMul * 0.9;
    G.shake = Math.max(G.shake, 9);
    if (!REPLAY) {
      spawnCastleShot(1, BAL.laneL + 10);
      spawnParts(sx(BAL.laneL + 14), GY - 34 * SC, 10, "#FFC98A", 3.6);
    }
  } else if (k === "carrier") {
    u.pcd = 8.0;
    const fl = linIndex("fly");
    for (let i = 0; i < 2; i++) {
      const c2 = makeUnit(1, fl, u.era, u.x - 10 - i * 12, true);
      c2.hp *= 1.2;
      c2.maxHp = c2.hp;
      addUnit(c2);
    }
    if (!REPLAY) spawnParts(sx(u.x), GY - ((BAL.airY || 56) + 10) * SC, 14, "#BFE8F0", 3.2);
  } else u.pcd = 6.0;
}
