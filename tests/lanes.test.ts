/* 道（レーン）── 眠っていた lane を実判定へ起こす。
   いちばん大事なのは「一本道の戦が一切変わらないこと」。 */
import { beforeEach, describe, expect, it } from "vitest";
import { BAL, LIN, linIndex } from "@/data/master";
import { newGame } from "@/sim/game";
import { step } from "@/sim/step";
import { G, addUnit, setG } from "@/sim/state";
import { makeUnit } from "@/sim/unit";

beforeEach(() => setG(newGame(20260904, 0)));

describe("既定は一本道", () => {
  it("balance.lanes は 1", () => {
    expect(BAL.lanes).toBe(1);
  });

  it("既存の戦はすべて一本道のまま", () => {
    for (let i = 0; i < 25; i++) {
      setG(newGame(1, i));
      expect(G.lanes, `戦 ${i + 1}`).toBe(1);
    }
  });

  it("一本道では全員が同じ道に立つ", () => {
    G.running = true;
    for (const L of LIN) {
      const u = makeUnit(0, linIndex(L.id), Math.max(0, L.debut), 100, false);
      expect(u.lane, L.id).toBe(0);
    }
  });
});

describe("道を増やしたとき", () => {
  it("置ける道の指定に従う", () => {
    G.lanes = 2;
    G.running = true;
    // 群れる者は水も行ける。歩む者は陸だけ
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) seen.add(makeUnit(0, linIndex("swarm"), 0, 100, false).lane);
    expect(seen.size, "水へも出るはず").toBeGreaterThan(1);

    for (let i = 0; i < 60; i++) {
      expect(makeUnit(0, linIndex("walk"), 0, 100, false).lane, "歩む者は陸だけ").toBe(0);
    }
  });

  it("道の数を超える指定は無視する", () => {
    G.lanes = 1;
    G.running = true;
    for (let i = 0; i < 30; i++) {
      expect(makeUnit(0, linIndex("swarm"), 0, 100, false).lane).toBe(0);
    }
  });

  it("別の道の敵は狙わないし、塞がれもしない", () => {
    setG(newGame(20260904, 0));
    G.lanes = 2;
    G.running = true;
    const me = makeUnit(0, linIndex("walk"), 0, 300, false);
    me.lane = 0;
    const foe = makeUnit(1, linIndex("walk"), 0, 310, true);
    foe.lane = 1;
    addUnit(me);
    addUnit(foe);
    const hp = foe.hp;
    for (let i = 0; i < 300; i++) step();
    expect(foe.hp, "別の道の敵を殴っている").toBe(hp);
    expect(me.x, "別の道の敵に止められている").toBeGreaterThan(300);
  });

  it("同じ道なら、これまでどおり噛み合う", () => {
    setG(newGame(20260904, 0));
    G.lanes = 2;
    G.running = true;
    const me = makeUnit(0, linIndex("walk"), 0, 300, false);
    const foe = makeUnit(1, linIndex("walk"), 0, 310, true);
    me.lane = foe.lane = 1;
    addUnit(me);
    addUnit(foe);
    const hp = foe.hp;
    for (let i = 0; i < 300; i++) step();
    expect(foe.hp).toBeLessThan(hp);
  });

  it("飛行は道に縛られない ── 本数を変えても振る舞いが変わらない", () => {
    /* 飛行はもともと地上兵と噛み合わない（城だけを狙って飛び越える）。
       ここで見たいのは「道を増やしても、その飛び越えが変わらない」こと。
       空は横の軸ではなく縦の軸なので、道の判定から外してある。 */
    const fly = (lanes: number, foeLane: number): number => {
      setG(newGame(20260904, 0));
      G.lanes = lanes;
      G.running = true;
      const f = makeUnit(0, linIndex("fly"), 3, 300, false);
      f.lane = 0;
      const o = makeUnit(1, linIndex("walk"), 3, 320, true);
      o.lane = foeLane;
      addUnit(f);
      addUnit(o);
      for (let i = 0; i < 200; i++) step();
      return Math.round(f.x);
    };
    const one = fly(1, 0);
    expect(fly(2, 0), "同じ道でも変わらない").toBe(one);
    expect(fly(2, 1), "別の道でも変わらない").toBe(one);
  });

  it("地上兵は道で塞がれ方が変わる", () => {
    // 飛行と対にして、道の判定が地上にだけ効くことを見る
    const ground = (foeLane: number): number => {
      setG(newGame(20260904, 0));
      G.lanes = 2;
      G.running = true;
      const me = makeUnit(0, linIndex("walk"), 0, 300, false);
      me.lane = 0;
      const o = makeUnit(1, linIndex("walk"), 0, 320, true);
      o.lane = foeLane;
      addUnit(me);
      addUnit(o);
      for (let i = 0; i < 200; i++) step();
      return Math.round(me.x);
    };
    expect(ground(1), "別の道なら素通りできる").toBeGreaterThan(ground(0));
  });

  it("乱数は G.rng だけを使う ── 同じ種なら同じ並びになる", () => {
    const run = (): string => {
      setG(newGame(777, 0));
      G.lanes = 3;
      G.running = true;
      return Array.from({ length: 40 }, () => makeUnit(0, linIndex("swarm"), 0, 100, false).lane).join("");
    };
    expect(run()).toBe(run());
  });
});
