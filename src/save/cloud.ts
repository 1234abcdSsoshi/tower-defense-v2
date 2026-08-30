import { SAVE_KEY, SAVE_V } from "@/core/constants";
import { ACCOUNT } from "@/net/auth";
import { getClient } from "@/net/supabase";
import { SAVE, setSave } from "@/save/save";
import type { SaveData } from "@/save/save";

/* =====================================================================
   進行データをアカウントへ預ける。

   守っている約束：
     * ログインしていなくても、今までどおり端末内の保存だけで完全に遊べる
     * 初めてそのアカウントでログインしたときだけ、端末内の進行を引き継ぐ
     * 二度目からはアカウント側が正。端末とアカウントで食い違ったら
       アカウントを採る（どの端末から入っても同じ進行になる、という約束）
     * 引き継ぎで上書きする前に、端末内の元データを控えに残す

   保存はまとめて送る。石高を1つ使うたびに網へ出ていくと、
   遊びの手触りが通信の速さに引きずられてしまう。
   ===================================================================== */

/** 引き継ぎで上書きする前の控え。取り違えたときに戻せるようにする */
export const BACKUP_KEY = SAVE_KEY + ".backup";

/** 送信をまとめる間隔（ミリ秒） */
const PUSH_DELAY = 2500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let dirty = false;

/** 直近の同期でどうなったか。画面に出す */
export let cloudStatus = "";

function setStatus(s: string): void {
  cloudStatus = s;
}

/** どれだけ進んでいるか。引き継ぎの判断ではなく、知らせの文面に使う */
function progressOf(s: SaveData | null): number {
  if (!s) return -1;
  return Object.keys(s.cleared || {}).length;
}

async function readCloud(): Promise<SaveData | null> {
  const sb = await getClient();
  if (!sb || !ACCOUNT) return null;
  const { data, error } = await sb.from("saves").select("data").eq("user_id", ACCOUNT.id).maybeSingle();
  if (error || !data) return null;
  return (data.data as SaveData) ?? null;
}

async function writeCloud(save: SaveData): Promise<boolean> {
  const sb = await getClient();
  if (!sb || !ACCOUNT) return false;
  const { error } = await sb.from("saves").upsert({
    user_id: ACCOUNT.id,
    data: save,
    version: SAVE_V,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

/**
 * ログインした直後に一度だけ。
 * アカウント側に何も無ければ、この端末の進行を引き継ぐ。
 * 既にあればそちらを正として読み込む。
 */
export async function syncOnLogin(): Promise<string> {
  if (!ACCOUNT || !SAVE) return "";
  const cloud = await readCloud();

  if (!cloud) {
    const ok = await writeCloud(SAVE);
    const msg = ok
      ? `この端末の進行を ${ACCOUNT.name} へ引き継ぎました`
      : "引き継ぎに失敗しました。端末内の進行はそのままです";
    setStatus(msg);
    return msg;
  }

  // 上書きする前に控えを取る。取り違えても手で戻せるようにしておく
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(SAVE));
  } catch {
    /* 容量が無くても同期そのものは続ける */
  }

  const before = progressOf(SAVE);
  setSave(cloud);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cloud));
  } catch {
    /* 端末に書けなくてもアカウント側が正なので続けられる */
  }
  const after = progressOf(cloud);
  const msg =
    before > after
      ? `${ACCOUNT.name} の進行を読み込みました（この端末のほうが進んでいたので、控えを ${BACKUP_KEY} に残しました）`
      : `${ACCOUNT.name} の進行を読み込みました`;
  setStatus(msg);
  return msg;
}

/** 端末に保存したときに呼ばれる。まとめて送る */
export function queueCloudPush(): void {
  if (!ACCOUNT) return;
  dirty = true;
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void flushCloudPush();
  }, PUSH_DELAY);
}

/** 溜まっているぶんを今すぐ送る。画面を閉じるときにも呼ぶ */
export async function flushCloudPush(): Promise<void> {
  if (!ACCOUNT || !dirty || pushing || !SAVE) return;
  pushing = true;
  dirty = false;
  const ok = await writeCloud(SAVE);
  pushing = false;
  if (!ok) {
    // 送れなかったぶんは捨てず、次の機会に持ち越す
    dirty = true;
    setStatus("保存を送れませんでした。網が戻ったら送り直します");
  }
}

/** ログアウト時。送り残しを流してから、送信予定を捨てる */
export async function stopCloudSync(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await flushCloudPush();
  dirty = false;
  setStatus("");
}
