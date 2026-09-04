/* 三すくみ（妖怪→人間→退魔師→妖怪）と、畏。
   兵科の三すくみと掛け合わせても開きすぎないこと、
   畏が妖の使用で上がり、退魔師を強くすることを見る。 */
import { beforeEach, describe, expect, it } from "vitest";
import { ATTR_AFF, ERAS, LIN, attrMulOf, attrSide, linIndex } from "@/data/master";
import { DT } from "@/core/constants";
import { dmgMul, targetBias } from "@/sim/affinity";
import { addAwe, aweTick } from "@/sim/awe";
import { newGame } from "@/sim/game";
import { useSkill } from "@/sim/skills";
import { G, setG } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import type { Unit } from "@/sim/types";

const at = (id: string, side: 0 | 1 = 0, era = 0): Unit => makeUnit(side, linIndex(id), era, 100, side === 1);

beforeEach(() => {
  setG(newGame(20260904, 0));
  G.running = true;
});

describe("属性の割り当て", () => {
  it("術は退魔師、それ以外の兵は人間", () => {
    for (const L of LIN) {
      expect(L.attr, L.id).toBe(L.arm === "mystic" ? "tai" : "hito");
    }
  });

  it("妖の召喚は妖怪になる", () => {
    G.era = 0;
    G.skCd[1] = 0;
    expect(useSkill(1)).toBe(true);
    const yo = G.units.find((u) => u.mon && !u.dead);
    expect(yo?.attr).toBe("yo");
  });

  it("時代の主は妖怪。術が主に強く当たる", () => {
    // 大猪・怨霊・鬼武者・黒船・化け列車 ── いずれも怪異
    for (let e = 0; e < ERAS.length; e++) {
      if (ERAS[e].hero) expect(attrSide("tai", "yo"), ERAS[e].n).toBe(1);
    }
  });
});

describe("三すくみの向き", () => {
  it("妖怪→人間→退魔師→妖怪 の輪になっている", () => {
    expect(attrSide("yo", "hito")).toBe(1);
    expect(attrSide("hito", "tai")).toBe(1);
    expect(attrSide("tai", "yo")).toBe(1);
    expect(attrSide("hito", "yo")).toBe(-1);
    expect(attrSide("tai", "hito")).toBe(-1);
    expect(attrSide("yo", "tai")).toBe(-1);
  });

  it("同じ属性どうしは関係が無い", () => {
    for (const a of ["yo", "hito", "tai"] as const) {
      expect(attrSide(a, a), a).toBe(0);
      expect(attrMulOf(a, a, 0)).toBe(1);
    }
  });

  it("時代が進むほど開く", () => {
    let prevAdv = 0;
    let prevDis = 2;
    for (let e = 0; e < ERAS.length; e++) {
      const adv = attrMulOf("yo", "hito", e);
      const dis = attrMulOf("hito", "yo", e);
      expect(adv, `era${e} 有利`).toBeGreaterThanOrEqual(prevAdv);
      expect(dis, `era${e} 不利`).toBeLessThanOrEqual(prevDis);
      prevAdv = adv;
      prevDis = dis;
    }
    // 原始は控えめ、現代は開く
    expect(attrMulOf("yo", "hito", 0)).toBeLessThan(attrMulOf("yo", "hito", 5));
  });

  it("兵科（1.9／0.45）より弱い", () => {
    for (let e = 0; e < ERAS.length; e++) {
      expect(attrMulOf("yo", "hito", e), `era${e}`).toBeLessThan(1.9);
      expect(attrMulOf("hito", "yo", e), `era${e}`).toBeGreaterThan(0.45);
    }
  });
});

