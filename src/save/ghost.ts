import { REC_V } from "@/core/constants";
import { MASTER_STAGES } from "@/data/master";
import { replayRun } from "@/save/replay";
import { SAVE, saveNow } from "@/save/save";
import { G } from "@/sim/state";
import type { ReplayResult } from "@/sim/types";

/* ゴーストの推移から、いまの時刻に対応する敵城HP比を引く */
export function ghostAt(t: number): [number, number] {
  const g2 = G.ghost;
  if (!g2 || !g2.tl.length) return null;
  const i = Math.min(g2.tl.length - 1, Math.floor(t / g2.spf));
  return g2.tl[i];
}
export function loadGhost(stageIdx: number): ReplayResult {
  const st = MASTER_STAGES[stageIdx];
  if (!st || !SAVE.ghost) return null;
  const rec = SAVE.ghost[st.id];
  if (!rec) return null;
  if (rec.rv !== REC_V) {
    delete SAVE.ghost[st.id];
    saveNow();
    return null;
  } // 旧形式は破棄
  const r = replayRun(rec, 30);
  return r && r.ok ? r : null;
}
/* 勝った戦が自己ベストなら、その入力ログをゴーストとして残す */
export function maybeSaveGhost(): boolean {
  if (!G || G.over !== 1) return false;
  const st = MASTER_STAGES[G.stage];
  if (!st) return false;
  const rec = G.rec;
  if (!rec || rec.in.length > 4000) return false;
  const prev = SAVE.ghost[st.id];
  const secs = G.t;
  if (prev && prev.tSec !== undefined && prev.tSec <= secs) return false;
  rec.tSec = secs;
  rec.era = G.era;
  SAVE.ghost[st.id] = rec;
  saveNow();
  return true;
}
