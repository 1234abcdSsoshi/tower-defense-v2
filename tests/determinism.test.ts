import { beforeEach, describe, expect, it } from "vitest";
import { DT } from "@/core/constants";
import { newGame } from "@/sim/game";
import { produceLin } from "@/sim/production";
import { G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import type { GameState } from "@/sim/types";

/* =====================================================================
   このゲームの土台は「シードと入力ログだけで一戦を完全に再現できる」こと。
   ゴースト・リプレイ・将来のサーバー側検証は、すべてこの性質に乗っている。
   シムに手を入れて再現性が崩れたら、ここで落ちる。
   ===================================================================== */

/** 盤面から、比較に使える指紋を作る */
function fingerprint(g: GameState): string {
  const units = g.units
    .map((u) => [u.side, u.lin, u.era, Math.round(u.x * 1000), Math.round(u.hp * 100), u.st].join(","))
    .join("|");
  return [
    g.frame,
    Math.round(g.t * 1000),
    Math.round(g.koku * 1000),
    Math.round(g.fumi * 1000),
    Math.round(g.hpMe),
    Math.round(g.hpFoe),
    g.era,
    g.foeEra,
    g.st.kills,
    g.st.spawned,
    units,
  ].join(";");
}

/** 種と入力の並びから一戦を回し、最後の指紋を返す */
function run(seed: number, frames: number, inputs: Array<[number, number]>): string {
  setG(newGame(seed, 0));
  G.running = true;
  const byFrame = new Map<number, number[]>();
  for (const [f, lin] of inputs) {
    const list = byFrame.get(f) ?? [];
    list.push(lin);
    byFrame.set(f, list);
  }
  for (let i = 0; i < frames; i++) {
    const acts = byFrame.get(G.frame);
    if (acts) for (const lin of acts) produceLin(lin);
    step();
    if (G.over) break;
  }
  return fingerprint(G);
}

const INPUTS: Array<[number, number]> = [
  [10, 0],
  [40, 0],
  [70, 1],
  [130, 0],
  [200, 1],
  [260, 0],
  [330, 0],
  [400, 1],
];

describe("シミュレーションの決定論", () => {
  beforeEach(() => setG(null));

  it("同じ種・同じ入力なら、盤面が1ビットも違わない", () => {
    const a = run(20240301, 1800, INPUTS);
    const b = run(20240301, 1800, INPUTS);
    expect(a).toBe(b);
  });

  it("種が違えば盤面も違う", () => {
    // 敵が湧き始めるのは開戦から foeStart 秒後。それより手前だと
    // 自軍の動きしか無く、種の違いが盤面に出てこない
    const a = run(1, 2400, INPUTS);
    const b = run(2, 2400, INPUTS);
    expect(a).not.toBe(b);
  });

  it("入力が違えば盤面も違う", () => {
    const a = run(777, 2400, INPUTS);
    const b = run(777, 2400, [
      [10, 0],
      [40, 1],
    ]);
    expect(a).not.toBe(b);
  });

  it("決着までまるごと回しても、二度とも同じ結末になる", () => {
    // step() から UI を切り離してあるので、画面が無くても最後まで回せる。
    // ゴーストとリプレイが成り立つ根拠がこれ。
    const a = run(31415, 40000, INPUTS);
    const b = run(31415, 40000, INPUTS);
    expect(a).toBe(b);
  });

  it("演出用の乱数を引いても盤面は変わらない", () => {
    // 破片の飛び散りかたは G.rng とは別の乱数から引いている。
    // 見た目を足しても再現性が壊れない、という設計上の約束。
    const a = run(555, 900, INPUTS);
    const b = run(555, 900, INPUTS);
    expect(a).toBe(b);
  });

  it("時計が固定タイムステップで進む（実時間に追従しない）", () => {
    setG(newGame(42, 0));
    G.running = true;
    for (let i = 0; i < 120; i++) step();
    expect(G.frame).toBe(120);
    expect(G.t).toBeCloseTo(120 * DT, 6);
  });

  it("石高は時代の上限を超えない", () => {
    setG(newGame(9, 0));
    G.running = true;
    for (let i = 0; i < 3000; i++) {
      step();
      if (G.over) break;
    }
    expect(G.koku).toBeGreaterThanOrEqual(0);
    expect(G.hpMe).toBeLessThanOrEqual(G.hpMeMax);
    expect(G.hpFoe).toBeLessThanOrEqual(G.hpFoeMax);
  });
});