describe("兵科と掛け合わせても開きすぎない", () => {
  it("頭打ちの中に必ず収まる", () => {
    // 素直に掛けると 1.9×1.9 ÷ (0.45×0.45) で 17.8 倍まで開く。
    // それでは読み合いが成立しないので clamp してある
    const ids = LIN.map((L) => L.id);
    let lo = 9e9;
    let hi = 0;
    for (let e = 0; e < ERAS.length; e++) {
      for (const a of ids) {
        for (const b of ids) {
          const m = dmgMul(at(a, 0, e), at(b, 1, e));
          lo = Math.min(lo, m);
          hi = Math.max(hi, m);
        }
      }
    }
    expect(hi).toBeLessThanOrEqual(ATTR_AFF.clampHi);
    expect(lo).toBeGreaterThanOrEqual(ATTR_AFF.clampLo);
    expect(hi / lo, "最大の開き").toBeLessThan(8);
  });
});

describe("狙う相手", () => {
  it("属性が有利な相手を先に狙う", () => {
    const yo = at("walk");
    yo.attr = "yo";
    const hito = at("walk", 1);
    const tai = at("pray", 1);
    // 同じ距離でも、有利な人間のほうが「近く」見える
    expect(targetBias(yo, hito)).toBeLessThan(1);
    expect(targetBias(yo, tai)).toBeGreaterThan(1);
    expect(targetBias(yo, hito)).toBeLessThan(targetBias(yo, tai));
  });

  it("関係が無ければ歪めない", () => {
    expect(targetBias(at("walk"), at("walk", 1))).toBe(1);
  });
});

describe("畏", () => {
  it("妖を呼ぶと上がる", () => {
    expect(G.awe).toBe(0);
    G.era = 0;
    G.skCd[1] = 0;
    useSkill(1);
    expect(G.awe).toBeGreaterThan(0);
  });

  it("0〜1 から出ない", () => {
    addAwe(5);
    expect(G.awe).toBe(1);
    addAwe(-5);
    expect(G.awe).toBe(0);
  });

  it("放っておくと下がる", () => {
    addAwe(0.5);
    const before = G.awe;
    for (let i = 0; i < 60; i++) aweTick();
    expect(G.awe).toBeLessThan(before);
    // 一秒でいきなり消えたりはしない
    expect(G.awe).toBeGreaterThan(before - 0.1);
  });

  it("畏が高いほど退魔師の一撃が重い", () => {
    const tai = at("pray");
    const foe = at("walk", 1);
    G.awe = 0;
    const calm = dmgMul(tai, foe);
    G.awe = 1;
    const dread = dmgMul(tai, foe);
    expect(dread).toBeGreaterThan(calm);
  });

  it("畏は退魔師以外を強くしない", () => {
    const hito = at("walk");
    const foe = at("walk", 1);
    G.awe = 0;
    const calm = dmgMul(hito, foe);
    G.awe = 1;
    expect(dmgMul(hito, foe)).toBe(calm);
  });

  it("乱数を使わない ── 同じ手順なら同じ値になる", () => {
    const run = (): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.era = 0;
      G.skCd[1] = 0;
      useSkill(1);
      for (let i = 0; i < 120; i++) aweTick();
      return G.awe;
    };
    expect(run()).toBe(run());
  });
});

describe("兵科と重ねたときの見え方", () => {
  it("兵科が無関係な組み合わせでは、属性の差がそのまま出る", () => {
    // 弓 と 術 のあいだに兵科の関係は無いので、属性だけが効く
    const arch = at("throw", 0, 0);
    const tai = at("pray", 1, 0);
    expect(arch.arm).toBe("archer");
    expect(tai.arm).toBe("mystic");
    expect(dmgMul(arch, tai)).toBeCloseTo(attrMulOf("hito", "tai", 0), 5);
  });

  it("兵科が逆を向いていれば、兵科のほうが勝つ", () => {
    // 歩兵は術に弱い（兵科 0.45）。属性は人間→退魔師で有利（1.15）だが、
    // 兵科のほうが強いので押し負ける。これは意図した重ねかたで、
    // 「属性はダメージの主役にしない」という設計どおり
    const foot = at("walk", 0, 0);
    const tai = at("pray", 1, 0);
    expect(dmgMul(foot, tai)).toBeLessThan(1);
  });
});

describe("既定の戦は壊れていない", () => {
  it("DT は据え置き（畏の減りが実時間に依存しない）", () => {
    expect(DT).toBeCloseTo(1 / 60, 6);
  });
});
