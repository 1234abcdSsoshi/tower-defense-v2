import { SAVE_KEY, SAVE_V } from "@/core/constants";
import { ERAS, LIN, META, NE } from "@/data/master";
import { LINE_OLD, SKILL_MAP, SKLINES, defaultPick } from "@/data/skills";
import type { Record_ } from "@/sim/types";

/* =====================================================================
   進行データ（拠点・編成・強化・召集）。
   バトルのシミュレーションには一切触れない。
   既定編成＋全レベル1のとき、盤面の挙動は従来と完全に同じになる。
   ===================================================================== */

/** 系譜1つぶんの所持状況 */
export interface LinRecord {
  owned: boolean;
  /** 強化レベル。1 レベルごとに体力と攻撃が META.lvGain ぶん上がる */
  lv: number;
  /** 重複して引いた回数 */
  dup: number;
}

export interface SaveData {
  /** 保存形式の版。合わないものは既定値へ戻す */
  v: number;
  /** 勾玉（召集に使う） */
  mag: number;
  /** 暦（報酬2倍に使う）。時間で回復する */
  koyomi: number;
  /** 最後に暦が回復した時刻（ミリ秒） */
  koyomiAt: number;
  /** 時代ごとの素材 */
  mats: number[];
  lin: Record<string, LinRecord>;
  /** 出撃順に並んだ系譜 id */
  team: string[];
  /** 時代ごとの技の組 */
  pick: string[][];
  /** 技系統のレベル */
  sk: Record<string, number>;
  /** ステージ id -> クリア済み */
  cleared: Record<string, boolean>;
  /** ステージ id -> 自己ベスト */
  best: Record<string, { t: number; era: number }>;
  /** ステージ id -> 自己ベストの入力ログ */
  ghost: Record<string, Record_>;
}

/** 進行データ。loadSave() が起動時に一度だけ埋める */
export let SAVE: SaveData = null;

/**
 * 進行データを丸ごと差し替える。
 * 引き継ぎコードを読み込んだときだけ使う（save/transfer.ts）。
 * 遊びの途中で呼ぶと手元の進行が飛ぶので、それ以外では触らないこと。
 */
export function setSave(next: SaveData): void {
  SAVE = next;
}

/** 暦を使うか（出陣画面のトグル）。一戦ごとに false へ戻る */
export let useKoyomi = false;
export function setUseKoyomi(v: boolean): void {
  useKoyomi = v;
}

export function defaultSave(): SaveData {
  const lin: Record<string, LinRecord> = {};
  for (const L of LIN) lin[L.id] = { owned: (META.startOwned || []).indexOf(L.id) >= 0, lv: 1, dup: 0 };
  return {
    v: SAVE_V,
    mag: 0,
    koyomi: META.koyomiMax || 5,
    koyomiAt: 0,
    mats: new Array(NE).fill(0),
    lin,
    team: (META.startOwned || []).slice(),
    pick: defaultPick(),
    sk: (function () {
      const o: Record<string, number> = {};
      for (const L of SKLINES) o[L.id] = 1;
      return o;
    })(),
    cleared: {},
    best: {},
    ghost: {},
  };
}
/**
 * 外から来た進行データを、遊べる形へ正す。
 *
 * 端末の localStorage から読むときも、引き継ぎコードから読むときも、
 * 必ずここを通す。壊れた値・古い形・作り変えられた値が混ざっても、
 * 既定値へ落ちるだけで盤面は破綻しない。
 */
