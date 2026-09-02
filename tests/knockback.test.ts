import { beforeEach, describe, expect, it } from "vitest";
import { BAL, linIndex } from "@/data/master";
import { applyKnockback } from "@/sim/combat";
import { newGame } from "@/sim/game";
import { G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import { summonYokai } from "@/sim/summons";
import { makeUnit } from "@/sim/unit";

function quietBattle(): void {
  setG(newGame(9321, 0));
  G.running = true;
  G.bBlack = 999;
  G.bossT = 999;
  G.foeStart = 999;
}

describe("通常攻撃のノックバック", () => {
  beforeEach(quietBattle);

  it("味方の攻撃は敵を敵拠点側へ押す", () => {
    const attacker = makeUnit(0, linIndex("walk"), 0, 100);
    const target = makeUnit(1, linIndex("walk"), 0, 121, true);
    attacker.cd = 0;
    attacker.speed = 0;
    target.speed = 0;
    target.range = 0;
    G.units.push(attacker, target);

    const before = target.x;
    step();

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.x).toBeGreaterThan(before);
  });

  it("敵の攻撃は味方を自拠点側へ押す", () => {
    const target = makeUnit(0, linIndex("walk"), 0, 179);
    const attacker = makeUnit(1, linIndex("walk"), 0, 200, true);
    target.speed = 0;
    target.range = 0;
    attacker.cd = 0;
    attacker.speed = 0;
    G.units.push(target, attacker);

    const before = target.x;
    step();

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.x).toBeLessThan(before);
  });

  it("ノックバック無効の盾兵は動かない", () => {
    const attacker = makeUnit(0, linIndex("walk"), 0, 100);
    const guard = makeUnit(1, linIndex("guard"), 0, 121, true);
    const before = guard.x;

    expect(guard.noKnock).toBe(true);
    expect(applyKnockback(guard, attacker)).toBe(0);
    expect(guard.x).toBe(before);
  });

  it("一時耐性中の味方は敵から押されない", () => {
    const ally = makeUnit(0, linIndex("walk"), 0, 100);
    const enemy = makeUnit(1, linIndex("walk"), 0, 121, true);
    G.bNoKnock = 3;

    expect(applyKnockback(ally, enemy)).toBe(0);
    expect(ally.x).toBe(100);
  });

  it("河童の平手打ちは通常分と重ならず固有の距離だけ押す", () => {
    const kappa = summonYokai(0, 1);
    kappa.x = 100;
    kappa.cd = 0;
    const target = makeUnit(1, linIndex("walk"), 0, 120, true);
    target.speed = 0;
    target.range = 0;
    G.units.push(target);

    const before = target.x;
    step();

    expect(target.x - before).toBe(40);
  });

  it("範囲攻撃は着弾地点を中心に判定し、巻き込んだ敵も弱く押す", () => {
    const caster = makeUnit(0, linIndex("pray"), 0, 160);
    caster.cd = 0;
    caster.speed = 0;
    const primary = makeUnit(1, linIndex("walk"), 0, 180, true);
    const splash = makeUnit(1, linIndex("walk"), 0, 147, true);
    for (const unit of [primary, splash]) {
      unit.speed = 0;
      unit.range = 0;
    }
    G.units.push(caster, primary, splash);

    const splashHp = splash.hp,
      splashX = splash.x;
    step();

    expect(splash.hp).toBeLessThan(splashHp);
    expect(splash.x).toBeGreaterThan(splashX);
  });

  it("飛行兵の投射攻撃は近接攻撃より弱く押す", () => {
    const melee = makeUnit(0, linIndex("walk"), 0, 100);
    const flyer = makeUnit(0, linIndex("fly"), 3, 100);
    const meleeTarget = makeUnit(1, linIndex("walk"), 0, 300, true);
    const flyingTarget = makeUnit(1, linIndex("walk"), 0, 300, true);

    const meleeMove = applyKnockback(meleeTarget, melee),
      flyingMove = applyKnockback(flyingTarget, flyer);
    expect(flyingMove).toBeGreaterThan(0);
    expect(flyingMove).toBeLessThan(meleeMove);
  });

  it("戦場の両端より外へ押し出さない", () => {
    const ally = makeUnit(0, linIndex("walk"), 0, BAL.laneR - 24);
    const foeAtRight = makeUnit(1, linIndex("walk"), 0, BAL.laneR - 9, true);

    applyKnockback(foeAtRight, ally, 99);
    expect(foeAtRight.x).toBe(BAL.laneR - 8);

    const allyAtLeft = makeUnit(0, linIndex("walk"), 0, BAL.laneL + 7);
    const foe = makeUnit(1, linIndex("walk"), 0, BAL.laneL + 24, true);
    applyKnockback(allyAtLeft, foe, 99);
    expect(allyAtLeft.x).toBe(BAL.laneL + 6);
  });
});
