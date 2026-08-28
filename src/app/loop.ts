import { AU } from "@/audio/index";
import { DT } from "@/core/constants";
import { updateFx } from "@/render/effects";
import { DET, qTick } from "@/render/quality";
import { render } from "@/render/scene";
import { DPR } from "@/render/viewport";
import { G } from "@/sim/state";
import { step } from "@/sim/step";
import { CFG } from "@/ui/config";
import { $ } from "@/ui/dom";
import { updateHud } from "@/ui/hud";
import { paused, speedMul } from "@/ui/state";

/* ---------- ループ ---------- */
export let last = 0,
  acc = 0;
/** HUD は毎フレーム書き換えなくてよい。3フレームに1回へ間引く */
let hudN = 0;
let fpsAcc = 0,
  fpsN = 0;
/** 起動時に最初のフレーム時刻を入れる */
export function setLast(v: number): void {
  last = v;
}
/** 開戦時に持ち越し時間を捨てる */
export function resetAcc(): void {
  acc = 0;
}
export function frame(ts: number): void {
  requestAnimationFrame(frame);
  const now = ts / 1000;
  let dt = now - last;
  last = now;
  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;
  if (G && G.running && !paused) {
    const sdt = dt * speedMul;
    if (G.hitStop > 0) {
      G.hitStop -= sdt;
    } // 手応えのための一瞬の静止
    else {
      acc += sdt;
      const cap = Math.max(14, Math.ceil(speedMul * 6));
      let gd = 0;
      while (acc >= DT && gd++ < cap) {
        step();
        acc -= DT;
      }
      updateFx(sdt);
    }
  } else if (G) {
    acc = 0;
    if (G.evoFlash > 0 || G.shake > 0 || G.bgFade < 1) {
      /* 演出のみ進める */
      G.evoFlash = Math.max(0, G.evoFlash - dt * 2.4);
      G.shake = Math.max(0, G.shake - dt * 34);
      G.bgFade = Math.min(1, G.bgFade + dt * 1.5);
    }
  }
  if (G) render(now);
  qTick(dt * 1000);
  AU.hitBudget = Math.min(3, AU.hitBudget + dt * 18);
  if (++hudN % 3 === 0) updateHud();
  fpsAcc += dt;
  fpsN++;
  if (fpsAcc >= 0.5) {
    if (CFG.fps)
      $("fps").innerHTML =
        "<b>" +
        (fpsN / fpsAcc).toFixed(0) +
        "</b> fps <i>／</i> " +
        (G ? G.units.length : 0) +
        "体" +
        " <i>／</i> 解像度 <b>" +
        DPR.toFixed(2) +
        "x</b> <i>／</i> 詳細 <b>" +
        (DET ? "高" : "低") +
        "</b>";
    fpsAcc = 0;
    fpsN = 0;
  }
}
