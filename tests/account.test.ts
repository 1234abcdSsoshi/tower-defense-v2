// @vitest-environment jsdom
/* アカウント ── ユーザー名の正しかた、入力の見張り、
   合鍵の持ちかた、そして PC 版には入らないこと。 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkName, checkPass, normalizeName, shortId } from "@/auth/account";
import { hasUnsent, lastSyncAt } from "@/auth/cloudSave";
import { restoreSession, session, sessionFrom, setSession } from "@/auth/session";

beforeEach(() => {
  localStorage.clear();
  setSession(null);
});

describe("ユーザー名", () => {
  it("全角と半角、大文字と小文字を同じものとして扱う", () => {
    // 別々のアカウントになると、本人が自分のアカウントに入れなくなる
    expect(normalizeName("Taro")).toBe(normalizeName("ＴＡＲＯ"));
    expect(normalizeName("Taro")).toBe(normalizeName("  taro  "));
    expect(normalizeName("ﾀﾛｳ")).toBe(normalizeName("タロウ"));
  });

  it("違う名前は違うままにする", () => {
    expect(normalizeName("taro")).not.toBe(normalizeName("jiro"));
    expect(normalizeName("太郎")).not.toBe(normalizeName("次郎"));
  });

  it("短すぎ・長すぎを弾き、日本語は通す", () => {
    expect(checkName("あ")).toBeTruthy();
    expect(checkName("   ")).toBeTruthy();
    expect(checkName("あ".repeat(21))).toBeTruthy();
    expect(checkName("太郎")).toBeNull();
    expect(checkName("taro")).toBeNull();
  });

  it("短いパスワードを弾く", () => {
    expect(checkPass("12345")).toBeTruthy();
    expect(checkPass("123456")).toBeNull();
  });

  it("半角の英数字と記号を通す", () => {
    expect(checkPass("abc123")).toBeNull();
    expect(checkPass("P@ss!#$%")).toBeNull();
    expect(checkPass("~`{}[]|:;\"'<>,.?/")).toBeNull();
    expect(checkPass("a\\b#$%")).toBeNull();
  });

  it("全角と空白を弾く", () => {
    // 変換を入れたまま登録すると、次に半角で打ったときに入れなくなる。
    // しかも「違います」としか出ないので、本人には理由が分からない
    expect(checkPass("ｐａｓｓｗｏｒｄ")).toBeTruthy();
    expect(checkPass("ぱすわーど")).toBeTruthy();
    expect(checkPass("pass word")).toBeTruthy();
    expect(checkPass("pass　word")).toBeTruthy();
    expect(checkPass("abc123 ")).toBeTruthy();
  });
});

describe("ユーザーID", () => {
  it("読み上げられる形に整える", () => {
    expect(shortId("3f2a1b4c-5d6e-7f80-9abc-def012345678")).toBe("3F2A-1B4C");
  });

  it("違う人には違うIDが出る", () => {
    const a = shortId("3f2a1b4c-5d6e-7f80-9abc-def012345678");
    const b = shortId("aaaaaaaa-5d6e-7f80-9abc-def012345678");
    expect(a).not.toBe(b);
  });
});

describe("合鍵", () => {
  it("切れる時刻を、返ってきた寿命より早めに置く", () => {
    // 境目ぴったりで弾かれないように、余裕を取ってある
    const before = Date.now();
    const s = sessionFrom(
      { access_token: "a", refresh_token: "r", expires_in: 3600, user: { id: "u1" } },
      "太郎",
    );
    expect(s.until).toBeGreaterThan(before);
    expect(s.until).toBeLessThan(before + 3600 * 1000);
    expect(s.userId).toBe("u1");
  });

  it("名前は相手側のものを優先し、無ければ入力を使う", () => {
    const withName = sessionFrom(
      { access_token: "a", refresh_token: "r", expires_in: 60, user: { id: "u", user_metadata: { username: "次郎" } } },
      "太郎",
    );
    expect(withName.username).toBe("次郎");

    const without = sessionFrom({ access_token: "a", refresh_token: "r", expires_in: 60 }, "太郎");
    expect(without.username).toBe("太郎");
  });

  it("次に開いたときも、ログインしたままになる", () => {
    setSession({ access: "a", refresh: "r", until: Date.now() + 9e5, userId: "u1", username: "太郎" });
    setSession(null); // その場の記憶だけ消して、開き直しを模す
    expect(session()).toBeNull();

    localStorage.setItem(
      "jidai.session",
      JSON.stringify({ access: "a", refresh: "r", until: Date.now() + 9e5, userId: "u1", username: "太郎" }),
    );
    restoreSession();
    expect(session()?.username).toBe("太郎");
  });

  it("壊れた記録では、ログインしていないことにする", () => {
    for (const bad of ["", "null", "{}", '{"access":1}', "こわれている"]) {
      localStorage.setItem("jidai.session", bad);
      restoreSession();
      expect(session(), bad).toBeNull();
    }
  });

  it("ログアウトすると、端末からも消える", () => {
    setSession({ access: "a", refresh: "r", until: Date.now() + 9e5, userId: "u1", username: "太郎" });
    expect(localStorage.getItem("jidai.session")).toBeTruthy();
    setSession(null);
    expect(localStorage.getItem("jidai.session")).toBeNull();
  });
});

describe("同期の目印", () => {
  const login = (userId: string) =>
    setSession({ access: "a", refresh: "r", until: Date.now() + 9e5, userId, username: "太郎" });

  it("一度も預けていなければ、目印は無い", () => {
    login("u1");
    expect(lastSyncAt()).toBeNull();
    expect(hasUnsent()).toBe(false);
  });

  it("預けた時刻と、送り残しの有無を覚えている", () => {
    login("u1");
    localStorage.setItem("jidai.sync", JSON.stringify({ userId: "u1", at: "2026-01-02T03:04:05Z", dirty: true }));
    expect(lastSyncAt()).toBe("2026-01-02T03:04:05Z");
    expect(hasUnsent()).toBe(true);
  });

  it("別の人の目印は使わない", () => {
    // 同じ端末を二人で使ったとき、前の人の目印を信じると
    // 相手側の進行を「知っている」と誤解して黙って踏み潰す
    localStorage.setItem("jidai.sync", JSON.stringify({ userId: "u1", at: "2026-01-02T03:04:05Z", dirty: true }));
    login("u2");
    expect(lastSyncAt()).toBeNull();
    expect(hasUnsent()).toBe(false);
  });

  it("ログインしていなければ、目印は無い", () => {
    localStorage.setItem("jidai.sync", JSON.stringify({ userId: "u1", at: "x", dirty: true }));
    setSession(null);
    expect(lastSyncAt()).toBeNull();
  });

  it("壊れた目印でも落ちない", () => {
    login("u1");
    for (const bad of ["", "{", "null", "[]"]) {
      localStorage.setItem("jidai.sync", bad);
      expect(() => lastSyncAt()).not.toThrow();
      expect(lastSyncAt(), bad).toBeNull();
    }
  });
});

describe("配り先", () => {
  /* AUTH_ON は読み込んだ時に決まるので、鍵を差し替えて読み直す。
     ここで「いまの AUTH_ON は false だ」と決め打ちすると、
     鍵を設定した途端に CI が落ちる（実際に落とした）。
     確かめるべきは値ではなく、鍵の有無との結びつき。 */
  const authOnWith = async (url: string, key: string): Promise<boolean> => {
    vi.stubEnv("VITE_SUPABASE_URL", url);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", key);
    vi.resetModules();
    return (await import("@/auth/config")).AUTH_ON;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("鍵が揃っていればアカウント機能が現れる", async () => {
    expect(await authOnWith("https://x.supabase.co", "anon-key")).toBe(true);
  });

  it("鍵が欠けていれば現れない", async () => {
    // 片方だけでは足りない。半端な設定で通信を始めないため
    expect(await authOnWith("", "")).toBe(false);
    expect(await authOnWith("https://x.supabase.co", "")).toBe(false);
    expect(await authOnWith("", "anon-key")).toBe(false);
  });
});
