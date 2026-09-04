/* =====================================================================
   里（さと）── 線の上に立つ固定の集落。民が住んでいる。

   どちらの陣営のものでもなく、近づいた側が保つ。保っているあいだ
   石高が入り続ける。つまり「前線をどこまで押したか」がそのまま収入になる。

   妖はこれを喰える。喰えば一度に大きく入り、妖自身の名も上がる（畏）が、
   里は廃村になり、以後は誰の収入にもならない。
   ── 攻めと持続が同じ場所で衝突する。

   乱数は使わない。位置も判定も決まりきった手順で決まる。
   ===================================================================== */
import { DT } from "@/core/constants";
import { BAL, SATO } from "@/data/master";
import { addAwe } from "@/sim/awe";
import { G } from "@/sim/state";
import { toast } from "@/ui/dom";
import type { Sato } from "@/sim/types";

/** 戦のはじめに里を並べる */
export function makeSato(): Sato[] {
  if (!SATO || !SATO.at) return [];
  return SATO.at.map((x) => ({ x, side: -1, ruin: false, fx: 0 }));
}

/**
 * 里を一巡見る。
 *   1. 妖が居れば喰われる（廃村になる）
 *   2. でなければ、片側の兵だけが居るなら、その側が保つ
 *   3. 保っている側に石高が入る
 */
export function satoTick(): void {
  if (!G || !G.sato || !G.sato.length || !SATO) return;
  const r = SATO.hold || 34;
  const regen = BAL.kokuRegen[G.era] || 0;

  for (const s of G.sato) {
    if (s.fx > 0) s.fx -= DT;
    if (s.ruin) {
      // 焼けた土地は畏を残し続ける。忘れられるまで世は落ち着かない
      addAwe((SATO.ruinAwe || 0) * DT * 0.25);
      continue;
    }

    let mine = 0,
      foe = 0,
      eater = null;
    for (const u of G.units) {
      if (u.dead || Math.abs(u.x - s.x) > r) continue;
      if (u.attr === "yo") eater = u;
      if (u.side === 0) mine++;
      else foe++;
    }

    // 妖が来た。民は喰われる
    if (eater) {
      s.ruin = true;
      s.side = -1;
      s.fx = 1;
      G.koku = Math.min(kokuCap(), G.koku + regen * (SATO.eat || 0));
      addAwe(SATO.eatAwe || 0);
      toast("里が喰われた　畏が高まる", "#C79BE8");
      continue;
    }

    // 片側だけが立っていれば、その側のものになる
    if (mine > 0 && foe === 0) s.side = 0;
    else if (foe > 0 && mine === 0) s.side = 1;

    // 保っている側へ入る。こちらの分だけを石高に足す
    if (s.side === 0) G.koku = Math.min(kokuCap(), G.koku + regen * (SATO.rate || 0) * DT);
  }
}

/** いま自分が保っている里の数。HUD と結果画面に出す */
export function satoHeld(side: 0 | 1): number {
  if (!G || !G.sato) return 0;
  let n = 0;
  for (const s of G.sato) if (!s.ruin && s.side === side) n++;
  return n;
}

/** 廃村になった数 */
export function satoRuined(): number {
  if (!G || !G.sato) return 0;
  let n = 0;
  for (const s of G.sato) if (s.ruin) n++;
  return n;
}

/* kokuCapOf は unit.ts にあるが、循環参照を避けてここで薄く持つ */
function kokuCap(): number {
  return BAL.kokuMax[G.era] * 4;
}
