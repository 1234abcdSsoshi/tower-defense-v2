// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/* =====================================================================
   起動の煙感知器。
   モジュールの評価順が壊れている／index.html に無い id を触っている、
   といった「読み込んだ瞬間に落ちる」たぐいの事故をここで捕まえる。

   Canvas2D は jsdom に無いので、何を呼ばれても黙って受け流す殻を被せる。
   絵が正しいかはここでは見ない（見るべき場所でもない）。
   ===================================================================== */

/** どんなメソッド呼び出しも受け、どんなプロパティも返す殻 */
function stubContext(): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === "canvas") return { width: 800, height: 450 };
      if (prop === "measureText") return () => ({ width: 10 });
      return new Proxy(
        function () {
          return new Proxy({}, handler);
        } as unknown as Record<string, unknown>,
        handler,
      );
    },
    set: () => true,
    apply: () => new Proxy({}, handler),
  };
  return new Proxy({}, handler);
}

beforeAll(() => {
  const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
  const body = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"));
  document.body.innerHTML = body;

  // 実寸はレイアウトが無いと 0 になる。カードや結果画面が「描かない」判断へ落ちないよう与える
  for (const prop of ["offsetWidth", "offsetHeight", "offsetLeft", "offsetTop", "clientHeight"]) {
    Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, value: 400 });
  }
  window.HTMLCanvasElement.prototype.getContext = stubContext as never;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null as never,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as never;
  window.requestAnimationFrame = (() => 0) as never;
});

describe("起動", () => {
  it("main.ts を読み込んでも落ちない", async () => {
    await expect(import("@/main")).resolves.toBeDefined();
  });

  it("タイトルが表示されている", () => {
    expect(document.getElementById("titleSheet").classList.contains("show")).toBe(true);
  });

  it("盤面ができている", async () => {
    const { G } = await import("@/sim/state");
    expect(G).not.toBeNull();
    expect(G.units).toBeInstanceOf(Array);
    expect(G.team.length).toBeGreaterThan(0);
  });

  it("生産カードが編成の枠数ぶん並んでいる", async () => {
    const { cards } = await import("@/ui/cards");
    const { G } = await import("@/sim/state");
    expect(cards.length).toBe(G.team.length);
  });

  it("遊びかたがマスタから組み立てられている", () => {
    expect(document.getElementById("helpList").children.length).toBeGreaterThan(0);
  });

  it("index.html に、コードが触る id がすべてある", async () => {
    // $("...") で引いている id を総ざらいして、実物と突き合わせる
    const srcDir = path.resolve(__dirname, "../src");
    const ids = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".ts")) {
          const text = fs.readFileSync(p, "utf8");
          for (const m of text.matchAll(/\$(?:<[^>]*>)?\("([A-Za-z0-9_]+)"\)/g)) ids.add(m[1]);
        }
      }
    };
    walk(srcDir);
    expect(ids.size).toBeGreaterThan(20);
    const missing = [...ids].filter((id) => !document.getElementById(id));
    expect(missing).toEqual([]);
  });
});
