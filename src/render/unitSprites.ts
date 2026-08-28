import walkEra0Url from "@/assets/units/walk-era0-stone-bearer.png?url";
import walkEra1Url from "@/assets/units/walk-era1-guard.png?url";
import walkEra2Url from "@/assets/units/walk-era2-foot-samurai.png?url";
import walkEra3Url from "@/assets/units/walk-era3-firefighter.png?url";
import walkEra4Url from "@/assets/units/walk-era4-infantry.png?url";
import walkEra5Url from "@/assets/units/walk-era5-autonomous-armor.png?url";
import { LIN } from "@/data/master";
import type { Drawable } from "@/sim/types";

/* =====================================================================
   PNG が用意できた系譜だけを、時代ごとに一度読み込んで全ユニットで共有する。

   読み込み前／失敗時は drawUnitAt() が従来の手続き描画へ戻るため、
   通信やデコードの成否がゲーム進行を止めることはない。
   ===================================================================== */

export const WALK_SPRITE_URLS = [
  walkEra0Url,
  walkEra1Url,
  walkEra2Url,
  walkEra3Url,
  walkEra4Url,
  walkEra5Url,
] as const;

type LoadStatus = "idle" | "loading" | "ready" | "failed";

interface SpriteSpec {
  url: string;
  /** 実行用 PNG の横 / 縦。ロード前から配置を確定させるため固定値で持つ */
  aspect: number;
  /** 画像幅のうち、ユニット座標（両足の中心）より左にある割合 */
  anchorX: number;
  /** 画像高のうち、接地線より上にある割合 */
  groundY: number;
  status: LoadStatus;
  image?: HTMLImageElement;
  pending?: Promise<void>;
}

const WALK_SPRITES: SpriteSpec[] = [
  { url: WALK_SPRITE_URLS[0], aspect: 250 / 256, anchorX: 0.45, groundY: 0.973, status: "idle" },
  { url: WALK_SPRITE_URLS[1], aspect: 1, anchorX: 0.44, groundY: 0.979, status: "idle" },
  { url: WALK_SPRITE_URLS[2], aspect: 246 / 256, anchorX: 0.4, groundY: 0.952, status: "idle" },
  { url: WALK_SPRITE_URLS[3], aspect: 246 / 256, anchorX: 0.42, groundY: 0.983, status: "idle" },
  { url: WALK_SPRITE_URLS[4], aspect: 1, anchorX: 0.35, groundY: 0.938, status: "idle" },
  { url: WALK_SPRITE_URLS[5], aspect: 341 / 256, anchorX: 0.37, groundY: 0.969, status: "idle" },
];

let preparing: Promise<void> = null;

function loadSprite(spec: SpriteSpec): Promise<void> {
  if (spec.status === "ready" || spec.status === "failed") return Promise.resolve();
  if (spec.pending) return spec.pending;

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
    };

    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? "ready" : "failed");
    image.onerror = () => finish("failed");
    image.src = spec.url;

    // メモリキャッシュから同期的に利用可能になる実装も拾う。
    if (image.complete) {
      queueMicrotask(() => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? "ready" : "failed"));
    }
  });
  return spec.pending;
}

/** 起動時に一度呼ぶ。失敗を reject にせず、必ずフォールバック可能な状態で完了する。 */
export function prepareUnitSprites(): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  if (!preparing) preparing = Promise.all(WALK_SPRITES.map(loadSprite)).then((): void => undefined);
  return preparing;
}

function walkSpriteFor(u: Drawable): SpriteSpec | null {
  if (LIN[u.lin]?.id !== "walk") return null;
  return Number.isInteger(u.era) ? WALK_SPRITES[u.era] || null : null;
}

/**
 * 読み込み済みの「歩む者」を現在のユニット座標へ描く。
 * true のときだけ呼び出し側は手続き描画を省略する。
 */
export function tryDrawWalkSprite(
  c: CanvasRenderingContext2D,
  u: Drawable,
  scale: number,
  flash: boolean,
): boolean {
  const spec = walkSpriteFor(u);
  const image = spec?.status === "ready" ? spec.image : null;
  if (!spec || !image) return false;

  const height = 50 * (u.hh || u.w) * scale;
  const width = height * spec.aspect;
  c.save();
  if (flash) c.filter = "brightness(0) invert(1)";
  c.drawImage(image, -width * spec.anchorX, -height * spec.groundY, width, height);
  c.restore();
  return true;
}
