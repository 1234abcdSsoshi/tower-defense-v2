import { describe, expect, it } from "vitest";
import { AFFM, ARMS, BAL, ERAS, LIN, MASTER_STAGES, META, NE, civ } from "@/data/master";
import { SKILL_ALL, defaultPick } from "@/data/skills";

/* マスタは運営が触る。型はビルド時に消えるので、
   「参照が壊れていないか」はここで実データに対して確かめる。 */
describe("マスタデータの整合", () => {
  it("時代の数がそろっている", () => {
    expect(ERAS.length).toBe(NE);
    expect(NE).toBeGreaterThanOrEqual(3);
  });

  it("時代ごとの配列が時代数と一致する", () => {
    for (const key of ["statMul", "costMul", "kokuMax", "kokuRegen", "fumiNeed"] as const) {
      expect(BAL[key], `balance.${key}`).toHaveLength(NE);
    }
  });

  it("系譜の forms が全時代ぶんある", () => {
    for (const L of LIN) expect(L.forms, L.id).toHaveLength(NE);
  });

  it("系譜の兵科が arms 表に載っている", () => {
    for (const L of LIN) expect(ARMS[L.arm], L.id).toBeTruthy();
  });

  it("系譜の debut が時代の範囲に収まっている", () => {
    for (const L of LIN) {
      expect(L.debut, L.id).toBeGreaterThanOrEqual(0);
      expect(L.debut, L.id).toBeLessThan(NE);
    }
  });

  it("ステージの foePool が実在する系譜を指している", () => {
    for (const st of MASTER_STAGES)
      for (const p of st.foePool) {
        expect(p.lin, `${st.id} -> lin ${p.lin}`).toBeGreaterThanOrEqual(0);
        expect(p.lin, `${st.id} -> lin ${p.lin}`).toBeLessThan(LIN.length);
      }
  });

  it("ステージの報酬が時代数ぶんの素材を持つ", () => {
    for (const st of MASTER_STAGES) expect(st.reward.mat, st.id).toHaveLength(NE);
  });

  it("ステージ id が重複していない", () => {
    const ids = MASTER_STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("初期所持の系譜が実在する", () => {
    const ids = new Set(LIN.map((l) => l.id));
    for (const id of META.startOwned) expect(ids.has(id), id).toBe(true);
  });

  it("編成枠に初期所持だけで足りる", () => {
    expect(META.startOwned.length).toBeGreaterThanOrEqual(1);
    expect(META.teamSize).toBeGreaterThanOrEqual(1);
  });

  it("大物に使う系譜が実在する", () => {
    expect(BAL.foeBoss).toBeGreaterThanOrEqual(0);
    expect(BAL.foeBoss).toBeLessThan(LIN.length);
  });

  it("時代の主の系譜が実在する", () => {
    const ids = new Set(LIN.map((l) => l.id));
    for (const E of ERAS) expect(ids.has(E.hero.lin), E.hero.lin).toBe(true);
  });

  it("技は時代ごとに二系統ぶんそろっている", () => {
    expect(SKILL_ALL.length).toBe(NE * 2);
    for (const row of defaultPick()) expect(row).toHaveLength(2);
  });

  it("文明効果が時代を追って積み上がる", () => {
    for (let e = 1; e < NE; e++) {
      expect(civ(e).kokuMax).toBeGreaterThanOrEqual(civ(e - 1).kokuMax);
      expect(civ(e).hp).toBeGreaterThanOrEqual(civ(e - 1).hp);
    }
  });
});

describe("兵科の相性", () => {
  it("三すくみが一周する（歩兵→弓→騎馬→歩兵）", () => {
    expect(AFFM.foot.archer).toBeGreaterThan(1);
    expect(AFFM.archer.cavalry).toBeGreaterThan(1);
    expect(AFFM.cavalry.foot).toBeGreaterThan(1);
  });

  it("有利の裏は必ず不利になっている", () => {
    expect(AFFM.archer.foot).toBeLessThan(1);
    expect(AFFM.cavalry.archer).toBeLessThan(1);
    expect(AFFM.foot.cavalry).toBeLessThan(1);
  });

  it("飛行に届くのは弓だけ", () => {
    expect(AFFM.archer.air).toBeGreaterThan(1);
  });
});
