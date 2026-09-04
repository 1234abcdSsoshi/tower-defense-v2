/* =====================================================================
   畏（おそれ）── 世が怪異をどれだけ信じているか。0〜1。

   妖を呼び、妖が敵を倒すほど上がる。放っておけば下がる。
   高いほど退魔師（術）が力を得るので、
   妖に頼るほど討たれやすくなる ── アクセルとブレーキが同じレバーになる。

   乱数は使わない。同じ種と同じ入力なら同じ値になる。
   ===================================================================== */
import { AWE } from "@/data/master";
import { DT } from "@/core/constants";
import { G } from "@/sim/state";

/** 畏を動かす。0〜1 に収める */
export function addAwe(d: number): void {
  if (!G) return;
  G.awe = Math.max(0, Math.min(1, (G.awe || 0) + d));
}

/** 妖を呼んだ */
export function aweSummon(): void {
  addAwe(AWE?.summon ?? 0);
}

/** 妖が敵を倒した */
export function aweKill(): void {
  addAwe(AWE?.kill ?? 0);
}

/** 毎フレームの自然減。怪異が起きなければ、世は忘れていく */
export function aweTick(): void {
  if (!G || !AWE) return;
  if (G.awe > 0) addAwe(-(AWE.decay || 0) * DT);
}
