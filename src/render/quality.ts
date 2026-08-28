import { resize } from "@/render/viewport";
import { G } from "@/sim/state";
import { refreshCards } from "@/ui/cards";

// 描画負荷が上がったら自動で細部を落とす。60fpsを最優先する
export let DET = 1,
  _fEma = 16.7,
  DPR_CAP = 2,
  _dprCool = 0;
// 判定にはフレーム間隔を使う。JS側の実行時間だけではGPU側の詰まりが見えないため。
// 細部を削っても追いつかない端末では、最後の手段として描画解像度を落とす。
// 実測では毎フレームの転送画素数が支配的で、これが一番効く。
export function qTick(ms: number): void {
  if (ms > 60) return;
  _fEma = _fEma * 0.88 + ms * 0.12;
  DET = _fEma > 20.5 ? 0 : _fEma < 18.0 ? 1 : DET;
  if (_dprCool > 0) {
    _dprCool--;
    return;
  }
  if (_fEma > 21.5 && DET === 0 && DPR_CAP > 1.16) {
    DPR_CAP = Math.max(1.15, DPR_CAP - 0.35);
    _dprCool = 150;
    resize();
    if (G) {
      refreshCards(true);
    }
  }
}
