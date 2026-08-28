// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  MockImage.instances = [];
  vi.resetModules();
  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("歩む者のPNGスプライト", () => {
  it("六時代ぶんを一度だけ読み込む", async () => {
    const { prepareUnitSprites, WALK_SPRITE_URLS } = await import("@/render/unitSprites");
    expect(WALK_SPRITE_URLS).toHaveLength(6);

    const first = prepareUnitSprites();
    const second = prepareUnitSprites();
    expect(first).toBe(second);
    expect(MockImage.instances).toHaveLength(6);
    for (let era = 0; era < 6; era++) {
      expect(MockImage.instances[era].src).toContain(`walk-era${era}-`);
      MockImage.instances[era].succeed();
    }
    await first;
  });

  it("読み込み前と失敗時は手続き描画へフォールバックする", async () => {
    const { linIndex } = await import("@/data/master");
    const { prepareUnitSprites, tryDrawWalkSprite } = await import("@/render/unitSprites");
    const drawImage = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage,
      filter: "none",
    } as unknown as CanvasRenderingContext2D;
    const unit = {
      lin: linIndex("walk"),
      era: 0,
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
    } as const;

    const loading = prepareUnitSprites();
    expect(tryDrawWalkSprite(context, unit, 1, false)).toBe(false);
    MockImage.instances[0].fail();
    for (const image of MockImage.instances.slice(1)) image.succeed();
    await loading;
    expect(tryDrawWalkSprite(context, unit, 1, false)).toBe(false);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("読み込み後だけ画像を描き、未画像化の系譜には触れない", async () => {
    const { linIndex } = await import("@/data/master");
    const { prepareUnitSprites, tryDrawWalkSprite } = await import("@/render/unitSprites");
    const drawImage = vi.fn();
    let savedFilter = "none";
    const context = {
      filter: "none",
      save(this: { filter: string }): void {
        savedFilter = this.filter;
      },
      restore(this: { filter: string }): void {
        this.filter = savedFilter;
      },
      drawImage,
    } as unknown as CanvasRenderingContext2D;
    const base = {
      era: 0,
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
    } as const;

    const loading = prepareUnitSprites();
    for (const image of MockImage.instances) image.succeed();
    await loading;

    expect(tryDrawWalkSprite(context, { ...base, lin: linIndex("walk") }, 1, true)).toBe(true);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(context.filter).toBe("none");

    expect(tryDrawWalkSprite(context, { ...base, lin: linIndex("throw") }, 1, false)).toBe(false);
    expect(drawImage).toHaveBeenCalledOnce();
  });
});
