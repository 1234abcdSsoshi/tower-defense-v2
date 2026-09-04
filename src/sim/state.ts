/* =====================================================================
   対局そのもの（G）を持つ唯一のモジュール。
   G は「一戦ぶんの全状態」で、シム・描画・UI のどこからでも読まれる。
   書き換えは setG() だけに絞ってあり、誰が対局を差し替えたかを
   import 一覧から追えるようにしてある。
   ===================================================================== */
import { mulberry32 } from "@/core/rng";
import type { GameState, Unit } from "@/sim/types";

/** いま進行している対局。タイトル画面でも「見せるだけの盤面」が入っている */
export let G: GameState = null;
export function setG(next: GameState): void {
  G = next;
}

/**
 * 演出用の乱数。G.rng とは別に持つ。
 * 破片の飛び散りかたのような「結果に影響しない揺らぎ」をここから引くことで、
 * 演出を増やしてもリプレイが一致しなくなることがない。
 */
export let vrng: () => number = mulberry32(12345);
export function setVrng(next: () => number): void {
  vrng = next;
}

/** 奥行きは専用の線形合同法で決める。G.rng を消費しないのでバランスに影響しない */
export function nextZ(): number {
  G.zSeq = (G.zSeq * 1664525 + 1013904223) >>> 0;
  return (G.zSeq >>> 17) / 32768;
}

export function addUnit(u: Unit): Unit {
  /* 奥行き。道が二本以上あるときは、道ごとに帯を分けて重ねる。
     手前が水、奥が陸。z は描画にしか効かないので、
     一本道（lanes<=1）では今までどおり全域に散らばる。 */
  const n = G.lanes || 1;
  u.z = n <= 1 ? nextZ() : (u.lane + nextZ() * 0.62) / n;
  G.units.push(u);
  return u;
}
