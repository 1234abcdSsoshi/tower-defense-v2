import { LIN } from "@/data/master";
import type { Drawable } from "@/sim/types";

/* =====================================================================
   生成済み PNG は Vite の glob import で配布物へ含める。

   画像は必要なユニットが初めて描かれた時だけ読み込む。未読込／失敗時は
   drawUnitAt() が従来の手続き描画へ戻るため、通信やデコード待ちで戦闘を
   止めず、全 82 枚を起動時に展開するメモリ負荷も避けられる。
   ===================================================================== */

const SPRITE_MODULES = import.meta.glob("../assets/units/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const UNIT_SPRITE_URLS = Object.values(SPRITE_MODULES);

type LoadStatus = "idle" | "loading" | "ready" | "failed";

interface SpriteSpec {
  key: string;
  url: string;
  anchorX: number;
  groundY: number;
  status: LoadStatus;
  image?: HTMLImageElement;
  pending?: Promise<void>;
  /** 被弾で白く光らせた版。初めて要ったときに焼いて、以後は使い回す */
  flash?: HTMLCanvasElement;
}

const NORMALIZED_GROUND_Y = 250 / 256;
const LINEAGE_ANCHOR_X: Record<string, number> = {
  walk: 0.44,
  throw: 0.37,
  swarm: 0.48,
  pray: 0.47,
  ride: 0.5,
  snipe: 0.36,
  make: 0.44,
  fly: 0.5,
  siegeH: 0.44,
  rule: 0.48,
  guard: 0.5,
  pbow: 0.37,
  ubow: 0.36,
  hors: 0.5,
  blade: 0.42,
  hex: 0.47,
};

const WALK_ANCHORS = [
  { x: 0.45, y: 0.973 },
  { x: 0.44, y: 0.979 },
  { x: 0.4, y: 0.952 },
  { x: 0.42, y: 0.983 },
  { x: 0.35, y: 0.938 },
  { x: 0.37, y: 0.969 },
] as const;

// 主は通常兵と同じ u.hh を使うと、元の専用描画より過大になる。
const LORD_HEIGHT = [1.45, 1.4, 1.9, 2.7, 2.4, 1.6] as const;
const SPRITES = new Map<string, SpriteSpec>();

function normalKey(id: string, era: number): string {
  return `unit:${id}:${era}`;
}

function registerSprites(): void {
  for (const [path, url] of Object.entries(SPRITE_MODULES)) {
    const filename = path.split("/").pop() || "";
    let match = /^(boss|yokai)-era(\d+)-/.exec(filename);
    if (match) {
      const key = `${match[1]}:${Number(match[2])}`;
      SPRITES.set(key, { key, url, anchorX: 0.5, groundY: NORMALIZED_GROUND_Y, status: "idle" });
      continue;
    }

    match = /^([a-z]+)-era(\d+)-/.exec(filename);
    if (!match) continue;
    const id = match[1] === "siegeh" ? "siegeH" : match[1];
    const era = Number(match[2]);
    const walkAnchor = id === "walk" ? WALK_ANCHORS[era] : null;
    const key = normalKey(id, era);
    SPRITES.set(key, {
      key,
      url,
      anchorX: walkAnchor?.x ?? LINEAGE_ANCHOR_X[id] ?? 0.5,
      groundY: walkAnchor?.y ?? NORMALIZED_GROUND_Y,
      status: "idle",
    });
  }
}

registerSprites();

export const WALK_SPRITE_URLS = Array.from(
  { length: 6 },
  (_, era) => SPRITES.get(normalKey("walk", era))?.url,
).filter((url): url is string => !!url);

const readyListeners = new Set<() => void>();

/** カードなど、静止画を再描画したい呼び出し元へ読込完了を知らせる。 */
export function onUnitSpriteReady(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

function loadSprite(spec: SpriteSpec): Promise<void> {
  if (spec.status === "ready" || spec.status === "failed") return Promise.resolve();
  if (spec.pending) return spec.pending;
  if (typeof Image === "undefined") return Promise.resolve();

  spec.status = "loading";
  spec.pending = new Promise<void>((resolve) => {
    const image = new Image();
    spec.image = image;
    image.decoding = "async";

    const finish = (status: LoadStatus): void => {
      if (spec.status !== "loading") return;
      spec.status = status;
      image.onload = null;
      image.onerror = null;
      resolve();
      if (status === "ready") for (const listener of readyListeners) listener();
    };

    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? "ready" : "failed");
    image.onerror = () => finish("failed");
    image.src = spec.url;

    if (image.complete) {
      queueMicrotask(() => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? "ready" : "failed"));
    }
  });
  return spec.pending;
}

/** 明示的に全画像を先読みしたい配布先向け。通常起動は遅延ロードを使う。 */
export function prepareUnitSprites(): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  return Promise.all(Array.from(SPRITES.values(), loadSprite)).then((): void => undefined);
}

function spriteFor(u: Drawable): SpriteSpec | null {
  if (u.lord) return SPRITES.get(`boss:${u.era}`) || null;
  if (u.mon) return SPRITES.get(`yokai:${u.era}`) || null;
  const id = LIN[u.lin]?.id;
  if (!id || !Number.isInteger(u.era)) return null;
  return SPRITES.get(normalKey(id, u.era)) || null;
}

/**
 * 白く抜いた版を作る（形はそのまま、色だけ真っ白）。
 *
 * 以前はここで ctx.filter = "brightness(0) invert(1)" を掛けていたが、
 * Chromium は filter 付きの描画ごとに別レイヤーを起こして合成するため、
 * 被弾中の兵が数十体並ぶ終盤で目に見えて詰まっていた。
 * 光りかたは兵ごとに変わらないので、一度焼いてしまえばよい。
 *
 * source-in で塗り潰すと元の不透明度がそのまま残る。
 * brightness(0)（真っ黒）→ invert(1)（真っ白）と同じ絵になる。
 */
function flashImage(spec: SpriteSpec): CanvasImageSource | null {
  if (spec.flash) return spec.flash;
  const img = spec.image;
  if (!img || img.naturalWidth <= 0 || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const c2 = cv.getContext("2d");
  if (!c2) return null;
  c2.drawImage(img, 0, 0);
  c2.globalCompositeOperation = "source-in";
  c2.fillStyle = "#ffffff";
  c2.fillRect(0, 0, cv.width, cv.height);
  spec.flash = cv;
  return cv;
}

function drawHeight(u: Drawable, scale: number): number {
  if (u.lord) return 50 * (LORD_HEIGHT[u.era] || 1.8) * scale;
  return 50 * (u.hh || u.w) * scale;
}

/**
 * 読み込み済みの通常兵・主・妖を現在のユニット座標へ描く。
 * false のときだけ呼び出し側は手続き描画へフォールバックする。
 */
export function tryDrawUnitSprite(
  c: CanvasRenderingContext2D,
  u: Drawable,
  scale: number,
  flash: boolean,
  time = 0,
): boolean {
  const spec = spriteFor(u);
  if (!spec) return false;
  if (spec.status === "idle") void loadSprite(spec);

  const image = spec.status === "ready" ? spec.image : null;
  if (!image || image.naturalHeight <= 0) return false;

  const height = drawHeight(u, scale);
  const width = height * (image.naturalWidth / image.naturalHeight);
  c.save();
  if (u.lord && u.tel > 0) c.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(time * 14));
  // 焼いた白抜きが使えなければ、素の絵で描く（光らないだけで盤面は成立する）
  const art = flash ? (flashImage(spec) ?? image) : image;
  c.drawImage(art, -width * spec.anchorX, -height * spec.groundY, width, height);
  c.restore();
  return true;
}
