/* =====================================================================
   アカウントの画面。登録・ログイン・ログアウト。

   遊ぶことを邪魔しない。設定が無ければ入口ごと出ないし、
   あってもログインは任意で、そのまま遊べる。
   ===================================================================== */
import { currentUser, signIn, signOut, signUp } from "@/auth/account";
import { AUTH_ON } from "@/auth/config";
import {
  adopt,
  flushPush,
  hasUnsent,
  lastSyncAt,
  pullSave,
  pushSave,
  schedulePush,
  setPushFailListener,
} from "@/auth/cloudSave";
import type { Remote } from "@/auth/cloudSave";
import { restoreSession, session } from "@/auth/session";
import { AU } from "@/audio/index";
import { SAVE, setSaveHook } from "@/save/save";
import { $, toast } from "@/ui/dom";
import { showHome } from "@/ui/home";

/** 登録の画面か、ログインの画面か */
let mode: "signup" | "signin" = "signup";
let busy = false;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return $<T>(id);
}

function msg(text: string, bad = false): void {
  const p = el("authMsg");
  p.textContent = text || "\u00a0";
  p.style.color = bad ? "#ff9a6a" : "var(--kin)";
}

/** 登録とログインで、見出しとボタンの字を入れ替える */
function renderForm(): void {
  const signing = mode === "signup";
  el("authTitle").textContent = signing ? "アカウントを作る" : "ログイン";
  el("authLead").textContent = signing
    ? "ユーザー名とパスワードを決めると、ユーザーIDが発行されます。別の端末でも同じ名前でログインすれば、続きから遊べます。"
    : "登録したユーザー名とパスワードを入れてください。";
  el("authGo").textContent = signing ? "登録する" : "ログインする";
  el("authSwap").textContent = signing ? "登録済みの方はこちら" : "はじめての方はこちら";
  el<HTMLInputElement>("authPass").autocomplete = signing ? "new-password" : "current-password";
  msg("");
}

/** ログインしているかどうかで、画面全体を切り替える */
export function renderAuth(): void {
  if (!AUTH_ON) return;
  const me = currentUser();

  el("authRow").hidden = false;
  el("authCfgHead").hidden = false;
  el("authCfgRow").hidden = false;
  el("authCfgNote").hidden = false;
  el("authForm").hidden = !!me;
  el("authWhoami").hidden = !me;

  if (me) {
    el("authTitle").textContent = "アカウント";
    // 下の案内と重なるので、ここでは繰り返さない
    el("authLead").hidden = true;
    el("authWhoamiName").textContent = me.username;
    el("authWhoamiId").textContent = me.id;
    el("authOpen").textContent = `${me.username} でログイン中`;
    el("authCfgOpen").textContent = `${me.username}（ID ${me.id}）`;
    el("authWho").hidden = false;
    el("authWho").textContent = `${me.username}（ID ${me.id}）でログイン中`;
  } else {
    el("authLead").hidden = false;
    el("authOpen").textContent = "アカウントを作る／ログイン";
    el("authCfgOpen").textContent = "アカウントを作る／ログイン";
    el("authWho").hidden = true;
    renderForm();
  }
}

function open(): void {
  renderAuth();
  el("authSheet").classList.add("show");
  if (!currentUser()) el<HTMLInputElement>("authName").focus();
}

function close(): void {
  el("authSheet").classList.remove("show");
}

/** 入力中はボタンを止める。二重に押して二つ登録されるのを防ぐ */
function setBusy(on: boolean): void {
  busy = on;
  el<HTMLButtonElement>("authGo").disabled = on;
  el<HTMLButtonElement>("authSwap").disabled = on;
}

/**
 * 進行の突き合わせ。ログインした直後と、開き直したときに一度ずつ。
 *
 * どちらが新しいかを当てずっぽうで決めない。前回の同期の目印
 * （相手側の時刻と、送り残しの有無）を見て、次の四通りを分ける。
 *
 *   相手側に何も無い          -> 手元のものを預ける（初めての預け入れ）
 *   手元だけ進んだ            -> 手元のまま。送り残しを送る
 *   相手側だけ進んだ          -> 相手側を受け取る（黙って入れ替えて構わない）
 *   どちらも進んだ            -> 断りを入れる。踏み潰す判断は人に任せる
 *
 * 「開き直すたびに、古い預かりもので手元を上書きする」のを避けるための分岐。
 * 網が切れているあいだに遊んだぶんが、これで消えなくなる。
 */
