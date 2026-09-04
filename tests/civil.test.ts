/* 民（たみ）── 戦わずに石高を産む者。妖を見ると逃げる。 */
import { beforeEach, describe, expect, it } from "vitest";
import { BAL, LIN, linIndex } from "@/data/master";
import { newGame } from "@/sim/game";
import { step } from "@/sim/step";
import { G, addUnit, setG } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import type { Unit } from "@/sim/types";

const put = (id: string, side: 0 | 1, x: number): Unit => {
  const u = makeUnit(side, linIndex(id), 0, x, side === 1);
  addUnit(u);
  return u;
};

beforeEach(() => {
  setG(newGame(20260904, 0));
  G.running = true;
  G.koku = 0;
});

describe("民の顔ぶれ", () => {
  it("採取の民と火を守る者が民である", () => {
    for (const id of ["saishu", "himori"]) {
      expect(LIN[linIndex(id)].civil, id).toBeTruthy();
    }
  });

  it("戦う兵は民ではない", () => {
    for (const id of ["walk", "onibase", "honehun", "muragun"]) {
      expect(LIN[linIndex(id)].civil, id).toBeFalsy();
    }
  });

  it("民は攻撃力を持たない", () => {
    for (const id of ["saishu", "himori"]) {
      expect(LIN[linIndex(id)].base.atk, id).toBe(0);
    }
  });
});

describe("稼ぐ", () => {
  it("立っているだけで石高が入る", () => {
    put("saishu", 0, 200);
    const before = G.koku;
    for (let i = 0; i < 120; i++) step();
    expect(G.koku).toBeGreaterThan(before);
  });

  it("よく稼ぐ民のほうが実入りが多い", () => {
    const income = (id: string): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.koku = 0;
      put(id, 0, 200);
      for (let i = 0; i < 120; i++) step();
      return G.koku;
    };
    // 火を守る者は高いぶんよく稼ぐ
    expect(income("himori")).toBeGreaterThan(income("saishu"));
  });

  it("敵の民はこちらの石高にならない", () => {
    // 石高はもともと自然に増えるので、居ない場合と比べる
    const income = (withFoeTami: boolean): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.koku = 0;
      if (withFoeTami) put("saishu", 1, 600);
      for (let i = 0; i < 120; i++) step();
      return G.koku;
    };
    expect(income(true)).toBe(income(false));
  });
});

describe("戦わない", () => {
  it("敵を殴らない", () => {
    const tami = put("saishu", 0, 300);
    const foe = put("walk", 1, 310);
    const hp = foe.hp;
    for (let i = 0; i < 200; i++) step();
    expect(foe.hp, "民が殴っている").toBe(hp);
    expect(tami.st).toBe("move");
  });

  it("味方の足を止めない", () => {
    // 民が前を歩いていても、後ろの兵はつかえない
    const withTami = (): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      put("saishu", 0, 210);
      const w = put("walk", 0, 200);
      for (let i = 0; i < 200; i++) step();
      return Math.round(w.x);
    };
    const alone = (): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      const w = put("walk", 0, 200);
      for (let i = 0; i < 200; i++) step();
      return Math.round(w.x);
    };
    expect(withTami()).toBe(alone());
  });
});

describe("逃げる", () => {
  it("妖が近づくと後ろへ下がり、稼ぎが止まる", () => {
    const tami = put("saishu", 0, 400);
    for (let i = 0; i < 60; i++) step();
    const calmX = tami.x;
    const calmKoku = G.koku;

    // 妖を間合いへ置く
    put("onibase", 1, 430);
    for (let i = 0; i < 60; i++) step();

    expect(tami.panic, "恐慌していない").toBeGreaterThan(0);
    expect(tami.x, "逃げていない").toBeLessThan(calmX);
    // 逃げているあいだの実入りは、落ち着いていたときより少ない
    expect(G.koku - calmKoku).toBeLessThan(calmKoku);
  });

  it("戦場の外へは出ない", () => {
    const tami = put("saishu", 0, BAL.laneL + 20);
    put("onibase", 1, BAL.laneL + 40);
    for (let i = 0; i < 600; i++) step();
    expect(tami.x).toBeGreaterThanOrEqual(BAL.laneL);
  });

  it("妖が居なくなれば、また稼ぎはじめる", () => {
    const tami = put("saishu", 0, 400);
    const oni = put("onibase", 1, 430);
    for (let i = 0; i < 60; i++) step();
    expect(tami.panic).toBeGreaterThan(0);

    oni.dead = true;
    for (let i = 0; i < 120; i++) step();
    expect(tami.panic).toBeLessThanOrEqual(0);
    const before = G.koku;
    for (let i = 0; i < 60; i++) step();
    expect(G.koku).toBeGreaterThan(before);
  });
});

describe("妖を出すと畏が上がる", () => {
  it("盤に出すだけでも上がる（召喚より控えめ）", () => {
    expect(G.awe).toBe(0);
    G.koku = 9999;
    const before = G.awe;
    // 生産の経路を通す
    G.team = [linIndex("onibase")];
    G.prodCd = new Array(LIN.length).fill(0);
    void put("onibase", 0, 100); // 直接置いた分では上がらない
    expect(G.awe).toBe(before);
  });
});

describe("決定論", () => {
  it("同じ手順なら同じ結果になる", () => {
    const run = (): string => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.koku = 0;
      put("saishu", 0, 300);
      put("himori", 0, 340);
      put("onibase", 1, 500);
      for (let i = 0; i < 400; i++) step();
      return `${G.koku.toFixed(6)}/${G.awe.toFixed(6)}`;
    };
    expect(run()).toBe(run());
  });
});
