/* =====================================================================
   設定（音・速度・制限時間・進化硬直・表示）。
   localStorage に載る唯一の「遊びかたの好み」で、進行データ（SAVE）とは別物。

   CFG の初期値をマスタから引いていないのは意図的。
   このモジュールはマスタより先に評価されうるので、
   静的な既定値で組み立てておき、initConfig() でマスタと保存値を上から塗る。
   ===================================================================== */
import { CFG_KEY, SPD_OPTS } from "@/core/constants";
import { BAL, LOCK_OPTS } from "@/data/master";

export interface Config {
  /** 進化の硬直（秒） */
  lock: number;
  fps: boolean;
  bgm: boolean;
  sfx: boolean;
  vol: number;
  mute: boolean;
  /** 兵科マークを頭の上に出すか */
  mark: boolean;
  /** 選んでいる速度倍率（SPD_OPTS のいずれか） */
  spd: number;
  /** 制限時間（中の秒）。0 は無制限 */
  tl: number;
  /** 無制限にする前の値。戻すときに使う */
  tlBack: number;
}

export const CFG: Config = {
  lock: 6,
  fps: false,
  bgm: true,
  sfx: true,
  vol: 0.7,
  mute: false,
  mark: true,
  spd: 1,
  tl: 600,
  tlBack: 600,
};

/** マスタ読み込み後に一度だけ呼ぶ。既定値をマスタから引き直し、保存値を上から重ねる */
export function initConfig(): void {
  CFG.lock = BAL.evoLock;
  CFG.mark = BAL.markOn !== false;
  CFG.tl = BAL.timeDefault || 600;
  CFG.tlBack = BAL.timeDefault || 600;
  try {
    const s = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
    if (LOCK_OPTS.includes(s.lock)) CFG.lock = s.lock;
    if (typeof s.fps === "boolean") CFG.fps = s.fps;
    if (typeof s.mark === "boolean") CFG.mark = s.mark;
    if ((SPD_OPTS as readonly number[]).indexOf(s.spd) >= 0) CFG.spd = s.spd;
    if (typeof s.tl === "number" && s.tl >= 0) CFG.tl = s.tl;
    if (typeof s.tlBack === "number" && s.tlBack > 0) CFG.tlBack = s.tlBack;
    if (typeof s.bgm === "boolean") CFG.bgm = s.bgm;
    if (typeof s.sfx === "boolean") CFG.sfx = s.sfx;
    if (typeof s.mute === "boolean") CFG.mute = s.mute;
    if ([0.35, 0.7, 1].includes(s.vol)) CFG.vol = s.vol;
  } catch (e) {
    /* 保存が壊れていても既定値で遊べる */
  }
}

export function saveCfg(): void {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(CFG));
  } catch (e) {
    /* 容量超過等は黙って諦める */
  }
}
