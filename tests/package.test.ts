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

describe("外に出ない（買った人は網につながずに遊べる）", () => {
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

describe("ブラウザでも遊べる", () => {
  /* GitHub Pages（のちに itch.io）で、入れずに遊べるようにしてある。
     手元に入れて遊ぶ版（Tauri）と同じコードから両方を作る。 */

  it("Service Worker があり、Web 版だけで登録する", () => {
    expect(fs.existsSync(path.join(ROOT, "public/sw.js"))).toBe(true);
    const main = read("src/main.ts");
    expect(main).toMatch(/IS_WEB && "serviceWorker" in navigator/);
  });

  it("PWA のマニフェストとアイコンがある", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.orientation).toBe("landscape");
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(fs.existsSync(path.join(ROOT, "public", icon.src.replace("./", ""))), icon.src).toBe(true);
    }
    expect(read("index.html")).toMatch(/rel="manifest"/);
  });

  it("縦持ちの端末でも遊べる（疑似回転）", () => {
    expect(fs.existsSync(path.join(ROOT, "src/platform/orientation.ts"))).toBe(true);
    expect(read("index.html")).toMatch(/id="rotWrap"/);
    expect(read("index.html")).toMatch(/id="gate"/);
    expect(read("src/styles/index.css")).toMatch(/orientation\.css/);
  });

  it("どの階層へ置いても動くよう、参照を相対にしてある", () => {
    // Pages は /<repo>/ の下、Tauri は file:// 相当。絶対パスだと真っ白になる
    expect(read("vite.config.ts")).toMatch(/base:\s*"\.\/"/);
  });

  it("Web とデスクトップを同じコードから作り分けている", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.build).toMatch(/VITE_TARGET=web/);
    expect(pkg.scripts["build:desktop"]).toMatch(/VITE_TARGET=desktop/);
    const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
    expect(conf.build.frontendDist).toBe("../dist/desktop");
  });
});

describe("原寸素材に頼っていない", () => {
  /* asset/ は Git で追跡していない（247MB あり、履歴が膨らむため）。
     clone しただけでは付いてこないので、ビルドがこれを要求してはいけない。
     ゲームが読むのは、書き出し済みの src/assets/ のほう。 */

  it("asset/ を追跡から外してある", () => {
    expect(read(".gitignore")).toMatch(/^asset\/$/m);
  });

  it("ソースが asset/ を読んでいない", () => {
    const dir = path.join(ROOT, "src");
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|css)$/.test(e.name)) {
          const code = fs.readFileSync(p, "utf8");
          // "../asset/" や "/asset/" のような、原寸側への参照
          if (/["'`][^"'`]*\.\.\/asset\//.test(code)) offenders.push(path.relative(dir, p));
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });

  it("実行用の絵は追跡されている（これが無いとビルドできない）", () => {
    const units = fs.readdirSync(path.join(ROOT, "src/assets/units"));
    expect(units.filter((f) => f.endsWith(".png")).length).toBeGreaterThan(20);
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

  it("実行ファイル名を ASCII にしてある", () => {
    // 窓の題とショートカットの名は productName（日本語）が出る。
    // ファイル名だけ ASCII にして、配布先や古い道具での文字化けを避ける
    expect(conf.mainBinaryName).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("インストーラ自身にもゲームのアイコンを使う", () => {
    expect(conf.bundle.windows.nsis.installerIcon).toBe("icons/icon.ico");
  });

  it("Windows の実行ファイル用に .ico がある", () => {
    expect(conf.bundle.icon).toContain("icons/icon.ico");
    expect(fs.existsSync(path.join(ROOT, "src-tauri/icons/icon.ico"))).toBe(true);
  });
});
