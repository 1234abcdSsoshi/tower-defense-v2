/* =====================================================================
   引き継ぎコード。進行データを一本の文字列にして、別の端末へ運ぶ。

   サーバーを持たない配布（GitHub Pages・itch.io・手元の実行ファイル）で、
   端末を変えても続きから遊べるようにするための仕組み。
   ログインも登録も要らず、こちらは何も預からない。

   ゴーストは載せない。
   進行そのもの（勾玉・編成・強化・技・突破記録）はせいぜい数KBだが、
   ゴーストは入力ログなので最大 1.1MB あり、桁が二つ違う。
   運べる長さに収めるには外すしかなく、外して困るものでもない
   （自己ベストの記録は best に残り、消えるのは並走する影だけ）。

   圧縮と復元はブラウザ標準の CompressionStream を使う。
   使えない古い環境では、圧縮せずそのまま詰める（長くなるが通じる）。
   ===================================================================== */
import { SAVE_V } from "@/core/constants";
import { normalizeSave, SAVE, setSave } from "@/save/save";
import type { SaveData } from "@/save/save";

/** コードの頭。見ただけで何のコードか分かるように */
const PREFIX = "JIDAI";

/**
 * コードの形式。中身の詰めかたを変えたら上げる。
 * 古い形式のコードを読めなくするためではなく、
 * 「読めない」と正しく言えるようにするための番号。
 */
const CODE_V = 1;

/** 外へ持ち出すもの。ghost だけは意図して外している */
export type Carried = Omit<SaveData, "ghost">;

/**
 * 進行から、運べる分だけを取り出す。
 * 引き継ぎコードも、アカウントへの預け入れ（auth/cloudSave.ts）も
 * ここを通す ── 片方だけゴーストを載せる、といった食い違いを防ぐ。
 */
export function carry(save: SaveData): Carried {
  const { ghost: _ghost, ...rest } = save;
  return rest;
}

/* ---------------------------------------------------------------- 文字への変換
   base64 のままだと + と / が混ざり、貼り付け先によっては壊れる。
   URL でもチャットでも安全な base64url にして、末尾の = も落とす。 */

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * ひと塊のバイト列を変換ストリームに通して、ひと塊で受け取る。
 *
 * Blob も Response も使わない。どちらも環境によって欠けたり
 * 中途半端に実装されていたりするが、ReadableStream は
 * CompressionStream がある場では必ずある。
 */
async function through(bytes: Uint8Array, ts: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const src = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
  const reader = src.pipeThrough(ts).getReader();
  const parts: Uint8Array[] = [];
  let len = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    len += value.length;
  }
  const out = new Uint8Array(len);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  return through(bytes, new CompressionStream("gzip") as TransformStream<Uint8Array, Uint8Array>);
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  return through(bytes, new DecompressionStream("gzip") as TransformStream<Uint8Array, Uint8Array>);
}

/* ---------------------------------------------------------------- 発行 */

/**
 * いまの進行から引き継ぎコードを作る。
 * 形は  JIDAI-1-g-<本体>   （g は gzip 済み / r は生）
 */
export async function makeTransferCode(save: SaveData = SAVE): Promise<string> {
  if (!save) throw new Error("進行データがありません");
  const json = JSON.stringify(carry(save));
  const raw = new TextEncoder().encode(json);
  const packed = await gzip(raw);
  const [mark, bytes] = packed && packed.length < raw.length ? (["g", packed] as const) : (["r", raw] as const);
  return `${PREFIX}-${CODE_V}-${mark}-${toBase64Url(bytes)}`;
}

/* ---------------------------------------------------------------- 読み込み */

export interface TransferResult {
  ok: boolean;
  /** そのまま画面に出せる知らせ */
  message: string;
}

/** 貼り付けの途中で混ざりがちなもの（改行・空白）を落とす */
function tidy(code: string): string {
  return code.trim().replace(/\s+/g, "");
}

/**
 * 引き継ぎコードを読み、いまの進行を置き換える。
 *
 * 中身は normalizeSave を通す。手で書き換えたコードを貼られても、
 * 壊れた値は既定へ落ちるだけで、盤面が破綻することはない。
 */
export async function applyTransferCode(code: string): Promise<TransferResult> {
  const text = tidy(code);
  if (!text) return { ok: false, message: "コードが空です" };

  const m = /^JIDAI-(\d+)-([gr])-(.+)$/.exec(text);
  if (!m) return { ok: false, message: "引き継ぎコードの形ではありません" };

  const ver = Number(m[1]);
  if (ver > CODE_V) {
    return { ok: false, message: "新しい版のコードです。ゲームを更新してから読み込んでください" };
  }

  let json: string;
  try {
    const bytes = fromBase64Url(m[3]);
    const raw = m[2] === "g" ? await gunzip(bytes) : bytes;
    json = new TextDecoder().decode(raw);
  } catch (e) {
    return { ok: false, message: "コードが途中で欠けているようです。全部を貼り付けてください" };
  }

  let parsed: Partial<SaveData>;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, message: "コードの中身を読み取れませんでした" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "コードの中身が進行データではありません" };
  }
  if (parsed.v !== SAVE_V) {
    return { ok: false, message: "この版のゲームでは読めない進行データです" };
  }

  // ゴーストは運ばない。いま手元にあるものはそのまま残す
  const next = normalizeSave(parsed);
  next.ghost = SAVE?.ghost ?? {};
  setSave(next);

  const cleared = Object.keys(next.cleared || {}).length;
  return { ok: true, message: `進行を引き継ぎました（突破 ${cleared} 戦・勾玉 ${next.mag}）` };
}

/** コードの中身を、書き換えずに覗く。読み込む前の確認に使う */
export async function peekTransferCode(code: string): Promise<{ cleared: number; mag: number } | null> {
  const text = tidy(code);
  const m = /^JIDAI-(\d+)-([gr])-(.+)$/.exec(text);
  if (!m) return null;
  try {
    const bytes = fromBase64Url(m[3]);
    const raw = m[2] === "g" ? await gunzip(bytes) : bytes;
    const o = JSON.parse(new TextDecoder().decode(raw)) as Partial<SaveData>;
    return { cleared: Object.keys(o.cleared || {}).length, mag: o.mag ?? 0 };
  } catch (e) {
    return null;
  }
}
