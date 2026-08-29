import { AU } from "@/audio/index";
import { BAL, NE, SHOT } from "@/data/master";
import { shade } from "@/render/color";
import { linPal } from "@/render/palette";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { G, vrng } from "@/sim/state";
import type { ShotSpec } from "@/data/types";
import type { Side, Unit } from "@/sim/types";

/* 飛び道具（見た目専用：ダメージは発射と同時に確定済み） */
export function shotSpecOf(u: Unit): ShotSpec {
  if (u.arm === "archer") return u.era >= NE - 1 ? SHOT.bolt : u.era >= 3 ? SHOT.gun : SHOT.bowA;
  if (u.arm === "mystic") return SHOT.orb;
  if (u.arm === "siege") return SHOT.shell;
  if (u.arm === "air") return SHOT.bomb;
  return null;
}
export function spawnShot(u: Unit, tx: number, tw: number, tfly: boolean): void {
  if (REPLAY) return;
  const sp = shotSpecOf(u);
  if (!sp || G.shots.length > 70) return;
  const P = linPal(u.lin, u.era);
  const col =
    sp.kind === "orb"
      ? P.cloth
      : sp.kind === "bolt"
        ? P.accent
        : sp.kind === "bullet"
          ? "#FFE6A8"
          : sp.kind === "shell"
            ? shade(P.metal, 0.5)
            : shade(P.cloth2, 0.7);
  const jit = (vrng() - 0.5) * 3.2;
  const AY = BAL.airY || 56;
  G.shots.push({
    x0: u.x + u.dir * sp.ox * u.w,
    y0: sp.oy * u.w + (u.fly ? AY : 0),
    x1: tx,
    y1: (tfly ? AY + 14 : tw ? 16 * tw : 30) + jit,
    p: 0,
    dur: sp.dur * (0.92 + vrng() * 0.16),
    kind: sp.kind,
    col,
    z: u.z,
    w: u.w,
    dir: u.dir,
    arc: sp.arc,
  });
  if (sp.kind === "bullet" || sp.kind === "bolt" || sp.kind === "shell") {
    spawnParts(
      sx(u.x + u.dir * sp.ox * u.w),
      GY - (sp.oy * u.w + (u.fly ? AY : 0)) * SC - (u.z || 0) * 13 * SC,
      3,
      sp.kind === "shell" ? "#FFC98A" : "#FFE9B0",
      2.6,
    );
  }
}
export function spawnCastleShot(side: Side, tx: number): void {
  if (REPLAY) return;
  const sp = SHOT.aa || SHOT.gun;
  if (!sp || G.shots.length > 70) return;
  const x0 = side === 0 ? BAL.laneL + 4 : BAL.laneR - 4;
  G.shots.push({
    x0,
    y0: 74,
    x1: tx,
    y1: (BAL.airY || 56) + 16,
    p: 0,
    dur: 0.18,
    kind: "bullet",
    col: "#FFE6A8",
    z: 0.02,
    w: 1,
    dir: side === 0 ? 1 : -1,
    arc: 0,
  });
  AU.fx("castle");
}
export function addCorpse(u: Unit): void {
  if (REPLAY) return;
  if (u.fly) return;
  /* 妖と時代の主は死骸を残さない。
     死骸は lin / arm だけを写した軽い記録で、mon・lord・art の印までは持たない。
     そのまま drawUnitAt へ渡すと、それらの分岐に入れず「系譜0の兵士」として
     描かれてしまう ── 妖が倒れた瞬間に兵士が現れて倒れる、という別物の絵になる。
     人型でないものは、消えるときも兵士の姿を借りない。 */
  if (u.mon || u.lord) return;
  if (G.corpses.length > 34) G.corpses.shift();
  G.corpses.push({
    lin: u.lin,
    era: u.era,
    side: u.side,
    arm: u.arm,
    x: u.x,
    w: u.w,
    hh: u.hh,
    z: u.z,
    dir: u.dir,
    speed: u.speed,
    st: "idle",
    flash: 0,
    hitFx: 0,
    atkA: 0,
    age: 0,
  });
}
export function spawnParts(x: number, y: number, n: number, col: string, sp?: number): void {
  if (REPLAY) return;
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 380) break;
    const a = vrng() * 6.283,
      v = (0.4 + vrng()) * sp;
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - v * 0.5,
      l: 0.42 + vrng() * 0.3,
      m: 0.42 + vrng() * 0.3,
      c: col,
    });
  }
}
/** 飛び道具の着弾を一瞬だけ大きく読ませる、拡散する光輪。 */
export function spawnImpact(x: number, y: number, col: string, radius: number): void {
  if (REPLAY || G.parts.length > 410) return;
  G.parts.push({ x, y, vx: 0, vy: 0, l: 0.24, m: 0.24, c: col, k: 3, g: 0, r: radius });
}
// 火花：ぶつかった向きへ細く飛ぶ。刃と刃が噛んだ手応えを出す
export function spawnSpark(x: number, y: number, n: number, col: string, sp: number, dir: number): void {
  if (REPLAY) return;
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 420) break;
    const a = (vrng() - 0.5) * 1.9 - 0.55,
      v = (0.5 + vrng() * 0.9) * sp;
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * v * dir,
      vy: Math.sin(a) * v,
      l: 0.2 + vrng() * 0.16,
      m: 0.2 + vrng() * 0.16,
      c: col,
      k: 1,
      g: 0.3,
    });
  }
}
// 土埃：足元に低く広がる。踏み込みと戦死の重さを出す
export function spawnDust(x: number, y: number, n: number, sp?: number): void {
  if (REPLAY) return;
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 420) break;
    const a = vrng() * 6.283,
      v = (0.3 + vrng() * 0.7) * sp;
    G.parts.push({
      x,
      y: y - vrng() * 2 * SC,
      vx: Math.cos(a) * v,
      vy: -Math.abs(Math.sin(a)) * v * 0.42,
      l: 0.42 + vrng() * 0.34,
      m: 0.42 + vrng() * 0.34,
      c: "rgba(196,182,158,0.42)",
      k: 2,
      g: -0.012,
      r: (1.6 + vrng() * 2.2) * SC,
    });
  }
}
