/* 討伐の隊 ── 畏が高まったときだけ現れる敵。
   いちばん大事なのは「畏 0 では既存の戦が一切変わらないこと」。 */
import { beforeEach, describe, expect, it } from "vitest";
import { AWE, LIN, MASTER_STAGES } from "@/data/master";
import { newGame } from "@/sim/game";
import { step } from "@/sim/step";
import { G, setG } from "@/sim/state";

/** step.ts と同じ式で、湧きの重みを組む */
function weights(era: number, awe: number): number[] {
  return G.foePool.map((p) => {
    const L = LIN[p.lin];
    if (era < (L.debut || 0)) return 0;
    let w = Math.max(0, p.w + (p.wEra || 0) * era);
    if (L.attr === "tai" && AWE) w = w * (1 + (AWE.taiWave || 0) * awe) + (p.wAwe || 0) * awe;
    return w;
  });
}

beforeEach(() => setG(newGame(20260904, 0)));

describe("畏 0 のとき、既存の戦は変わらない", () => {
  it("畏でだけ現れる枠は、重みが 0 になる", () => {
    // 見分けるのは wAwe を持つかどうか。w が 0 でも wEra で
    // 時代とともに現れる枠（惑わす者）が別にあるので、そちらと混同しない
    for (let i = 0; i < MASTER_STAGES.length; i++) {
      setG(newGame(1, i));
      for (let era = 0; era < 6; era++) {
        const w = weights(era, 0);
        G.foePool.forEach((p, k) => {
          if (p.wAwe !== undefined) expect(w[k], `戦${i + 1} era${era} ${LIN[p.lin].id}`).toBe(0);
        });
      }
    }
  });

  it("重みの合計が、足す前と同じになる", () => {
    // wAwe を無かったことにした重みと突き合わせる。
    // 合計が同じなら、乱数の消費も選ばれる相手も変わらない
    for (let i = 0; i < MASTER_STAGES.length; i++) {
      setG(newGame(1, i));
      for (let era = 0; era < 6; era++) {
        const now = weights(era, 0).reduce((a, b) => a + b, 0);
        const before = G.foePool
          .map((p) => {
            const L = LIN[p.lin];
            if (era < (L.debut || 0)) return 0;
            return Math.max(0, p.w + (p.wEra || 0) * era);
          })
          .reduce((a, b) => a + b, 0);
        expect(now, `戦${i + 1} era${era}`).toBeCloseTo(before, 9);
      }
    }
  });

  it("盤面が同じに進む", () => {
    const run = (): string => {
      setG(newGame(4242, 3));
      G.running = true;
      for (let i = 0; i < 60 * 60; i++) {
        G.awe = 0; // 畏を上げないまま回す
        step();
        if (G.over) break;
      }
      return `${G.units.length}/${Math.round(G.hpFoe)}/${Math.round(G.hpMe)}/${G.st.spawned}`;
    };
    expect(run()).toBe(run());
  });
});

describe("畏が高まると討伐が来る", () => {
  it("原始でも隊が現れる ── 畏 0 では居なかった者", () => {
    setG(newGame(1, 0));
    const calm = weights(0, 0);
    const dread = weights(0, 1);
    const tai = G.foePool.map((p, k) => ({ id: LIN[p.lin].id, attr: LIN[p.lin].attr, calm: calm[k], dread: dread[k] }));
    const orders = tai.filter((t, k) => t.attr === "tai" && G.foePool[k].wAwe !== undefined);
    expect(orders.length, "退魔師の枠が無い").toBeGreaterThan(0);
    expect(orders.every((t) => t.calm === 0), "畏 0 で既に居る").toBe(true);
    expect(orders.some((t) => t.dread > 0), "畏 100 でも来ない").toBe(true);
  });

  it("時代が進んでも、畏で厚くなる", () => {
    setG(newGame(1, 0));
    for (let era = 1; era < 6; era++) {
      const share = (awe: number): number => {
        const w = weights(era, awe);
        const all = w.reduce((a, b) => a + b, 0);
        const tai = w.reduce((a, b, k) => a + (LIN[G.foePool[k].lin].attr === "tai" ? b : 0), 0);
        return tai / all;
      };
      expect(share(1), `era${era}`).toBeGreaterThan(share(0) * 2);
    }
  });

  it("討伐の隊は原始から出られる", () => {
    for (const id of ["honehun", "shaman", "himiko"]) {
      const L = LIN.find((x) => x.id === id);
      expect(L.debut, id).toBe(0);
      expect(L.attr, id).toBe("tai");
    }
  });
});