async function syncProgress(fresh: boolean): Promise<void> {
  let remote;
  try {
    remote = await pullSave();
  } catch (e) {
    toast("預けてある進行を読めませんでした", "#ff9a6a");
    return;
  }

  // 相手側に何も無い。この端末の進行を預ける
  if (!remote) {
    try {
      await pushSave(SAVE);
      if (fresh) toast("いまの進行をアカウントへ預けました");
    } catch (e) {
      toast("進行を預けられませんでした", "#ff9a6a");
    }
    return;
  }

  const seen = lastSyncAt();
  const moved = remote.updatedAt !== seen; // 相手側が、こちらの知らないところで進んだ
  const unsent = hasUnsent(); // 手元に、まだ送れていない変化がある

  // 相手側は動いていない。手元が正。送り残しがあれば送る
  if (!moved) {
    if (unsent) await flushPush();
    return;
  }

  const theirs = Object.keys(remote.save.cleared || {}).length;
  const mine = Object.keys(SAVE?.cleared || {}).length;

  // 相手側だけ進んだ ── 手元の変化は既に預けてある。黙って受け取ってよい
  if (!unsent && seen) {
    take(remote, theirs);
    return;
  }

  // 手元がまっさらなら、迷う余地がない
  if (mine === 0 && (SAVE?.mag || 0) === 0) {
    take(remote, theirs);
    return;
  }

  // どちらも進んだ、あるいは初めてこの端末でログインした。
  // 踏み潰す判断は人に任せる
  const ok = confirm(
    `アカウントには 突破 ${theirs} 戦・勾玉 ${remote.save.mag} の進行が預けてあります。
` +
      `この端末の 突破 ${mine} 戦・勾玉 ${SAVE.mag} は、預けてあるものに置き換わります。

` +
      `この端末の進行を残したいときは、いったん「いいえ」を選び、
` +
      `設定の「引き継ぎ」でコードを控えてください。

置き換えますか？`,
  );
  if (!ok) {
    toast("この端末の進行のままにしました");
    return;
  }
  take(remote, theirs);
}

function take(remote: Remote, cleared: number): void {
  adopt(remote);
  showHome();
  toast(`預けてあった進行を戻しました（突破 ${cleared} 戦・勾玉 ${remote.save.mag}）`);
}

export function initAuthUI(): void {
  if (!AUTH_ON) {
    // 設定が無い。アカウントの入口は出さず、今まで通り端末の中だけで進む
    for (const id of ["authRow", "authWho", "authCfgHead", "authCfgRow", "authCfgNote"]) el(id).hidden = true;
    return;
  }

  restoreSession();
  // 進行が保存されるたびに、少し待ってから預ける
  setSaveHook(schedulePush);
  setPushFailListener((reason) => toast(reason, "#ff9a6a"));

  for (const id of ["authOpen", "authCfgOpen"]) {
    el(id).addEventListener("click", () => {
      AU.fx("ui");
      // 設定の上に重ねない。どちらから開いても同じ見え方にする
      el("cfgSheet").classList.remove("show");
      open();
    });
  }
  el("authClose").addEventListener("click", () => {
    AU.fx("ui");
    close();
  });

  el("authSwap").addEventListener("click", () => {
    AU.fx("ui");
    mode = mode === "signup" ? "signin" : "signup";
    renderForm();
    el<HTMLInputElement>("authName").focus();
  });

  el("authGo").addEventListener("click", () => {
    void submit();
  });
  // 入力欄で Enter を押しても通るように
  for (const id of ["authName", "authPass"]) {
    el(id).addEventListener("keydown", (ev) => {
      if ((ev as KeyboardEvent).key === "Enter") void submit();
    });
  }

  el("authOut").addEventListener("click", () => {
    AU.fx("ui");
    void (async () => {
      // 溜めてある分を送りきってから解く。最後の一戦を落とさない
      await flushPush();
      await signOut();
      renderAuth();
      close();
      toast("ログアウトしました。進行はこの端末に残っています");
    })();
  });

  renderAuth();

  // 前回のログインが残っていれば、そのまま突き合わせる
  if (session()) void syncProgress(false);
}

async function submit(): Promise<void> {
  if (busy) return;
  const name = el<HTMLInputElement>("authName").value;
  const pass = el<HTMLInputElement>("authPass").value;

  setBusy(true);
  msg(mode === "signup" ? "登録しています…" : "ログインしています…");
  const r = mode === "signup" ? await signUp(name, pass) : await signIn(name, pass);
  setBusy(false);

  if (!r.ok) {
    msg(r.message, true);
    return;
  }

  // パスワードを画面に残さない
  el<HTMLInputElement>("authPass").value = "";
  msg("");
  renderAuth();
  const me = currentUser();
  toast(me ? `${r.message}（ID ${me.id}）` : r.message);
  await syncProgress(true);
}
