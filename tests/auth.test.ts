import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* =====================================================================
   アカウント機能の土台を見張る。

   一番大事なのは「設定が無ければ今までどおり遊べる」こと。
   接続先を持たない配布物（いまの itch.io 版・Steam 版）で
   ログイン要求が出たり、起動が止まったりしてはいけない。
   ===================================================================== */

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");

describe("設定が無いときは眠っている", () => {
  it("CLOUD_ENABLED は接続先が揃ったときだけ真になる", async () => {
    // テストでは環境変数を与えていないので、必ず false 側
    const { CLOUD_ENABLED } = await import("@/net/env");
    expect(CLOUD_ENABLED).toBe(false);
  });

  it("未設定なら Supabase の窓口は null を返す（SDK も読まない）", async () => {
    const { getClient } = await import("@/net/supabase");
    await expect(getClient()).resolves.toBeNull();
  });

  it("未設定でも initAuth は落ちない", async () => {
    const { initAuth } = await import("@/net/auth");
    await expect(initAuth()).resolves.toBeUndefined();
  });

  it("未設定ならログインしていない扱い", async () => {
    const { ACCOUNT } = await import("@/net/auth");
    expect(ACCOUNT).toBeNull();
  });

  it("ログインしていなければ、保存はアカウントへ送られない", async () => {
    const { queueCloudPush, flushCloudPush } = await import("@/save/cloud");
    expect(() => queueCloudPush()).not.toThrow();
    await expect(flushCloudPush()).resolves.toBeUndefined();
  });
});

describe("合言葉を抱え込まない", () => {
  it("入力した合言葉を localStorage へ書いていない", () => {
    const src = read("src/net/auth.ts") + read("src/ui/authSheet.ts");
    expect(src).not.toMatch(/localStorage\.setItem\([^)]*(pass|password|合言葉)/i);
  });

  it("認証の窓口以外がパスワードを受け取っていない", () => {
    // password を触ってよいのは net/auth.ts と、入力欄を持つ authSheet.ts だけ
    const dir = path.resolve(__dirname, "../src");
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".ts")) {
          const rel = path.relative(dir, p).replaceAll("\\", "/");
          if (rel === "net/auth.ts" || rel === "ui/authSheet.ts") continue;
          if (/password/i.test(fs.readFileSync(p, "utf8"))) offenders.push(rel);
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });
});

describe("鍵と設定の扱い", () => {
  it("接続先をソースへ直書きしていない", () => {
    const dir = path.resolve(__dirname, "../src");
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".ts") && /https:\/\/[a-z0-9]+\.supabase\.co/.test(fs.readFileSync(p, "utf8")))
          offenders.push(path.relative(dir, p));
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });

  it(".env を Git から外してある", () => {
    const ignore = read(".gitignore");
    expect(ignore).toMatch(/^\.env$/m);
  });

  it("service_role キーをどこにも置いていない", () => {
    for (const rel of [".env.example", "supabase/schema.sql", "docs/AUTH.md"]) {
      const p = path.resolve(__dirname, "..", rel);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      expect(/service_role\s*[:=]\s*\S/.test(text), rel).toBe(false);
    }
  });
});

describe("行レベルセキュリティ", () => {
  const sql = read("supabase/schema.sql");

  it("両方の表で RLS を有効にしている", () => {
    expect(sql).toMatch(/alter table public\.profiles enable row level security/);
    expect(sql).toMatch(/alter table public\.saves enable row level security/);
  });

  it("自分の行だけを読み書きできる形になっている", () => {
    // 実際に流れる SQL だけを見る（-- で始まる行は説明とこれからの案）
    const live = sql
      .split(String.fromCharCode(10))
      .filter((l) => !l.trimStart().startsWith("--"))
      .join(String.fromCharCode(10));
    // ポリシーの条件が auth.uid() = user_id で揃っていること
    const policies = live.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(7);
    for (const p of policies) {
      expect(p, p.slice(0, 60)).toMatch(/auth\.uid\(\) = user_id/);
    }
  });

  it("Tauri の CSP が Supabase への接続を許している", () => {
    const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
    expect(conf.app.security.csp).toMatch(/connect-src[^;]*supabase\.co/);
    // 実行元は広げない。スクリプトは自分の中のものだけ
    expect(conf.app.security.csp).toMatch(/default-src 'self'/);
  });
});
