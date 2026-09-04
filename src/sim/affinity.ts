import { AFF, ATTR_AFF, AWE, BAL, armMul, attrMulOf, attrSide } from "@/data/master";
import { G } from "@/sim/state";
import type { Arm } from "@/data/types";
import type { Unit } from "@/sim/types";

// 拠点への倍率。攻城は城を割るためにいる、飛行は空から落とす
export function dmgMul(u: Unit, o: Unit): number {
  let m = armMul(u.arm, o.arm);
  // 剣士：兵科の不利を受けない（有利はそのまま乗る）
  if (u.even && AFF && m < 1) m = 1;
  // この系譜が「その兵科に強い／弱い」
  if (u.vs && u.vs[o.arm] !== undefined) m *= u.vs[o.arm];
  // 相手が「その兵科に脆い」
  if (o.weak && o.weak[u.arm] !== undefined) m *= o.weak[u.arm];
  // 防御特化：受ける被害そのものを減らす
  if (o.tough && o.tough !== 1) m *= o.tough;
  if (u.side === 0 && G.bAdv > 0 && AFF && AFF.adv > m) m = AFF.adv;
  if (o.side === 1 && G.bQuake > 0) m *= G.quakeMul || 2; // 地震：足元が崩れて的になる
  if (u.curse > 0) m *= u.curseV || 0.6; // 呪い・弱体化
  if (o.armor && u.arm !== "siege" && u.arm !== "archer") m *= BAL.armorMul || 0.5; // 装甲列車

  /* 属性の三すくみ（妖怪→人間→退魔師→妖怪）。
     兵科より弱く効かせ、掛け合わせた結果に頭打ちを入れる。
     素直に掛けると 1.9×1.9 ÷ (0.45×0.45) で 17.8 倍まで開き、読み合いが成立しない。 */
  m *= attrMulOf(u.attr, o.attr, u.era);
  // 畏が高いほど退魔師は力を得る。妖を使うほど、討つ手が厳しくなる
  if (u.attr === "tai" && AWE && G.awe > 0) m *= 1 + (AWE.taiPow || 0) * G.awe;
  if (ATTR_AFF) m = Math.max(ATTR_AFF.clampLo, Math.min(ATTR_AFF.clampHi, m));
  return m;
}

/**
 * 狙う相手を選ぶときの重み。属性が有利な相手を先に狙う。
 * 数値をいじらずに三すくみを盤面へ出すための、いちばん安い層。
 * 返す値は「見かけの距離」の割引率で、小さいほど優先される。
 */
export function targetBias(u: Unit, o: Unit): number {
  const side = attrSide(u.attr, o.attr);
  if (side > 0) return BAL.attrSeek ?? 0.62;
  if (side < 0) return 1 / (BAL.attrSeek ?? 0.62);
  return 1;
}
export function castleMulOf(arm: Arm): number {
  if (!AFF) return 1;
  if (arm === "siege") return AFF.siegeCastle || 1;
  if (arm === "air") return AFF.airCastle || 1;
  return 1;
}

// 飛行に攻撃が届くのは弓だけ
export function canHit(atk: Arm, def: Arm): boolean {
  return def !== "air" || atk === "archer";
}
