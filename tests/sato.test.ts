/* 里 ── 保つか喰うか。前線の位置がそのまま収入になること。 */
import { beforeEach, describe, expect, it } from "vitest";
import { BAL, SATO, linIndex } from "@/data/master";
import { newGame } from "@/sim/game";
import { makeSato, satoHeld, satoRuined, satoTick } from "@/sim/sato";
import { G, addUnit, setG } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import type { Unit } from "@/sim/types";

function put(side: 0 | 1, x: number, yo = false): Unit {
  const u = makeUnit(side, linIndex("walk"), G.era, x, side === 1);
  if (yo) u.attr = "yo";
  addUnit(u);
  return u;
}

beforeEach(() => {
  setG(newGame(20260904, 0));
  G.running = true;
  G.koku = 0;
});

describe("里の並び", () => {
  it("戦場の中に、等間隔で四つ立つ", () => {
    expect(G.sato.length).toBe(4);
    for (const s of G.sato) {
      expect(s.x).toBeGreaterThan(BAL.laneL);
      expect(s.x).toBeLessThan(BAL.laneR);
    }
    // 前線がどこにあるか読めるよう、間隔を揃えてある
    const gaps = G.sato.slice(1).map((s, i) => s.x - G.sato[i].x);
    for (const g of gaps) expect(g).toBe(gaps[0]);
  });

  it("はじめは誰のものでもない", () => {
    expect(satoHeld(0)).toBe(0);
    expect(satoHeld(1)).toBe(0);
    expect(satoRuined()).toBe(0);
  });

  it("戦をやり直せば里も戻る", () => {
    G.sato[0].ruin = true;
    const fresh = makeSato();
    expect(fresh[0].ruin).toBe(false);
  });
});

describe("保つ", () => {
  it("片側の兵だけが立てば、その側のものになる", () => {
    put(0, G.sato[0].x);
    satoTick();
    expect(G.sato[0].side).toBe(0);
    expect(satoHeld(0)).toBe(1);
  });

  it("敵味方が睨み合っているあいだは、持ち主が変わらない", () => {
    put(0, G.sato[1].x);
    satoTick();
    expect(G.sato[1].side).toBe(0);
    put(1, G.sato[1].x);
    satoTick();
    // 取り返すには、相手を追い払わないといけない
    expect(G.sato[1].side).toBe(0);
  });

  it("保っているあいだ石高が入る", () => {
    put(0, G.sato[0].x);
    satoTick();
    const before = G.koku;
    for (let i = 0; i < 60; i++) satoTick();
    expect(G.koku).toBeGreaterThan(before);
  });

  it("敵が保っている里からは、こちらに入らない", () => {
    put(1, G.sato[0].x);
    satoTick();
    expect(G.sato[0].side).toBe(1);
    const before = G.koku;
    for (let i = 0; i < 60; i++) satoTick();
    expect(G.koku).toBe(before);
  });

  it("前へ押すほど、入りが増える", () => {
    // 支配した線の長さがそのまま収入、という設計の要
    const income = (n: number): number => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.koku = 0;
      for (let i = 0; i < n; i++) put(0, G.sato[i].x);
      for (let i = 0; i < 120; i++) satoTick();
      return G.koku;
    };
    expect(income(3)).toBeGreaterThan(income(1));
    expect(income(1)).toBeGreaterThan(income(0));
  });
});

describe("喰う", () => {
  it("妖が来ると廃村になり、石高が一度に入る", () => {
    const before = G.koku;
    put(0, G.sato[0].x, true);
    satoTick();
    expect(G.sato[0].ruin).toBe(true);
    expect(G.koku).toBeGreaterThan(before + BAL.kokuRegen[0]);
  });

  it("喰うと畏が跳ねる", () => {
    expect(G.awe).toBe(0);
    put(0, G.sato[0].x, true);
    satoTick();
    expect(G.awe).toBeGreaterThanOrEqual(SATO.eatAwe);
  });

  it("廃村は誰の収入にもならない", () => {
    put(0, G.sato[0].x, true);
    satoTick();
    const after = G.koku;
    // 妖を退けて、普通の兵で立ち直しても戻らない
    G.units.length = 0;
    put(0, G.sato[0].x);
    for (let i = 0; i < 120; i++) satoTick();
    // 廃村ぶんの取り分は無い（畏の焼け残りだけが増える）
    expect(G.koku).toBe(after);
    expect(satoHeld(0)).toBe(0);
  });

  it("焼けた土地は畏を残し続ける", () => {
    put(0, G.sato[0].x, true);
    satoTick();
    const justEaten = G.awe;
    G.units.length = 0;
    for (let i = 0; i < 120; i++) satoTick();
    expect(G.awe).toBeGreaterThan(justEaten);
  });

  it("喰えば今が楽になり、あとで討たれる", () => {
    // 一度に入る石高 と、跳ねる畏 の両方が起きるのが要点
    const before = { koku: G.koku, awe: G.awe };
    put(0, G.sato[2].x, true);
    satoTick();
    expect(G.koku).toBeGreaterThan(before.koku);
    expect(G.awe).toBeGreaterThan(before.awe);
    expect(satoRuined()).toBe(1);
  });
});

describe("決定論", () => {
  it("同じ手順なら同じ結果になる", () => {
    const run = (): string => {
      setG(newGame(20260904, 0));
      G.running = true;
      G.koku = 0;
      put(0, G.sato[0].x);
      put(0, G.sato[1].x, true);
      for (let i = 0; i < 300; i++) satoTick();
      return `${G.koku.toFixed(6)}/${G.awe.toFixed(6)}/${satoRuined()}`;
    };
    expect(run()).toBe(run());
  });
});
