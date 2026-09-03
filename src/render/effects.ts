import { GY, SC, sx } from "@/render/viewport";
import { spawnImpact, spawnParts, spawnPoisonCloud } from "@/sim/fx";
import { G } from "@/sim/state";

/* ---------- 演出だけの更新（シムには触れない） ---------- */
export function updateFx(dt: number): void {
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.p += dt / s.dur;
    if (s.p >= 1) {
      const ix = sx(s.x1),
        iy = GY - s.y1 * SC - (s.z || 0) * 13 * SC;
      const explosive = s.kind === "shell" || s.kind === "bomb" || s.kind === "missile";
      spawnParts(
        ix,
        iy,
        explosive ? 10 : 5,
        s.kind === "orb" || s.kind === "bolt" ? s.col : "#FFD9A0",
        explosive ? 3.8 : 2.8,
      );
      spawnImpact(ix, iy, explosive ? "#FFC078" : s.col, (explosive ? 15 : 8) * SC);
      if (s.kind === "venom") spawnPoisonCloud(ix, iy + 7 * SC, 34 * SC);
      G.shots.splice(i, 1);
    }
  }
  for (let i = G.corpses.length - 1; i >= 0; i--) {
    const k = G.corpses[i];
    k.age += dt;
    if (k.age > 0.62) G.corpses.splice(i, 1);
  }
  // 波が横切るまでの秒数。津波の発動間隔（master の every）より短く保つこと。
  // 長くすると前の波が残ったまま次が始まり、二枚重なって見える
  if (G.wave > 0) G.wave = Math.max(0, G.wave - dt / 1.7);
}
