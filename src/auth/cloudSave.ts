/* =====================================================================
   進行をアカウントへ預ける／取り戻す。

   預けるのは引き継ぎコードと同じ中身 ── ゴーストは載せない。
   入力ログは最大 1.1MB あり、人数ぶん積むと置き場が持たない。
   ゴーストは遊んだ端末の中にだけ残る。

   預け先は saves 表の一行だけ。誰が誰の行を読み書きできるかは
   Supabase 側の RLS が決める（docs/ACCOUNT.md の SQL）。
   ===================================================================== */
import { SB_KEY, SB_URL } from "@/auth/config";
import { accessToken, session } from "@/auth/session";
import { normalizeSave, SAVE, saveNow, setSave } from "@/save/save";
import type { SaveData } from "@/save/save";
import { carry } from "@/save/transfer";

/* ---------------------------------------------------------------- 同期の目印
   「どちらが新しいか」を、当てずっぽうで決めない。

   at    … 最後に預けた（または受け取った）ときの、相手側の時刻
   dirty … 手元に、まだ預けられていない変化があるか

   この二つがあれば、次の四通りを取り違えずに済む。
     相手側が進んだ / 手元だけ進んだ / どちらも進んだ / どちらも進んでいない
   目印が無いまま時刻だけで比べると、網が切れているあいだに遊んだぶんを
   古い預かりもので黙って踏み潰すことになる。 */

const SYNC_KEY = "jidai.sync";

interface SyncMark {
  userId: string;
  at: string;
  dirty: boolean;
}

function mark(): SyncMark | null {
  try {
    const o = JSON.parse(localStorage.getItem(SYNC_KEY) || "null") as SyncMark | null;
    const s = session();
    return o && s && o.userId === s.userId ? o : null;
  } catch (e) {
    return null;
  }
}

function setMark(at: string, dirty: boolean): void {
  const s = session();
  if (!s) return;
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify({ userId: s.userId, at, dirty }));
  } catch (e) {
    /* 目印を置けなくても、遊びは続く */
  }
}

function setDirty(on: boolean): void {
  const m = mark();
  setMark(m?.at ?? "", on);
}

/** この端末に、まだ預けていない変化があるか */
export function hasUnsent(): boolean {
  return !!mark()?.dirty;
}

/** 最後に同期したときの、相手側の時刻。一度も預けていなければ null */
export function lastSyncAt(): string | null {
  return mark()?.at || null;
}

export interface Remote {
  save: SaveData;
  updatedAt: string;
}

/** 相手側に置いてある進行を読む。行が無ければ null（まだ一度も預けていない） */
export async function pullSave(): Promise<Remote | null> {
  const token = await accessToken();
  const s = session();
  if (!token || !s) return null;

  const res = await fetch(`${SB_URL}/rest/v1/saves?select=data,updated_at&user_id=eq.${s.userId}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`読み出せません（${res.status}）`);

  const rows = (await res.json()) as { data: Partial<SaveData>; updated_at: string }[];
  if (!rows.length || !rows[0].data) return null;

  // 手元から読むときと同じ道を通す。壊れていても既定へ落ちるだけ
  const next = normalizeSave(rows[0].data);
  // ゴーストは預けていない。いま手元にあるものを残す
  next.ghost = SAVE?.ghost ?? {};
  return { save: next, updatedAt: rows[0].updated_at };
}

/** いまの進行を預ける。同じ行を上書きする */
export async function pushSave(save: SaveData = SAVE): Promise<void> {
  const token = await accessToken();
  const s = session();
  if (!token || !s || !save) return;

  const at = new Date().toISOString();
  const res = await fetch(`${SB_URL}/rest/v1/saves`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // 同じ user_id の行があれば置き換える
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: s.userId, data: carry(save), updated_at: at }),
  });
  if (!res.ok) throw new Error(`預けられません（${res.status}）`);
  // 送れた。ここまでが相手側にある、と覚えておく
  setMark(at, false);
}

/** 相手側の進行を、手元に据える */
export function adopt(r: Remote): void {
  // saveNow は預け入れを呼ぶ。受け取ったばかりのものを送り返さないよう、
  // そのあいだだけ呼び出しを止める。
  // 送り返すと相手側の時刻が新しくなり、別の端末から見て
  // 「知らないうちに進んだ」ことになってしまう
  suppress = true;
  setSave(r.save);
  saveNow();
  suppress = false;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  setMark(r.updatedAt, false);
}

/* ---------------------------------------------------------------- 溜めてから送る
   一戦のあいだ saveNow は何度も呼ばれる。そのたびに送ると
   遊びの最中に通信が挟まるので、少し待って一度にまとめる。 */

let pending: ReturnType<typeof setTimeout> | null = null;
let onPushFail: ((reason: string) => void) | null = null;
/** 受け取ったものを据えているあいだ、預け入れを止める */
let suppress = false;

export function setPushFailListener(fn: (reason: string) => void): void {
  onPushFail = fn;
}

/** 進行が変わったことを知らせる。実際に送るのは少し後 */
export function schedulePush(): void {
  if (suppress || !session()) return;
  setDirty(true);
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    pushSave().catch((e: Error) => {
      // 送れなくても遊びは止めない。ただし黙らない ──
      // 預けられていないことに気づかないまま端末を替えると、
      // そこで進行が消えたように見える
      onPushFail?.(e.message || "進行を預けられませんでした");
    });
  }, 4000);
}

/** いますぐ送る（ログアウトの直前など、待っていられないとき） */
export async function flushPush(): Promise<void> {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  if (session()) await pushSave().catch((): void => undefined);
}
