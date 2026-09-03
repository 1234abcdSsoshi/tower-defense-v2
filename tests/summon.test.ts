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

  it("間隔さえ明ければ、出ているあいだでも重ねて呼べる", () => {
    const first = summonAt(0);
    G.skCd[1] = 0;
    // 一体目が健在でも二体目を呼べる
    expect(useSkill(1), "重ねて呼べなかった").toBe(true);
    const live = G.units.filter((u) => u.mon && u.side === 0 && !u.dead);
    expect(live.length, "二体並んでいない").toBe(2);
    expect(first.dead).toBe(false);
  });

  it("間隔が残っているあいだは呼べない", () => {
    summonAt(0);
    // 縛りは同時数ではなく間隔。技を使った直後は必ず塞がっている
    expect(G.skCd[1]).toBeGreaterThan(0);
    expect(useSkill(1)).toBe(false);
  });

  it("何体でも並べられる", () => {
    summonAt(0); // 一体目。ここで盤面も整う
    for (let i = 2; i <= 5; i++) {
      G.skCd[1] = 0;
      expect(useSkill(1), `${i}体目`).toBe(true);
    }
    const live = G.units.filter((u) => u.mon && u.side === 0 && !u.dead);
    expect(live.length).toBe(5);
  });

  it("倒れたあとも呼び直せる", () => {
    const y = summonAt(0);
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
