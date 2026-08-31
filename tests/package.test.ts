import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* =====================================================================
   配布物としての体裁を見張る。

   買った人は網につながずに遊ぶ。だから外部への参照が一つでも残ると、
   「うちだと字が違う」「絵が出ない」という形で表に出る。
   ここが赤いまま配ってはいけない。
   ===================================================================== */

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("外に出ない", () => {
  it("index.html が外部から何も読んでいない", () => {
    const html = read("index.html");
    const urls = html.match(/https?:\/\/[^"' )]+/g) ?? [];
    expect(urls).toEqual([]);
  });

  it("書体を同梱している", () => {
    const dir = path.join(ROOT, "src/assets/fonts");
    const woff2 = fs.readdirSync(dir).filter((f) => f.endsWith(".woff2"));
    expect(woff2.length).toBe(6);
    // 使う字だけに絞ってあること。全部入れると 35MB になる
    const total = woff2.reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
    expect(total).toBeLessThan(2 * 1024 * 1024);
  });

  it("同梱書体の @font-face が読み込まれている", () => {
    expect(read("src/styles/index.css")).toMatch(/fonts\/fonts\.css/);
    const css = read("src/assets/fonts/fonts.css");
    expect((css.match(/@font-face/g) ?? []).length).toBe(6);
    expect(css).not.toMatch(/https?:/);
  });

  it("書体のライセンスを同梱している", () => {
    expect(fs.existsSync(path.join(ROOT, "src/assets/fonts/OFL.txt"))).toBe(true);
  });

  it("Tauri の CSP が外への通信を許していない", () => {
    const csp = JSON.parse(read("src-tauri/tauri.conf.json")).app.security.csp;
    expect(csp).toMatch(/connect-src 'self'/);
    expect(csp).not.toMatch(/https:/);
  });
});

describe("ブラウザ向けの名残が消えている", () => {
  it("Service Worker を登録していない", () => {
    const dir = path.join(ROOT, "src");
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".ts") && /serviceWorker/.test(fs.readFileSync(p, "utf8")))
          offenders.push(path.relative(dir, p));
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });

  it("縦持ちの疑似回転が残っていない", () => {
    expect(fs.existsSync(path.join(ROOT, "src/platform"))).toBe(false);
    expect(read("index.html")).not.toMatch(/rotWrap|id="gate"/);
  });

  it("PWA の名残が無い", () => {
    expect(fs.existsSync(path.join(ROOT, "public/manifest.json"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "public/sw.js"))).toBe(false);
    expect(read("index.html")).not.toMatch(/manifest|apple-mobile/);
  });
});

describe("版数がそろっている", () => {
  it("package.json / tauri.conf.json / master.json / Cargo.toml が同じ", () => {
    const pkg = JSON.parse(read("package.json")).version;
    const tauri = JSON.parse(read("src-tauri/tauri.conf.json")).version;
    const master = JSON.parse(read("src/data/master.json")).version;
    const cargo = (read("src-tauri/Cargo.toml").match(/^version = "([^"]+)"/m) ?? [])[1];
    expect({ tauri, master, cargo }).toEqual({ tauri: pkg, master: pkg, cargo: pkg });
  });
});

describe("インストーラの設定", () => {
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));

  it("itch.io へ置けるインストーラを作る", () => {
    expect(conf.bundle.targets).toContain("nsis");
  });

  it("管理者権限を求めない（買った人が自分の領域へ入れられる）", () => {
    expect(conf.bundle.windows.nsis.installMode).toBe("currentUser");
  });

  it("Windows の実行ファイル用に .ico がある", () => {
    expect(conf.bundle.icon).toContain("icons/icon.ico");
    expect(fs.existsSync(path.join(ROOT, "src-tauri/icons/icon.ico"))).toBe(true);
  });
});
