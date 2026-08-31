import { BAL } from "@/data/master";
import { disasterSprite } from "@/render/effectSprites";
import { GY, SC, sx } from "@/render/viewport";
import { G } from "@/sim/state";

function drawImage(
  g: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
  flip = false,
): void {
  if (!image || alpha <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, alpha);
  if (flip) {
    g.translate(x + width, 0);
    g.scale(-1, 1);
    g.drawImage(image, 0, y, width, height);
  } else {
    g.drawImage(image, x, y, width, height);
  }
  g.restore();
}

/* 天災の絵はすべて透過PNG。Canvasは位置・拡縮・反転・明滅の合成だけを担当する。 */
export function drawDis(g: CanvasRenderingContext2D, t: number): void {
  const left = sx(BAL.laneL);
  const right = sx(BAL.laneR);
  const laneWidth = right - left;

  if (G.bQuake > 0) {
    const strength = Math.min(1, G.bQuake / 1.2);
    const width = laneWidth * 1.12;
    const height = 128 * SC;
    const jitter = Math.sin(t * 31) * 3.2 * SC * strength;
    drawImage(
      g,
      disasterSprite("quake"),
      left - (width - laneWidth) / 2 + jitter,
      GY - height * 0.58,
      width,
      height,
      0.72 * strength,
    );
    if (G.shake < 3) G.shake = 3;
  }

  if (G.bWind > 0) {
    const strength = Math.min(1, G.bWind / 1.4);
    const width = laneWidth * 1.18;
    const height = 176 * SC;
    const drift = Math.sin(t * 1.8) * 17 * SC;
    drawImage(
      g,
      disasterSprite("typhoon"),
      left - (width - laneWidth) / 2 + drift,
      GY - height * 0.96,
      width,
      height,
      0.48 * strength,
      Math.sin(t * 0.7) < 0,
    );
  }

  if (G.wave > 0) {
    const progress = 1 - G.wave;
    const x = left + laneWidth * (progress * 1.3 - 0.25);
    const width = Math.min(laneWidth * 0.76, 300 * SC);
    const height = 190 * SC;
    drawImage(
      g,
      disasterSprite("tsunami"),
      x - width * 0.48,
      GY - height * 0.92,
      width,
      height,
      Math.min(1, G.wave * 1.7) * 0.94,
    );
  }

  const disaster = G.dis;
  if (!disaster) return;
  const appear = Math.min(1, disaster.t / 0.6);

  if (disaster.k === "bug") {
    const image = disasterSprite("locust");
    const width = laneWidth * 0.72;
    const height = 132 * SC;
    const travel = ((t * 58 * SC) % (laneWidth + width)) - width;
    drawImage(g, image, left + travel, GY - height * 1.06, width, height, 0.72 * appear);
    drawImage(
      g,
      image,
      right - travel - width,
      GY - height * 0.78,
      width * 0.72,
      height * 0.72,
      0.38 * appear,
      true,
    );
    return;
  }

  if (disaster.k === "thunder") {
    const x = disaster.lx === undefined ? (left + right) / 2 : sx(disaster.lx);
    const flash = Math.min(1, disaster.flash || 0);
    const width = Math.min(laneWidth * 0.54, 210 * SC);
    const height = 250 * SC;
    drawImage(
      g,
      disasterSprite("thunder"),
      x - width / 2,
      GY - height * 0.94,
      width,
      height,
      (0.28 + flash * 0.72) * appear,
      Math.sin(t * 5) < 0,
    );
    return;
  }

  if (disaster.k === "fire") {
    const center = sx(disaster.x);
    const radius = Math.abs(sx(disaster.x + disaster.r) - center);
    const width = Math.max(36 * SC, radius * 2.28);
    const height = Math.min(132 * SC, Math.max(58 * SC, width * 0.48));
    const pulse = 0.9 + Math.sin(t * 7.2) * 0.08;
    drawImage(
      g,
      disasterSprite("wildfire"),
      center - (width * pulse) / 2,
      GY - height * pulse * 0.94,
      width * pulse,
      height * pulse,
      (0.62 + Math.sin(t * 4.6) * 0.08) * appear,
      Math.sin(t * 2.3) < 0,
    );
  }
}
