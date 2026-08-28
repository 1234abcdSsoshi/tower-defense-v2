import { startEvolve } from "@/sim/evolution";
import { newGame } from "@/sim/game";
import { produceLin } from "@/sim/production";
import { useSkill } from "@/sim/skills";
import { G, setG } from "@/sim/state";
import { step } from "@/sim/step";
import type { Record_, ReplayResult } from "@/sim/types";

/* ================================================================== 記録と再現
   シード＋入力ログだけで一戦を完全に再現する。数KBで済み、
   設計書がPhase 6でサーバー側チート対策に要求している「再現検証」の土台になる。
   同時に、自己ベストをゴーストとして並走させる仕組みでもある。 */
export let REPLAY = false;
function setReplay(v: boolean): void {
  REPLAY = v;
}

export function replayRun(rec: Record_, every?: number): ReplayResult {
  if (!rec || !rec.in) return null;
  const keepG = G,
    keepR = REPLAY;
  setReplay(true);
  try {
    setG(newGame(rec.seed, rec.stage, rec));
    G.running = true;
    const byFrame = new Map();
    for (let i = 0; i < rec.in.length; i++) {
      const a = rec.in[i];
      let L = byFrame.get(a[0]);
      if (!L) {
        L = [];
        byFrame.set(a[0], L);
      }
      L.push(a);
    }
    const sp = every || 30;
    const tl: [number, number][] = [];
    let guard = 0;
    while (!G.over && guard++ < 60 * 420) {
      const acts = byFrame.get(G.frame);
      if (acts)
        for (let i = 0; i < acts.length; i++) {
          const a = acts[i];
          if (a[1] === 0) produceLin(a[2]);
          else if (a[1] === 1) startEvolve();
          else if (a[1] === 2) useSkill(a[2]); // 3（旧・奥義）は読み飛ばす
        }
      step();
      if (G.frame % sp === 0) tl.push([G.hpFoe / G.hpFoeMax, G.era]);
    }
    return {
      ok: G.over === 1,
      t: G.t,
      era: G.era,
      kills: G.st.kills,
      hpMe: G.hpMe,
      hpMeR: G.hpMe / G.hpMeMax,
      spf: sp / 60,
      tl,
    };
  } finally {
    setG(keepG);
    setReplay(keepR);
  }
}
