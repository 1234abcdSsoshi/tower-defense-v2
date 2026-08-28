/* =====================================================================
   決着。シムが「勝った／負けた」を確定させる唯一の場所。

   ここで結果画面を直接呼ばないのは、シムを UI から切り離しておくため。
   決着の通知だけを発行し、受け取る側（ui/result.ts）は main.ts で繋ぐ。
   おかげでシムは DOM が一切無い場所でも回せる ── ゴーストの再生も、
   テストでの再現性検証も、この分離があって初めて成り立つ。
   ===================================================================== */
import { G } from "@/sim/state";

/** 決着の受け取り手。win は勝ったか、timeout は時間切れか */
export type OutcomeListener = (win: boolean, timeout: boolean) => void;

const listeners: OutcomeListener[] = [];

/** 起動時に一度だけ登録する。登録しなくてもシムは正しく終わる */
export function onGameOver(fn: OutcomeListener): void {
  listeners.push(fn);
}

/**
 * 一戦を終わらせる。二重に呼ばれても最初の一度しか効かない。
 * G.over は 1=勝ち 2=負け。0 のあいだが「まだ続いている」。
 */
export function finishGame(win: boolean, timeout = false): void {
  if (G.over) return;
  G.over = win ? 1 : 2;
  G.running = false;
  G.endEra = G.era;
  for (const fn of listeners) fn(win, timeout);
}
