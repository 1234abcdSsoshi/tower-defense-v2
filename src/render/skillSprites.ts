const MODULES = import.meta.glob("../assets/skills/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const SKILL_SPRITE_URLS = Object.values(MODULES);

const urls = new Map<string, string>();
for (const [path, url] of Object.entries(MODULES)) {
  const match = /\/([a-z]+\d+)\.png$/.exec(path);
  if (match) urls.set(match[1], url);
}

type Entry = { image: HTMLImageElement; ready: boolean; failed: boolean };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

export function skillSpriteUrl(id: string): string {
  return urls.get(id) || "";
}

export function onSkillSpriteReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load(id: string): Entry | null {
  const old = entries.get(id);
  if (old) return old;
  const url = urls.get(id);
  if (!url || typeof Image === "undefined") return null;
  const entry: Entry = { image: new Image(), ready: false, failed: false };
  entries.set(id, entry);
  entry.image.decoding = "async";
  entry.image.onload = () => {
    entry.ready = entry.image.naturalWidth > 0;
    entry.failed = !entry.ready;
    if (entry.ready) for (const listener of listeners) listener();
  };
  entry.image.onerror = () => (entry.failed = true);
  entry.image.src = url;
  return entry;
}

/** Draw a generated skill icon; false keeps the previous procedural symbol as fallback. */
export function tryDrawSkillSprite(
  c: CanvasRenderingContext2D,
  id: string,
  width: number,
  height: number,
): boolean {
  const entry = load(id);
  if (!entry?.ready || entry.failed) return false;
  const size = Math.min(width, height) * 0.94;
  c.drawImage(entry.image, (width - size) / 2, (height - size) / 2, size, size);
  return true;
}
