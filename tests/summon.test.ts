import { beforeEach, describe, expect, it } from "vitest";
import { ERAS } from "@/data/master";
import { hurt } from "@/sim/combat";
import { newGame } from "@/sim/game";
import { useSkill } from "@/sim/skills";
import { G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import { yokaiAlive } from "@/sim/summons";
import type { Unit } from "@/sim/types";

/* =====================================================================
   妖は時間では消えない。倒されるまで味方として戦い続ける。

   以前は mon.life（27〜43秒）で勝手に消えていた。
   その名残が master.json やシムに残っていないかを見張る。
   ===================================================================== */

/** era 番の時代で開戦し、妖を呼ぶ */
function summonAt(era: number): Unit {
  setG(newGame(20260830, 0));
  G.running = true;
  G.era = era;
  G.skCd[1] = 0;
  // 技の2枠目が妖（defaultPick は [天災, 妖] の順）
  expect(useSkill(1)).toBe(true);
  const y = yokaiAlive();
  expect(y, "妖が出ていない").toBeTruthy();
  return y;
}

describe("妖の寿命", () => {
  beforeEach(() => setG(null));

  it("マスタに寿命が残っていない", () => {
    for (const E of ERAS) {
      expect(E.skills.you.mon, E.n).toBeDefined();
      expect((E.skills.you.mon as unknown as Record<string, unknown>).life, E.n).toBeUndefined();
    }
  });

  it("説明文が「いなくなる」と言っていない", () => {
    for (const E of ERAS) {
      expect(E.skills.you.d, E.n).not.toMatch(/いなくなる/);
    }
  });

  it("長く置いても消えない（旧設定なら最長43秒で消えていた）", () => {
    const y = summonAt(0);
    for (let i = 0; i < 60 * 200; i++) {
      step();
      if (G.over) break;
      // 敵に削られて倒れるのは別の話なので、体力は満たしておく
      y.hp = y.maxHp;
    }
    expect(y.dead, "時間で消えてしまった").toBe(false);
    expect(yokaiAlive()).toBeTruthy();
  });

  it("体力が尽きれば倒れる", () => {
    const y = summonAt(0);
    hurt(y, y.maxHp * 2);
    step();
    expect(y.dead).toBe(true);
    expect(yokaiAlive()).toBeNull();
  });

  it("倒れたあとは呼び直せる", () => {
    const y = summonAt(0);
    G.skCd[1] = 0;
    // 出ているあいだは重ねて呼べない
    expect(useSkill(1)).toBe(false);
    hurt(y, y.maxHp * 2);
    step();
    G.skCd[1] = 0;
    expect(useSkill(1)).toBe(true);
  });

  it("どの時代の妖も寿命を持たない", () => {
    for (let e = 0; e < ERAS.length; e++) {
      const y = summonAt(e);
      expect((y as unknown as Record<string, unknown>).life, ERAS[e].skills.you.n).toBeUndefined();
    }
  });
});
