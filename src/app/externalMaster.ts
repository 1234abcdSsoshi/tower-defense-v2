/* =====================================================================
   外部マスタの差し替え。
   dist の隣に data/master.json を置くと、そちらを優先して読み込む。
   コードを1行も触らずに数値を差し替えられる状態が、運営フェーズの生命線になる。

   このモジュールが data/master.ts ではなく app/ にあるのは循環を避けるため。
   差し替え後の作り直し（パレット・カード・HUD）は UI 層に依存するので、
   データ層から UI を呼ぶ形にすると評価順が壊れる。
   ===================================================================== */
import { applyMaster, setMasterSrc } from "@/data/master";
import type { MasterData } from "@/data/types";
import { IS_WEB } from "@/platform/env";
import { clearSceneryCache } from "@/render/caches";
import { preparePalettes } from "@/render/palette";
import { newGame } from "@/sim/game";
import { G, setG } from "@/sim/state";
import { refreshCards } from "@/ui/cards";
import { syncCfgUI } from "@/ui/configPanel";
import { renderHelp } from "@/ui/help";
import { updateHud } from "@/ui/hud";

/** 外部ファイルがあればそちらを優先する。無くても内蔵データで完全に動く */
export async function tryExternalMaster(): Promise<void> {
  // Steam(Tauri)版は同梱データで固定する。差し替えは Web 配布のときだけ
  if (!IS_WEB) return;
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch("data/master.json", { cache: "no-cache" });
    if (!r.ok) return;
    const M = (await r.json()) as MasterData;
    if (!M || !Array.isArray(M.eras) || M.eras.length < 3 || !Array.isArray(M.lineages)) return;
    if (G && G.running) return; // 戦闘中の差し替えはしない
    applyMaster(M);
    setMasterSrc("外部");
    preparePalettes();
    clearSceneryCache();
    setG(newGame(1));
    refreshCards(true);
    updateHud();
    syncCfgUI();
    renderHelp();
  } catch (e) {
    /* 読めなければ内蔵データのまま続ける */
  }
}
