import { beforeEach, describe, expect, it } from "vitest";
import { addCorpse } from "@/sim/fx";
import { newGame } from "@/sim/game";
import { G, setG } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import type { Unit } from "@/sim/types";

/* =====================================================================
   死骸は lin / arm だけを写した軽い記録で、mon・lord・art の印は持たない。
   そのため人型でないものの死骸をそのまま描くと、drawUnitAt が
   妖・主の分岐に入れず「系譜0の兵士」として描いてしまう。
   （妖が倒れた瞬間に兵士が現れて倒れる、という別物の絵になっていた）
   ===================================================================== */

const mk = (over: Partial<Unit> = {}): Unit =>
  Object.assign(makeUnit(0, 0, 0, 100), over);

describe("死骸を残すもの / 残さないもの", () => {
  beforeEach(() => {
    setG(newGame(1, 0));
    G.running = true;
  });

  it("ふつうの兵は死骸を残す", () => {
    addCorpse(mk());
    expect(G.corpses).toHaveLength(1);
  });

  it("妖は死骸を残さない", () => {
    addCorpse(mk({ mon: 1, art: "kappa" }));
    expect(G.corpses).toHaveLength(0);
  });

  it("時代の主は死骸を残さない", () => {
    addCorpse(mk({ lord: 1, art: "boar", w: 3.5 }));
    expect(G.corpses).toHaveLength(0);
  });

  it("飛行は死骸を残さない（地面に倒れる絵にならないため）", () => {
    addCorpse(mk({ fly: true }));
    expect(G.corpses).toHaveLength(0);
  });

  it("残した死骸は、描画に要る形がそろっている", () => {
    addCorpse(mk({ x: 123, era: 2 }));
    const k = G.corpses[0];
    for (const key of ["lin", "era", "side", "arm", "x", "w", "hh", "z", "dir", "speed", "st", "age"] as const) {
      expect(k[key], key).not.toBeUndefined();
    }
    expect(k.age).toBe(0);
  });

  it("死骸は上限を超えて溜まらない", () => {
    for (let i = 0; i < 60; i++) addCorpse(mk({ x: i }));
    expect(G.corpses.length).toBeLessThanOrEqual(35);
  });
});
