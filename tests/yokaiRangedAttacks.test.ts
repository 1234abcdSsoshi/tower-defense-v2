import { beforeEach, describe, expect, it } from "vitest";
import { linIndex } from "@/data/master";
import { newGame } from "@/sim/game";
import { addUnit, G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import { summonYokai } from "@/sim/summons";
import { makeUnit } from "@/sim/unit";

function quietBattle(): void {
  setG(newGame(81723, 0));
  G.running = true;
  G.bBlack = 999;
  G.bossT = 999;
  G.foeStart = 999;
}

function enemyAt(x: number) {
  const enemy = makeUnit(1, linIndex("walk"), 1, x, false);
  enemy.speed = 0;
  enemy.range = 0;
  return addUnit(enemy);
}

describe("妖怪の遠距離攻撃", () => {
  beforeEach(() => setG(null));

  it("八岐大蛇は七つの頭から七発の火球を放つ", () => {
    quietBattle();
    const orochi = summonYokai(5, 1);
    orochi.x = 100;
    orochi.cd = 0;
    enemyAt(220);
    enemyAt(245);
    enemyAt(270);

    step();

    expect(orochi.heads).toBe(7);
    expect(orochi.range).toBe(190);
    expect(G.shots.filter((shot) => shot.kind === "fireball")).toHaveLength(7);
    expect(new Set(G.shots.map((shot) => shot.y0)).size).toBe(7);
    expect(new Set(G.shots.map((shot) => shot.x1)).size).toBeGreaterThan(1);
  });

  it("大蛇は毒弾で広範囲の敵を攻撃し全員を弱体化する", () => {
    quietBattle();
    const serpent = summonYokai(1, 1);
    serpent.x = 100;
    serpent.cd = 0;
    const near = enemyAt(220);
    const splash = enemyAt(270);
    const outside = enemyAt(360);
    const hpNear = near.hp;
    const hpSplash = splash.hp;

    step();

    expect(serpent.range).toBe(180);
    expect(serpent.aoe).toBe(82);
    expect(G.shots.filter((shot) => shot.kind === "venom")).toHaveLength(1);
    expect(near.hp).toBeLessThan(hpNear);
    expect(splash.hp).toBeLessThan(hpSplash);
    expect(near.curse).toBeGreaterThan(0);
    expect(splash.curse).toBeGreaterThan(0);
    expect(outside.curse || 0).toBe(0);
  });
});