export function normalizeSave(o: Partial<SaveData> | null): SaveData {
  const d = defaultSave();
  if (o && o.v === SAVE_V) {
    if (typeof o.mag === "number") d.mag = Math.max(0, o.mag | 0);
    if (typeof o.koyomi === "number") d.koyomi = Math.max(0, Math.min(META.koyomiMax, o.koyomi | 0));
    if (typeof o.koyomiAt === "number") d.koyomiAt = o.koyomiAt;
    if (Array.isArray(o.mats)) for (let i = 0; i < NE; i++) d.mats[i] = Math.max(0, o.mats[i] | 0);
    if (o.lin)
      for (const id in d.lin) {
        const p = o.lin[id];
        if (!p) continue;
        d.lin[id].owned = !!p.owned;
        d.lin[id].lv = Math.max(1, Math.min(META.lvMax || 10, p.lv | 0 || 1));
        d.lin[id].dup = Math.max(0, p.dup | 0);
      }
    if (
      Array.isArray(o.team) &&
      o.team.length >= 1 &&
      o.team.length <= META.teamSize &&
      o.team.every((id) => d.lin[id] && d.lin[id].owned)
    )
      d.team = o.team.slice();
    // 三系統だったころの保存も拾う。攻／富→天災、守→妖 に読み替える
    if (o.sk && typeof o.sk === "object")
      for (const k in d.sk) {
        let v = o.sk[k];
        if (v === undefined)
          for (const old in LINE_OLD)
            if (LINE_OLD[old] === k && o.sk[old] !== undefined) v = Math.max(v || 0, o.sk[old]);
        if (v !== undefined) d.sk[k] = Math.max(1, Math.min(META.skLvMax || 5, v | 0 || 1));
      }
    if (o.cleared && typeof o.cleared === "object") d.cleared = o.cleared;
    if (o.best && typeof o.best === "object") d.best = o.best;
    if (o.ghost && typeof o.ghost === "object") d.ghost = o.ghost;
  }
  // 技の選択：形が壊れていたら既定に戻す
  if (Array.isArray(o && o.pick) && o.pick.length === ERAS.length) {
    const dp = defaultPick(),
      ok = [];
    for (let e = 0; e < ERAS.length; e++) {
      const row = Array.isArray(o.pick[e])
        ? o.pick[e].filter((id) => {
            const s = SKILL_MAP[id];
            return s && s.era <= e;
          })
        : [];
      const uniq = [];
      for (const id of row) if (uniq.indexOf(id) < 0) uniq.push(id);
      ok.push(uniq.length === 2 ? uniq : dp[e]);
    }
    d.pick = ok;
  }
  return d;
}

export function loadSave(): void {
  let raw: Partial<SaveData> = null;
  try {
    raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  } catch (e) {
    /* 壊れていたら既定値から始める */
  }
  SAVE = normalizeSave(raw);
  koyomiTick(true);
}

/** 保存に失敗したことを画面へ伝える受け口。起動時に一度だけ繋ぐ */
type SaveFailListener = (reason: string) => void;
let onSaveFail: SaveFailListener | null = null;
export function setSaveFailListener(fn: SaveFailListener): void {
  onSaveFail = fn;
}

/** 同じ知らせを毎フレーム出さないための覚え書き */
let failedOnce = false;

export function saveNow(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE));
    failedOnce = false;
  } catch (e) {
    /* 遊びは止めない。ただし黙って捨てない ──
       ここを握り潰すと、進行が保存されていないことに
       誰も気づかないまま何十分も遊ぶことになる。 */
    if (!failedOnce) {
      failedOnce = true;
      const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
      onSaveFail?.(
        quota
          ? "保存する場所がいっぱいです。引き継ぎコードを控えてください"
          : "進行を保存できません。引き継ぎコードを控えてください",
      );
    }
  }
}
export function koyomiTick(silent?: boolean): void {
  if (!SAVE) return;
  const now = Date.now(),
    per = (META.koyomiRegenSec || 480) * 1000;
  if (!SAVE.koyomiAt) SAVE.koyomiAt = now;
  if (SAVE.koyomi >= META.koyomiMax) {
    SAVE.koyomiAt = now;
    return;
  }
  const g2 = Math.floor((now - SAVE.koyomiAt) / per);
  if (g2 > 0) {
    SAVE.koyomi = Math.min(META.koyomiMax, SAVE.koyomi + g2);
    SAVE.koyomiAt += g2 * per;
    if (!silent) saveNow();
  }
}
export function koyomiLeft(): string {
  if (SAVE.koyomi >= META.koyomiMax) return "";
  const per = (META.koyomiRegenSec || 480) * 1000,
    ms = per - (Date.now() - SAVE.koyomiAt);
  const s2 = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s2 / 60) + ":" + String(s2 % 60).padStart(2, "0");
}
export function matTotal(): number {
  return SAVE.mats.reduce((a, b) => a + b, 0);
}
export function spendMats(n: number): void {
  // 古い時代の素材から使う
  for (let i = 0; i < NE && n > 0; i++) {
    const t = Math.min(SAVE.mats[i], n);
    SAVE.mats[i] -= t;
    n -= t;
  }
}
export function addMats(arr: number[], mul: number): void {
  for (let i = 0; i < NE; i++) SAVE.mats[i] += Math.round((arr[i] || 0) * mul);
}
export function lvCostOf(lv: number): number {
  const c = META.lvCost || { base: 4, step: 3 };
  return c.base + c.step * (lv - 1);
}
