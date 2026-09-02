/* =====================================================================
   登録・ログイン・ログアウト。

   ユーザー名は日本語でも構わない。Supabase へは、ユーザー名を
   算し直した文字列を宛先として渡すので、書ける字に縛りが要らない。
   ===================================================================== */
import { NAME_DOMAIN, SB_KEY, SB_URL } from "@/auth/config";
import { accessToken, session, sessionFrom, setSession } from "@/auth/session";

export interface AuthResult {
  ok: boolean;
  /** そのまま画面に出せる知らせ */
  message: string;
}

/** ユーザー名の決まり。長すぎ・空白だけ、を弾くだけに留める */
export const NAME_MIN = 2;
export const NAME_MAX = 20;
export const PASS_MIN = 8;

/**
 * ユーザー名を、突き合わせに使う形へ正す。
 *
 * 全角と半角、大文字と小文字を同じものとして扱う。
 * 「Taro」と「ＴＡＲＯ」で別々のアカウントができると、
 * 本人が自分のアカウントに入れなくなる。
 */
export function normalizeName(name: string): string {
  return name.normalize("NFKC").trim().toLowerCase();
}

/** ユーザー名から、Supabase へ渡す宛先を作る。日本語でも通るように算し直す */
async function addressFor(name: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeName(name));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let hex = "";
  for (const b of new Uint8Array(digest).slice(0, 16)) hex += b.toString(16).padStart(2, "0");
  return `u${hex}@${NAME_DOMAIN}`;
}

/**
 * 遊ぶ人に見せるユーザーID。
 * 中では UUID を使うが、そのままでは読み上げも書き写しもできない。
 * 頭の 8 桁を大文字で四つずつ区切って見せる。
 */
export function shortId(uuid: string): string {
  const s = uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  return s.slice(0, 4) + "-" + s.slice(4, 8);
}

export function checkName(name: string): string | null {
  const n = name.trim();
  if (n.length < NAME_MIN) return `ユーザー名は${NAME_MIN}字以上にしてください`;
  if (n.length > NAME_MAX) return `ユーザー名は${NAME_MAX}字までです`;
  return null;
}

export function checkPass(pass: string): string | null {
  if (pass.length < PASS_MIN) return `パスワードは${PASS_MIN}字以上にしてください`;
  return null;
}

/** Supabase が返す不首尾を、遊ぶ人に分かる日本語へ言い換える */
function explain(status: number, body: { error_code?: string; msg?: string; message?: string }): string {
  const code = body.error_code || "";
  const text = body.msg || body.message || "";
  if (code === "user_already_exists" || /already registered/i.test(text)) {
    return "そのユーザー名は使われています。別の名前にしてください";
  }
  if (code === "invalid_credentials" || /invalid login/i.test(text)) {
    return "ユーザー名かパスワードが違います";
  }
  if (code === "weak_password" || /password/i.test(text)) return "パスワードが短すぎます";
  if (code === "over_email_send_rate_limit" || status === 429) {
    return "試行が多すぎます。しばらく待ってからやり直してください";
  }
  if (status === 0) return "網につながりません。接続を確かめてください";
  return `うまくいきませんでした（${status}）`;
}

async function post(path: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  try {
    const res = await fetch(`${SB_URL}${path}`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, json };
  } catch (e) {
    // 網が無い。status 0 で「つながらない」と伝える
    return { status: 0, json: {} };
  }
}

/** 登録する。うまくいけば、そのままログインした状態になる */
export async function signUp(name: string, pass: string): Promise<AuthResult> {
  const bad = checkName(name) || checkPass(pass);
  if (bad) return { ok: false, message: bad };

  const email = await addressFor(name);
  const { status, json } = await post("/auth/v1/signup", {
    email,
    password: pass,
    data: { username: name.trim() },
  });

  if (status !== 200) return { ok: false, message: explain(status, json) };

  // メール確認が有効なままだと、合鍵が返らない。設定の取りこぼしなので、
  // 黙って「登録できた」ことにせず、はっきり言う
  if (!json.access_token) {
    return { ok: false, message: "サーバー側でメール確認が有効になっています。管理者に切ってもらってください" };
  }

  setSession(sessionFrom(json as never, name.trim()));
  return { ok: true, message: "登録しました" };
}

/** ログインする */
export async function signIn(name: string, pass: string): Promise<AuthResult> {
  const bad = checkName(name);
  if (bad) return { ok: false, message: bad };

  const email = await addressFor(name);
  const { status, json } = await post("/auth/v1/token?grant_type=password", { email, password: pass });

  if (status !== 200) return { ok: false, message: explain(status, json) };
  setSession(sessionFrom(json as never, name.trim()));
  return { ok: true, message: "ログインしました" };
}

/** ログアウトする。手元の進行は消さない */
export async function signOut(): Promise<void> {
  const token = await accessToken();
  if (token) {
    // 相手側でも合鍵を捨ててもらう。届かなくても手元は解く
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    }).catch((): void => undefined);
  }
  setSession(null);
}

/** いま誰でログインしているか。していなければ null */
export function currentUser(): { userId: string; username: string; id: string } | null {
  const s = session();
  if (!s) return null;
  return { userId: s.userId, username: s.username, id: shortId(s.userId) };
}
