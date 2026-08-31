// @vitest-environment jsdom
/* 引き継ぎコード ── 別の端末へ進行を運べること、
   壊れたコードで進行が壊れないこと。 */
import { beforeEach, describe, expect, it } from "vitest";
import { SAVE_V } from "@/core/constants";
import { defaultSave, loadSave, SAVE, setSave } from "@/save/save";
import { applyTransferCode, makeTransferCode, peekTransferCode } from "@/save/transfer";

/** 遊び込んだ状態をひとつ作る */
function played() {
  const s = defaultSave();
  s.mag = 1234;
  s.mats = s.mats.map((_, i) => i + 1);
  s.lin.ride.owned = true;
  s.lin.ride.lv = 7;
  s.lin.walk.dup = 3;
  s.team = ["walk", "ride", "pray"];
  s.cleared["12"] = true;
  s.cleared["13"] = true;
  s.best["12"] = { t: 88.5, era: 4 };
  // ゴーストは重い。運ばれないことを見るために積んでおく
  s.ghost["12"] = { seed: 1, log: new Array(400).fill(0), t: 60 } as never;
  return s;
}

beforeEach(() => {
  localStorage.clear();
  loadSave();
});

describe("引き継ぎコード", () => {
  it("発行したコードから、同じ進行が戻る", async () => {
    const src = played();
    const code = await makeTransferCode(src);

    setSave(defaultSave());
    const r = await applyTransferCode(code);

    expect(r.ok).toBe(true);
    expect(SAVE.mag).toBe(1234);
    expect(SAVE.mats).toEqual(src.mats);
    expect(SAVE.lin.ride.lv).toBe(7);
    expect(SAVE.lin.walk.dup).toBe(3);
    expect(SAVE.team).toEqual(["walk", "ride", "pray"]);
    expect(SAVE.cleared["12"]).toBe(true);
    expect(SAVE.best["12"]).toEqual({ t: 88.5, era: 4 });
  });

  it("ゴーストは運ばれず、手元のものが残る", async () => {
    const code = await makeTransferCode(played());
    expect(code).not.toContain("ghost");

    const mine = defaultSave();
    mine.ghost["3"] = { seed: 9, log: [1, 2], t: 10 } as never;
    setSave(mine);

    await applyTransferCode(code);
    expect(SAVE.ghost["12"]).toBeUndefined();
    expect(SAVE.ghost["3"]).toBeDefined();
  });

  it("コードは貼り付けに耐える長さに収まる", async () => {
    const code = await makeTransferCode(played());
    expect(code.length).toBeLessThan(4000);
    expect(code.startsWith("JIDAI-1-")).toBe(true);
    // 貼り付け先を選ばない字だけでできている
    expect(/^[A-Za-z0-9_-]+$/.test(code)).toBe(true);
  });

  it("改行や空白が混ざっても読める", async () => {
    const code = await makeTransferCode(played());
    const messy = "  " + code.slice(0, 20) + "\n" + code.slice(20) + "\n ";
    setSave(defaultSave());
    expect((await applyTransferCode(messy)).ok).toBe(true);
    expect(SAVE.mag).toBe(1234);
  });

  it("壊れたコードでは進行を書き換えない", async () => {
    const before = played();
    setSave(before);

    for (const bad of ["", "こんにちは", "JIDAI-1-g-@@@@", "JIDAI-1-g-" + "A".repeat(40), "JIDAI-9-g-AAAA"]) {
      const r = await applyTransferCode(bad);
      expect(r.ok, bad).toBe(false);
      expect(r.message.length).toBeGreaterThan(0);
      expect(SAVE.mag).toBe(1234);
    }
  });

  it("作り変えられた値は既定へ落ち、盤面は破綻しない", async () => {
    const s = defaultSave();
    // 手で書き換えたコードを模す
    const evil: Record<string, unknown> = { ...s, mag: "たくさん", mats: "全部", lin: null, team: ["まぼろし"], v: SAVE_V };
    const json = new TextEncoder().encode(JSON.stringify(evil));
    let bin = "";
    for (const b of json) bin += String.fromCharCode(b);
    const code = "JIDAI-1-r-" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const r = await applyTransferCode(code);
    expect(r.ok).toBe(true);
    expect(typeof SAVE.mag).toBe("number");
    expect(Array.isArray(SAVE.mats)).toBe(true);
    expect(SAVE.lin.walk).toBeTruthy();
    expect(typeof SAVE.lin.walk.lv).toBe("number");
    // 持っていない兵が編成に混ざったままにはならない
    for (const id of SAVE.team) expect(SAVE.lin[id].owned).toBe(true);
  });

  it("読み込む前に中身を覗ける", async () => {
    const code = await makeTransferCode(played());
    const peek = await peekTransferCode(code);
    expect(peek).toEqual({ cleared: 2, mag: 1234 });
    expect(await peekTransferCode("でたらめ")).toBeNull();
  });
});
