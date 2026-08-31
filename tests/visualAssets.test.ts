import { describe, expect, it } from "vitest";
import { BACKGROUND_URLS, CASTLE_URLS, FOREGROUND_URLS } from "@/render/scenerySprites";
import { DISASTER_URLS, EFFECT_URLS, PROJECTILE_URLS } from "@/render/effectSprites";
import { SKILL_SPRITE_URLS, skillSpriteUrl } from "@/render/skillSprites";
import { castleGrowth } from "@/render/castle";

describe("背景・拠点・技のPNG素材", () => {
  it("六時代ぶんの背景と拠点が重複なく登録される", () => {
    expect(BACKGROUND_URLS).toHaveLength(6);
    expect(CASTLE_URLS).toHaveLength(6);
    expect(FOREGROUND_URLS).toHaveLength(6);
    expect(new Set(BACKGROUND_URLS).size).toBe(6);
    expect(new Set(CASTLE_URLS).size).toBe(6);
    expect(new Set(FOREGROUND_URLS).size).toBe(6);
  });

  it("飛び道具と戦闘エフェクトが個別のPNGとして登録される", () => {
    expect(PROJECTILE_URLS).toHaveLength(7);
    expect(EFFECT_URLS).toHaveLength(6);
    expect(new Set(PROJECTILE_URLS).size).toBe(7);
    expect(new Set(EFFECT_URLS).size).toBe(6);
  });

  it("六種類の天災エフェクトが透過PNGとして登録される", () => {
    expect(DISASTER_URLS).toHaveLength(6);
    expect(new Set(DISASTER_URLS).size).toBe(6);
  });

  it("二系統×六時代の技アイコンを参照できる", () => {
    expect(SKILL_SPRITE_URLS).toHaveLength(12);
    expect(new Set(SKILL_SPRITE_URLS).size).toBe(12);
    for (let era = 0; era < 6; era++) {
      expect(skillSpriteUrl(`sai${era}`)).toMatch(/sai\d/);
      expect(skillSpriteUrl(`you${era}`)).toMatch(/you\d/);
    }
  });

  it("進化するたび拠点が単調に大きくなる", () => {
    const sizes = Array.from({ length: 6 }, (_, era) => castleGrowth(era));
    expect(sizes[0]).toBe(1);
    expect(sizes[5]).toBeCloseTo(1.4);
    for (let era = 1; era < sizes.length; era++) expect(sizes[era]).toBeGreaterThan(sizes[era - 1]);
  });
});
