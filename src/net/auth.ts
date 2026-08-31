import { CLOUD_ENABLED } from "@/net/env";
import { getClient } from "@/net/supabase";

/* =====================================================================
   アカウント。合言葉（パスワード）はこちらでは一切持たず、
   Supabase の認証へそのまま渡すだけ。端末に残るのはセッションだけ。

   2P 対戦をあとから載せるとき、相手が誰かを言えるのはここ。
   表示名は profiles 表に置き、進行データ（saves）とは分けてある。
   ===================================================================== */
import type { Session, User } from "@supabase/supabase-js";

export interface Account {
  id: string;
  email: string;
  /** 表示名。2P で相手に見える名前になる */
  name: string;
}

export let ACCOUNT: Account | null = null;

type Listener = (account: Account | null) => void;
const listeners: Listener[] = [];

/** ログイン状態が変わったら呼ばれる。起動時に一度だけ登録する */
export function onAccountChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function announce(): void {
  for (const fn of listeners) fn(ACCOUNT);
}

/** 認証まわりの失敗を、そのまま画面に出せる日本語にする */
export function readableError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "メールアドレスか合言葉が違います";
  if (m.includes("email not confirmed")) return "メールの確認がまだです。届いたリンクを開いてください";
  if (m.includes("user already registered")) return "そのメールアドレスは登録済みです。ログインしてください";
  if (m.includes("password should be at least")) return "合言葉は6文字以上にしてください";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "メールアドレスの形が正しくありません";
  if (m.includes("rate limit") || m.includes("too many"))
    return "試行が多すぎます。しばらく置いてからにしてください";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "網につながりません。接続を確かめてください";
  return message;
}

async function profileName(userId: string, fallback: string): Promise<string> {
  const sb = await getClient();
  if (!sb) return fallback;
  const { data } = await sb.from("profiles").select("name").eq("user_id", userId).maybeSingle();
  return data?.name || fallback;
}

/** メールの @ より前を、そのまま表示名の初期値にする */
function nameFromEmail(email: string): string {
  return (email.split("@")[0] || "名無し").slice(0, 24);
}

async function adopt(session: Session | null): Promise<void> {
  const user: User | null = session?.user ?? null;
  if (!user) {
    ACCOUNT = null;
    announce();
    return;
  }
  const email = user.email ?? "";
  ACCOUNT = { id: user.id, email, name: await profileName(user.id, nameFromEmail(email)) };
  announce();
}

/** 起動時に一度だけ。前回のセッションが残っていれば拾い直す */
export async function initAuth(): Promise<void> {
  if (!CLOUD_ENABLED) return;
  const sb = await getClient();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  await adopt(data.session);
  sb.auth.onAuthStateChange((_event, session) => {
    void adopt(session);
  });
}

export interface AuthResult {
  ok: boolean;
  /** 画面にそのまま出せる知らせ */
  message: string;
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
  const sb = await getClient();
  if (!sb) return { ok: false, message: "オンライン機能が設定されていません" };
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, message: readableError(error.message) };

  const display = (name || nameFromEmail(email)).slice(0, 24);
  if (data.user) {
    // 確認メールを挟む設定だと、ここではまだ書き込めないことがある。
    // その場合は初回ログイン時に作られるので、失敗しても止めない
    // 失敗しても登録そのものは成功しているので、握って進める
    try {
      await sb.from("profiles").upsert({ user_id: data.user.id, name: display });
    } catch {
      /* 確認メール待ちのあいだは書けないことがある */
    }
  }
  if (!data.session) {
    return { ok: true, message: "確認のメールを送りました。リンクを開いてからログインしてください" };
  }
  return { ok: true, message: "登録しました" };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const sb = await getClient();
  if (!sb) return { ok: false, message: "オンライン機能が設定されていません" };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: readableError(error.message) };
  if (data.user) {
    // 表示名が無ければ作っておく（確認メール経由で登録した人はここで入る）
    try {
      await sb
        .from("profiles")
        .upsert(
          { user_id: data.user.id, name: nameFromEmail(data.user.email ?? "") },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
    } catch {
      /* 既にあるなら何もしなくてよい */
    }
  }
  return { ok: true, message: "ログインしました" };
}

export async function signOut(): Promise<void> {
  const sb = await getClient();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function renameAccount(name: string): Promise<AuthResult> {
  const sb = await getClient();
  if (!sb || !ACCOUNT) return { ok: false, message: "ログインしていません" };
  const display = name.trim().slice(0, 24);
  if (!display) return { ok: false, message: "名前を入れてください" };
  const { error } = await sb.from("profiles").upsert({ user_id: ACCOUNT.id, name: display });
  if (error) return { ok: false, message: readableError(error.message) };
  ACCOUNT = { ...ACCOUNT, name: display };
  announce();
  return { ok: true, message: "名前を変えました" };
}
