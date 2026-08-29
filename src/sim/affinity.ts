import { AFF, BAL, armMul } from "@/data/master";
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
  return m;
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
