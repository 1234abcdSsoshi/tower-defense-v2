// @vitest-environment jsdom
/* 作り手のアカウント ── 全ての駒と全ての戦を使える。 */
import { beforeEach, describe, expect, it } from "vitest";
import { LIN, MASTER_STAGES } from "@/data/master";
import { grantAllLineages, loadSave, SAVE, setAllStages, stageOpen } from "@/save/save";

beforeEach(() => {
  localStorage.clear();
  loadSave();
  setAllStages(false);
});

describe("戦の鍵", () => {
  it("ふだんは、前の戦を突破するまで開かない", () => {
    const second = MASTER_STAGES[1];
    expect(second.needs, "二戦目に前提が無い").toBeTruthy();
    expect(stageOpen(second.needs)).toBe(false);
    SAVE.cleared[second.needs] = true;
    expect(stageOpen(second.needs)).toBe(true);
  });

  it("前提の無い戦は、いつでも開いている", () => {
    expect(stageOpen(undefined)).toBe(true);
    expect(stageOpen(MASTER_STAGES[0].needs)).toBe(true);
  });

  it("立場が立つと、全部の戦が開く", () => {
    setAllStages(true);
    for (const st of MASTER_STAGES) {
      expect(stageOpen(st.needs), st.name).toBe(true);
    }
  });

  it("立場を降ろせば、また閉じる", () => {
    setAllStages(true);
    setAllStages(false);
    expect(stageOpen(MASTER_STAGES[1].needs)).toBe(false);
  });

  it("突破の記録は書き換えない ── 突破数が水増しされない", () => {
    setAllStages(true);
    expect(Object.keys(SAVE.cleared).length, "cleared を立てている").toBe(0);
  });
});

describe("駒の解放", () => {
  it("全部の系譜を所持にする", () => {
    const before = LIN.filter((L) => SAVE.lin[L.id].owned).length;
    expect(before).toBeLessThan(LIN.length);
    expect(grantAllLineages()).toBe(true);
    for (const L of LIN) expect(SAVE.lin[L.id].owned, L.id).toBe(true);
  });

  it("二度目は何も変えない", () => {
    grantAllLineages();
    expect(grantAllLineages(), "毎回保存を呼ぶことになる").toBe(false);
  });

  it("レベルや重複は触らない", () => {
    SAVE.lin.walk.lv = 7;
    SAVE.lin.walk.dup = 3;
    grantAllLineages();
    expect(SAVE.lin.walk.lv).toBe(7);
    expect(SAVE.lin.walk.dup).toBe(3);
  });

  it("保存データに書き込む ── 見かけだけの解放にしない", () => {
    // normalizeSave が編成を「所持しているか」で検証するので、
    // 見かけだけ解放すると、引き継ぎや預け入れを一往復した拍子に編成が捨てられる
    grantAllLineages();
    const raw = JSON.parse(JSON.stringify(SAVE));
    for (const L of LIN) expect(raw.lin[L.id].owned, L.id).toBe(true);
  });
});
