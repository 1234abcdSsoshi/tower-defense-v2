// @vitest-environment jsdom
/* 戦の進みかた ── 突破すると次が開き、結果画面からそのまま進めること。 */
import { beforeEach, describe, expect, it } from "vitest";
import { MASTER_STAGES } from "@/data/master";
import { loadSave, SAVE } from "@/save/save";
import { nextStageIndex } from "@/ui/stage";

beforeEach(() => {
  localStorage.clear();
  loadSave();
});

describe("戦の解放", () => {
  it("最初の戦は前提を持たない", () => {
    expect(MASTER_STAGES[0].needs).toBeFalsy();
  });

  it("突破するまで、次は開かない", () => {
    // s01 を突破していないので、s02 を前提とする番号は返らない
    expect(nextStageIndex(0)).toBe(-1);
  });

  it("突破すると次が開く", () => {
    SAVE.cleared[MASTER_STAGES[0].id] = true;
    expect(nextStageIndex(0)).toBe(1);
  });

  it("最後の戦の次は無い", () => {
    for (const st of MASTER_STAGES) SAVE.cleared[st.id] = true;
    expect(nextStageIndex(MASTER_STAGES.length - 1)).toBe(-1);
  });

  it("順に突破していけば、最後まで途切れない", () => {
    // 「クリアしたら次へ」を端から端まで辿る。
    // どこかで前提が食い違っていると、ここで止まる
    let at = 0;
    const seen = [0];
    for (;;) {
      SAVE.cleared[MASTER_STAGES[at].id] = true;
      const next = nextStageIndex(at);
      if (next < 0) break;
      expect(next, "同じ戦へ戻っている").toBeGreaterThan(at);
      seen.push(next);
      at = next;
    }
    expect(seen.length, "途中で行き止まりになった").toBe(MASTER_STAGES.length);
    expect(at).toBe(MASTER_STAGES.length - 1);
  });

  it("前提を飛ばした戦は返さない", () => {
    // s01 だけ突破。s03 は s02 を要るので、0 の次は 1 まで
    SAVE.cleared[MASTER_STAGES[0].id] = true;
    expect(nextStageIndex(1)).toBe(-1);
  });
});
