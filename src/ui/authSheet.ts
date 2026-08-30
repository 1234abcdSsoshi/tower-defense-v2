/* =====================================================================
   アカウントの画面。登録・ログイン・名前の変更・ログアウト。

   ここは合言葉を預かるだけで、保存も検証もしない（net/auth.ts が
   そのまま Supabase へ渡す）。画面側に秘密を残さないための線引き。

   オンライン機能が設定されていない配布物では、この画面は開かない。
   拠点のボタンも出さないので、遊ぶ人には存在しないのと同じになる。
   ===================================================================== */
import { AU } from "@/audio/index";
import { CLOUD_ENABLED } from "@/net/env";
import { ACCOUNT, onAccountChange, renameAccount, signIn, signOut, signUp } from "@/net/auth";
import { cloudStatus, stopCloudSync, syncOnLogin } from "@/save/cloud";
import { $ } from "@/ui/dom";
import { refreshHome } from "@/ui/home";
import { showSheet } from "@/ui/sheets";

/** いま登録の画面か、ログインの画面か */
let mode: "in" | "up" = "in";
let busy = false;

function note(text: string, bad = false): void {
  const el = $("authNote");
  el.textContent = text;
  el.classList.toggle("bad", bad);
}

function setBusy(next: boolean): void {
  busy = next;
  $<HTMLButtonElement>("authGo").disabled = next;
  $<HTMLButtonElement>("authSwap").disabled = next;
  $("authGo").textContent = next ? "…" : mode === "in" ? "ログイン" : "登録する";
}

/** 画面の中身を、いまの状態に合わせて描き直す */
export function renderAuth(): void {
  const inAccount = !!ACCOUNT;
  $("authForm").classList.toggle("hide", inAccount);
  $("authMe").classList.toggle("hide", !inAccount);
  $("authTitle").textContent = inAccount ? "アカウント" : mode === "in" ? "ログイン" : "はじめての登録";

  if (inAccount) {
    $("authName").textContent = ACCOUNT.name;
    $("authEmail").textContent = ACCOUNT.email;
    $<HTMLInputElement>("authRename").value = ACCOUNT.name;
    if (cloudStatus) note(cloudStatus);
    return;
  }
  $("authGo").textContent = mode === "in" ? "ログイン" : "登録する";
  $("authSwap").textContent = mode === "in" ? "はじめての方はこちら" : "登録済みの方はこちら";
  $("authNameRow").classList.toggle("hide", mode === "in");
  $("authHint").textContent =
    mode === "in"
      ? "登録した端末以外からでも、同じ進行で遊べます。"
      : "合言葉は6文字以上。いまこの端末で進めた内容は、最初のログインで引き継がれます。";
}

export function showAuth(): void {
  if (!CLOUD_ENABLED) return;
  note("");
  renderAuth();
  showSheet("authSheet");
}

async function submit(): Promise<void> {
  if (busy) return;
  const email = $<HTMLInputElement>("authEmailIn").value.trim();
  const password = $<HTMLInputElement>("authPass").value;
  const name = $<HTMLInputElement>("authNameIn").value.trim();
  if (!email || !password) {
    note("メールアドレスと合言葉を入れてください", true);
    return;
  }
  setBusy(true);
  note(mode === "in" ? "ログインしています…" : "登録しています…");
  const r = mode === "in" ? await signIn(email, password) : await signUp(email, password, name);
  setBusy(false);
  if (!r.ok) {
    note(r.message, true);
    return;
  }
  $<HTMLInputElement>("authPass").value = "";
  note(r.message);
}

export function initAuthSheet(): void {
  // 設定が無ければ、入口ごと出さない
  const entry = $("mAccount");
  if (!CLOUD_ENABLED) {
    if (entry) entry.classList.add("hide");
    return;
  }

  entry?.addEventListener("click", () => {
    AU.fx("ui");
    showAuth();
  });
  $("authGo").addEventListener("click", () => void submit());
  $("authPass").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") void submit();
  });
  $("authSwap").addEventListener("click", () => {
    AU.fx("ui");
    mode = mode === "in" ? "up" : "in";
    note("");
    renderAuth();
  });
  $("authClose").addEventListener("click", () => {
    AU.fx("ui");
    showSheet("homeSheet");
    refreshHome();
  });
  $("authOut").addEventListener("click", () => {
    void (async () => {
      AU.fx("ui");
      note("送り残しを保存しています…");
      await stopCloudSync();
      await signOut();
      note("ログアウトしました。この端末の進行はそのまま残ります");
    })();
  });
  $("authRenameGo").addEventListener("click", () => {
    void (async () => {
      const r = await renameAccount($<HTMLInputElement>("authRename").value);
      note(r.message, !r.ok);
      renderAuth();
    })();
  });

  // ログイン・ログアウトの瞬間に、進行データを合わせる
  onAccountChange((account) => {
    if (account) {
      void syncOnLogin().then((msg) => {
        if (msg) note(msg);
        renderAuth();
        refreshHome();
      });
    } else {
      renderAuth();
      refreshHome();
    }
  });
}
