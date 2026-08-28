/* ---------- ユニットの手続き描画 ---------- */
export const _mixMemo = new Map();
// 色は必ず #rrggbb で持ち回る。戻り値をさらに別の色関数へ渡せるようにするため。
export const _colMemo = new Map();
export function _rgb(col: string): [number, number, number] {
  let v = _colMemo.get(col);
  if (v) return v;
  if (col.charAt(0) === "#") {
    let h = col.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const m = col.match(/(\d+)\D+(\d+)\D+(\d+)/);
    v = m ? [+m[1], +m[2], +m[3]] : [136, 136, 136];
  }
  _colMemo.set(col, v);
  return v;
}
export function _hx(r: number, g: number, b: number): string {
  r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function mixW(col: string, t: number): string {
  const k = "w" + col + t;
  let v = _mixMemo.get(k);
  if (v) return v;
  const c = _rgb(col);
  v = _hx(c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t);
  _mixMemo.set(k, v);
  return v;
}
export function mixK(col: string, t: number): string {
  const k = "k" + col + t;
  let v = _mixMemo.get(k);
  if (v) return v;
  const c = _rgb(col);
  v = _hx(c[0] * (1 - t), c[1] * (1 - t), c[2] * (1 - t));
  _mixMemo.set(k, v);
  return v;
}
export function rgba(col: string, a: number): string {
  const c = _rgb(col);
  return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}
export const _shadeMemo = new Map();
export function shade(col: string, f: number): string {
  const key = col + "|" + f;
  const hit = _shadeMemo.get(key);
  if (hit) return hit;
  const v = _shade(col, f);
  _shadeMemo.set(key, v);
  return v;
}
export function _shade(col: string, f: number): string {
  const c = _rgb(col);
  return _hx(c[0] * f, c[1] * f, c[2] * f);
}
