/* Generated scenery is kept as separate PNG files. Vite resolves their URLs at
   build time, while browsers only decode the era that is currently visible. */
const BACKGROUND_MODULES = import.meta.glob("../assets/backgrounds/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const CASTLE_MODULES = import.meta.glob("../assets/castles/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const FOREGROUND_MODULES = import.meta.glob("../assets/foregrounds/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const BACKGROUND_URLS = Object.values(BACKGROUND_MODULES);
export const CASTLE_URLS = Object.values(CASTLE_MODULES);
export const FOREGROUND_URLS = Object.values(FOREGROUND_MODULES);

type Entry = { url: string; image?: HTMLImageElement; failed?: boolean; pending?: boolean };

function eraEntries(modules: Record<string, string>): Map<number, Entry> {
  const result = new Map<number, Entry>();
  for (const [path, url] of Object.entries(modules)) {
    const match = /era(\d+)\.png$/.exec(path);
    if (match) result.set(Number(match[1]), { url });
  }
  return result;
}

const backgrounds = eraEntries(BACKGROUND_MODULES);
const castles = eraEntries(CASTLE_MODULES);
const foregrounds = eraEntries(FOREGROUND_MODULES);

function request(entry: Entry | undefined, ready?: () => void): HTMLImageElement | null {
  if (!entry || entry.failed || typeof Image === "undefined") return null;
  if (entry.image?.complete && entry.image.naturalWidth > 0) return entry.image;
  if (entry.pending) return null;
  entry.pending = true;
  const image = new Image();
  entry.image = image;
  image.decoding = "async";
  image.onload = () => {
    entry.pending = false;
    if (image.naturalWidth > 0) ready?.();
    else entry.failed = true;
  };
  image.onerror = () => {
    entry.pending = false;
    entry.failed = true;
  };
  image.src = entry.url;
  return null;
}

export function backgroundSprite(era: number, ready?: () => void): HTMLImageElement | null {
  return request(backgrounds.get(era), ready);
}

export function castleSprite(era: number): HTMLImageElement | null {
  return request(castles.get(era));
}

export function foregroundSprite(era: number, ready?: () => void): HTMLImageElement | null {
  return request(foregrounds.get(era), ready);
}
