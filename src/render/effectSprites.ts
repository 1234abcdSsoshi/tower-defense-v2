const PROJECTILE_MODULES = import.meta.glob("../assets/projectiles/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const EFFECT_MODULES = import.meta.glob("../assets/effects/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const DISASTER_MODULES = import.meta.glob("../assets/disasters/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const PROJECTILE_URLS = Object.values(PROJECTILE_MODULES);
export const EFFECT_URLS = Object.values(EFFECT_MODULES);
export const DISASTER_URLS = Object.values(DISASTER_MODULES);

type Entry = { url: string; image?: HTMLImageElement; failed?: boolean; pending?: boolean };

function namedEntries(modules: Record<string, string>): Map<string, Entry> {
  const result = new Map<string, Entry>();
  for (const [path, url] of Object.entries(modules)) {
    const match = /\/([^/]+)\.png$/.exec(path);
    if (match) result.set(match[1], { url });
  }
  return result;
}

const projectiles = namedEntries(PROJECTILE_MODULES);
const effects = namedEntries(EFFECT_MODULES);
const disasters = namedEntries(DISASTER_MODULES);

function request(entry: Entry | undefined): HTMLImageElement | null {
  if (!entry || entry.failed || typeof Image === "undefined") return null;
  if (entry.image?.complete && entry.image.naturalWidth > 0) return entry.image;
  if (entry.pending) return null;
  entry.pending = true;
  const image = new Image();
  entry.image = image;
  image.decoding = "async";
  image.onload = () => {
    entry.pending = false;
    if (image.naturalWidth <= 0) entry.failed = true;
  };
  image.onerror = () => {
    entry.pending = false;
    entry.failed = true;
  };
  image.src = entry.url;
  return null;
}

export function projectileSprite(kind: string): HTMLImageElement | null {
  return request(projectiles.get(kind) || projectiles.get("shell"));
}

export function effectSprite(kind: string): HTMLImageElement | null {
  return request(effects.get(kind));
}

export function disasterSprite(kind: string): HTMLImageElement | null {
  return request(disasters.get(kind));
}
