import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DET, qTick } from "@/render/quality";

/* =====================================================================
   終盤で画面が止まる問題の再発を防ぐ。

   原因は二つあった。
     1. 被弾した兵を ctx.filter で白く光らせていた。
        Chromium は filter 付きの描画ごとに別レイヤーを起こして合成するので、
        被弾中の兵が数十体並ぶ終盤で描画が詰まる。
     2. qTick が 60ms を超えるフレームを捨てていた。
        重くなるほど判定材料が減り、一番効いてほしい場面で
        品質の自動調整が働かなくなっていた。
   ===================================================================== */

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");

describe("毎フレームの描画に重い機能を持ち込まない", () => {
  it("ctx.filter を描画層で使っていない", () => {
    const dir = path.resolve(__dirname, "../src/render");
    const offenders: string[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".ts")) continue;
      const src = fs.readFileSync(path.join(dir, name), "utf8");
      // コメントの中で「使っていた」と説明するのは可。実際の代入だけを見る
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (/\.filter\s*=/.test(code)) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it("被弾の白抜きは焼いて使い回している", () => {
    const src = read("src/render/unitSprites.ts");
    expect(src).toMatch(/flashImage/);
    expect(src).toMatch(/source-in/);
  });
});

describe("品質の自動調整", () => {
  it("重いフレームが続けば細部を落とす", () => {
    // 60〜100ms は「捨てる」のではなく「効かせる」べき範囲
    for (let i = 0; i < 200; i++) qTick(80);
    expect(DET).toBe(0);
  });

  it("軽くなれば細部を戻す", () => {
    for (let i = 0; i < 200; i++) qTick(80);
    expect(DET).toBe(0);
    for (let i = 0; i < 200; i++) qTick(16.7);
    expect(DET).toBe(1);
  });

  it("タブを離れていた等の長い中断は平均に混ぜない", () => {
    for (let i = 0; i < 200; i++) qTick(16.7);
    expect(DET).toBe(1);
    for (let i = 0; i < 30; i++) qTick(4000); // 復帰直後の巨大な間隔
    expect(DET).toBe(1);
  });
});
