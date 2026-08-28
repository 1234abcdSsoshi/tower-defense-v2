/* =====================================================================
   UI 側の可変状態。ES モジュールの export は読み取り専用なので、
   他モジュールから書き換えるものは必ず setter を通す。
   「どこから書き換わりうるか」が import 一覧で追えるようにするための形。
   ===================================================================== */
import { SPD_BASE, SPD_OPTS } from "@/core/constants";

/** 一時停止中か。設定シートを開いたときも true になる */
export let paused = false;
export function setPaused(v: boolean): void {
  paused = v;
}

/** SPD_OPTS のどれを選んでいるか */
export let speedIdx = 0;
export function setSpeedIdx(v: number): void {
  speedIdx = v;
}

/** 実際にシムへ掛ける倍率（= 選択倍率 × SPD_BASE） */
export let speedMul: number = SPD_OPTS[0] * SPD_BASE;
export function setSpeedMul(v: number): void {
  speedMul = v;
}
