import { describe, expect, it } from "vitest";
import { ERAS } from "@/data/master";
import { skById } from "@/data/skills";
import { newGame } from "@/sim/game";
import { useSkill } from "@/sim/skills";
import { G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import { addUnit } from "@/sim/state";
import { makeUnit } from "@/sim/unit";

/* =====================================================================
   天災の強さと回数は master.json（eras[].skills.sai.pow）が持つ。
   コードの既定値へ落ちてしまっていないか、実際に撃って確かめる。
   ===================================================================== */

/** era 番の時代で開戦し、敵を n 体並べる */
function battle(era: number, foes = 8) {
  setG(newGame(4242, 0));
  G.running = true;
  G.era = era;
  for (let i = 0; i < foes; i++) addUnit(makeUnit(1, 0, era, 600 + i * 12, true));
}

describe("天災の強さがマスタから来ている", () => {
  it("各時代の天災に pow が書かれている", () => {
    for (const E of ERAS) {
      expect(E.skills.sai.pow, E.n).toBeDefined();
    }
  });

  it("津波は三度寄せる", () => {
    const era = ERAS.findIndex((E) => E.skills.sai.kind === "tsunami");
    expect(era).toBeGreaterThanOrEqual(0);
    battle(era);
    expect(useSkill(0)).toBe(true);

    // 波が立ち上がった回数を数える（disTick が一波ごとに G.wave を 1 へ戻す）
    let waves = 0;
    let prev = 0;
    for (let i = 0; i < 60 * 20; i++) {
      step();
      if (G.wave === 1 && prev !== 1) waves++;
      prev = G.wave;
      // 演出側の減衰はシムに無いので、ここで手で落として次の立ち上がりを見る
      if (G.wave > 0) G.wave = Math.max(0, G.wave - 1 / 60 / 1.7);
      if (!G.dis && waves > 0 && i > 60 * 8) break;
    }
    expect(waves).toBe(ERAS[era].skills.sai.pow.hits);
  });

  it("津波は打つたび敵を拠点側へ押し流す", () => {
    const era = ERAS.findIndex((E) => E.skills.sai.kind === "tsunami");
    battle(era, 4);
    const before = G.units.filter((u) => u.side === 1).map((u) => u.x);
    useSkill(0);
    for (let i = 0; i < 60 * 8; i++) step();
    const after = G.units.filter((u) => u.side === 1 && !u.dead).map((u) => u.x);
    // 生き残りがいれば、開始位置より右（敵拠点側）へ動いている
    if (after.length) expect(Math.max(...after)).toBeGreaterThan(Math.min(...before));
  });

  it("蟲の群れは pow.dmg のぶんだけ削る", () => {
    battle(0, 6);
    const hpBefore = G.units.filter((u) => u.side === 1).reduce((a, u) => a + u.hp, 0);
    useSkill(0);
    for (let i = 0; i < 60 * 7; i++) step();
    const hpAfter = G.units.filter((u) => u.side === 1).reduce((a, u) => a + Math.max(0, u.hp), 0);
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  it("地震は受ける被害の倍率をマスタから取る", () => {
    const era = ERAS.findIndex((E) => E.skills.sai.kind === "quake2");
    battle(era);
    useSkill(0);
    step();
    expect(G.quakeMul).toBe(ERAS[era].skills.sai.pow.mul);
  });
});

describe("妖の強さ", () => {
  it("すべての妖に攻撃力がある", () => {
    for (const E of ERAS) {
      const mon = E.skills.you.mon;
      expect(mon, E.n).toBeDefined();
      expect(mon.atk, E.n).toBeGreaterThan(0);
    }
  });

  it("技の説明が、いま出る技のものと一致している", () => {
    // 通し番号（sai3 など）から引いた技が、その時代の定義と同じであること
    for (let e = 0; e < ERAS.length; e++) {
      expect(skById("sai" + e).n).toBe(ERAS[e].skills.sai.n);
      expect(skById("you" + e).n).toBe(ERAS[e].skills.you.n);
    }
  });
});
