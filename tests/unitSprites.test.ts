// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawable } from "@/sim/types";

class MockImage {
  static instances: MockImage[] = [];

  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  decoding = "auto";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private value = "";

  constructor() {
    MockImage.instances.push(this);
  }

  get src(): string {
    return this.value;
  }

  set src(value: string) {
    this.value = value;
  }

  succeed(width = 256, height = 256): void {
    this.complete = true;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload?.();
  }

  fail(): void {
    this.complete = true;
    this.onerror?.();
  }
}

function unit(lin: number, era: number, extra: Partial<Drawable> = {}): Drawable {
  return {
    lin,
    era,
    side: 0,
    arm: "foot",
    x: 0,
    w: 1,
    hh: 1,
    z: 0,
    dir: 1,
    speed: 1,
    st: "idle",
    flash: 0,
    hitFx: 0,
    atkA: 0,
    ...extra,
  } as Drawable;
}

function drawingContext(): { context: CanvasRenderingContext2D; drawImage: ReturnType<typeof vi.fn> } {
  const drawImage = vi.fn();
  const stack: Array<{ filter: string; globalAlpha: number }> = [];
  const context = {
    filter: "none",
    globalAlpha: 1,
    save(this: { filter: string; globalAlpha: number }): void {
      stack.push({ filter: this.filter, globalAlpha: this.globalAlpha });
    },
    restore(this: { filter: string; globalAlpha: number }): void {
      const state = stack.pop();
      if (!state) return;
      this.filter = state.filter;
      this.globalAlpha = state.globalAlpha;
    },
    drawImage,
  } as unknown as CanvasRenderingContext2D;
  return { context, drawImage };
}

beforeEach(() => {
  MockImage.instances = [];
  vi.resetModules();
  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("全キャラクターのPNGスプライト", () => {
  it("通常70フォーム・主6体・妖6体を一度だけ先読みできる", async () => {
    const { prepareUnitSprites, UNIT_SPRITE_URLS, WALK_SPRITE_URLS } = await import("@/render/unitSprites");
    expect(UNIT_SPRITE_URLS).toHaveLength(82);
    expect(new Set(UNIT_SPRITE_URLS).size).toBe(82);
    expect(WALK_SPRITE_URLS).toHaveLength(6);

    const loading = prepareUnitSprites();
    expect(MockImage.instances).toHaveLength(82);
    for (const image of MockImage.instances) image.succeed();
    await loading;

    await prepareUnitSprites();
    expect(MockImage.instances).toHaveLength(82);
  });

  it("必要になった画像だけ遅延読込し、完了後に再描画を通知する", async () => {
    const { linIndex } = await import("@/data/master");
    const { onUnitSpriteReady, tryDrawUnitSprite } = await import("@/render/unitSprites");
    const { context, drawImage } = drawingContext();
    const ready = vi.fn();
    onUnitSpriteReady(ready);
    const archer = unit(linIndex("throw"), 3, { arm: "archer" });

    expect(tryDrawUnitSprite(context, archer, 1, false)).toBe(false);
    expect(MockImage.instances).toHaveLength(1);
    expect(MockImage.instances[0].src).toContain("throw-era3-fire-arrow");

    MockImage.instances[0].succeed(320, 256);
    expect(ready).toHaveBeenCalledOnce();
    expect(tryDrawUnitSprite(context, archer, 1, true)).toBe(true);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(context.filter).toBe("none");
  });

  it("読込失敗時は手続き描画へフォールバックし続ける", async () => {
    const { linIndex } = await import("@/data/master");
    const { tryDrawUnitSprite } = await import("@/render/unitSprites");
    const { context, drawImage } = drawingContext();
    const defender = unit(linIndex("guard"), 2);

    expect(tryDrawUnitSprite(context, defender, 1, false)).toBe(false);
    MockImage.instances[0].fail();
    expect(tryDrawUnitSprite(context, defender, 1, false)).toBe(false);
    expect(MockImage.instances).toHaveLength(1);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("時代の主と召喚妖には専用画像を選ぶ", async () => {
    const { linIndex } = await import("@/data/master");
    const { tryDrawUnitSprite } = await import("@/render/unitSprites");
    const { context, drawImage } = drawingContext();
    const lord = unit(linIndex("siegeH"), 4, { lord: 1, w: 6.7, hh: 3.1 });
    const yokai = unit(linIndex("walk"), 5, { mon: 1, w: 4.1, hh: 3.4 });

    expect(tryDrawUnitSprite(context, lord, 1, false)).toBe(false);
    expect(MockImage.instances[0].src).toContain("boss-era4-armored-train");
    MockImage.instances[0].succeed(420, 256);
    expect(tryDrawUnitSprite(context, lord, 1, false)).toBe(true);

    expect(tryDrawUnitSprite(context, yokai, 1, false)).toBe(false);
    expect(MockImage.instances[1].src).toContain("yokai-era5-yamata-no-orochi");
    MockImage.instances[1].succeed(380, 256);
    expect(tryDrawUnitSprite(context, yokai, 1, false)).toBe(true);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(context.globalAlpha).toBe(1);
  });
});
