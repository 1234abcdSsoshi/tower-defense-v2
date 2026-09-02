/* =====================================================================
   ログインの綴じ目。合鍵（token）を持ち、切れる前に取り替える。

   パスワードそのものはここを通らない。登録とログインの一瞬だけ
   Supabase へ送り、あとは合鍵のやりとりだけで済ませる。
   ===================================================================== */
import { SB_KEY, SB_URL } from "@/auth/config";

const KEY = "jidai.session";

export interface Session {
  access: string;
  refresh: string;
  /** 合鍵が切れる時刻（ミリ秒） */
  until: number;
  userId: string;
  username: string;
}

let cur: Session | null = null;

/** いまのログイン状態。読むだけ */
export function session(): Session | null {
  return cur;
}

export function setSession(s: Session | null): void {
  cur = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch (e) {
    /* 保存できなくても、その場のログインは続く */
  }
}

/** 起動時に、前回のログインを拾い直す */
export function restoreSession(): void {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null") as Session | null;
    if (o && typeof o.access === "string" && typeof o.refresh === "string" && typeof o.userId === "string") cur = o;
  } catch (e) {
    cur = null;
  }
}

/** Supabase から返る合鍵の形 */
interface TokenReply {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: { id: string; user_metadata?: { username?: string } };
}

export function sessionFrom(r: TokenReply, fallbackName: string): Session {
  return {
    access: r.access_token,
    refresh: r.refresh_token,
    // 30 秒早めに切れることにする。境目ぴったりで弾かれるのを避ける
    until: Date.now() + Math.max(0, r.expires_in - 30) * 1000,
    userId: r.user?.id || "",
    username: r.user?.user_metadata?.username || fallbackName,
  };
}

/**
 * 使える合鍵を返す。切れていれば取り替える。
 * 取り替えられなければ null（ログインし直してもらう）。
 */
export async function accessToken(): Promise<string | null> {
  if (!cur) return null;
  if (Date.now() < cur.until) return cur.access;

  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: cur.refresh }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const r = (await res.json()) as TokenReply;
    setSession(sessionFrom(r, cur.username));
    return r.access_token;
  } catch (e) {
    // 合鍵を取り替えられない ── 期限切れか、消されたか、網が無いか。
    // 手元の進行はそのまま残る。ログインだけ解く
    setSession(null);
    return null;
  }
}
