import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/core/rng";

/* 乱数が決まった並びを返すことは、このゲームの再現性そのもの。
   実装を差し替えたら、過去のゴーストがすべて無効になる。 */
describe("mulberry32", () => {
  it("同じ種からは同じ並びが出る", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("違う種からは違う並びが出る", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const same = Array.from({ length: 20 }, () => a() === b()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it("0以上1未満に収まる", () => {
    const r = mulberry32(999);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("既知の並びを返す（実装を変えたらゴーストが無効になる）", () => {
    const r = mulberry32(12345);
    const got = [r(), r(), r()].map((v) => Math.round(v * 1e9));
    expect(got).toMatchInlineSnapshot(`
      [
        979728268,
        306752264,
        484205422,
      ]
    `);
  });
});
