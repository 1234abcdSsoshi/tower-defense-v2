import { GY, SC, sx } from "@/render/viewport";
import { spawnParts } from "@/sim/fx";
import { G } from "@/sim/state";

/* ---------- 演出だけの更新（シムには触れない） ---------- */
export function updateFx(dt: number): void {
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.p += dt / s.dur;
    if (s.p >= 1) {
      spawnParts(
        sx(s.x1),
        GY - s.y1 * SC - (s.z || 0) * 13 * SC,
        s.kind === "shell" ? 10 : 5,
        s.kind === "orb" || s.kind === "bolt" ? s.col : "#FFD9A0",
        s.kind === "shell" ? 3.8 : 2.8,
      );
      G.shots.splice(i, 1);
    }
  }
  for (let i = G.corpses.length - 1; i >= 0; i--) {
    const k = G.corpses[i];
    k.age += dt;
    if (k.age > 0.62) G.corpses.splice(i, 1);
  }
  if (G.wave > 0) G.wave = Math.max(0, G.wave - dt / 1.05);
}
