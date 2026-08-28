/* =====================================================================
   マスタデータの読み込みと展開。
   時代・系譜・バランス・楽曲は、すべてコードの外（master.json）に置く。
   コードを1行も触らずに数値を差し替えられる状態が、運営フェーズの生命線になる。

   このモジュールは UI にも sim にも依存しない葉であること。
   ここから上位層を呼ぶと評価順が循環して、起動時に値が未定義のまま
   読まれる事故が起きる（外部差し替えは app/externalMaster.ts が持つ）。
   ===================================================================== */
import embedded from "@/data/master.json";
import { buildSkills, setSkillLines } from "@/data/skills";
import type {
  Affinity,
  Arm,
  Balance,
  CivAcc,
  Era,
  Lineage,
  MasterData,
  Meta,
  MusicTrackResolved,
  ShotSpec,
  Stage,
} from "@/data/types";

/* 展開後のマスタ。applyMaster() が一度だけ埋め、以後は差し替え時にのみ変わる。
   ES モジュールの import はライブ束縛なので、読む側は再取得しなくてよい。 */
export let SCALES: Record<string, number[]>;
export let ERAS: Era[];
export let LIN: Lineage[];
export let BAL: Balance;
export let LOCK_OPTS: number[];
export let MUSIC: MusicTrackResolved[];
export let SHOT: Record<string, ShotSpec>;
export let MASTER_STAGES: Stage[];
export let META: Meta;

/** マスタの版数。設定画面に出す */
export let MASTER_VER = "—";
/** "内蔵" か "外部"。差し替えが効いているか目視で確かめるため */
export let MASTER_SRC = "内蔵";
export function setMasterSrc(v: string): void {
  MASTER_SRC = v;
}

/** 時代の数。ERAS.length と同じだが、参照が多いので別名で持つ */
export let NE = 6;

/* 兵科の相性表。三すくみ（歩兵→弓→騎馬→歩兵）を骨に、特殊関係を上乗せする */
export let ARMS: Record<string, string> = {};
export let AFF: Affinity = null;
/** 展開済みの相性表。AFFM[攻][受] = 倍率 */
export let AFFM: Record<string, Record<string, number>> = null;

export function buildAffinity(a: Affinity): void {
  AFF = a;
  AFFM = {};
  const set = (x: string, y: string, v: number) => {
    (AFFM[x] || (AFFM[x] = {}))[y] = v;
  };
  for (const [w, l] of a.cycle) {
    set(w, l, a.adv);
    set(l, w, a.dis);
  }
  for (const [x, y, v] of a.extra) {
    set(x, y, v);
  }
  // 逆向きが未定義の特殊関係は不利を入れておく
  for (const [x, y] of a.extra) {
    if (!(AFFM[y] && AFFM[y][x] !== undefined)) set(y, x, a.dis);
  }
}

export function armMul(atk: Arm, def: Arm): number {
  const r = AFFM && AFFM[atk];
  return r && r[def] !== undefined ? r[def] : 1;
}

/** 文明効果は積み上げ式。時代を進めた分だけ恒久的に効く */
export let CIV: CivAcc[] = [];

export function buildCiv(): void {
  CIV = [];
  const sum: CivAcc = { kokuMax: 0, cavSpeed: 0, cost: 0, hp: 0, rng: 0, aa: false };
  for (let i = 0; i < ERAS.length; i++) {
    const c = ERAS[i].civ || {};
    for (const k in sum) {
      if (k === "aa") {
        if (c.aa) sum.aa = true;
      } else if (c[k as keyof typeof c]) (sum[k as "kokuMax"] as number) += c[k as "kokuMax"] as number;
    }
    CIV.push(Object.assign({}, sum));
  }
}

export function civ(era: number): CivAcc {
  return CIV[Math.min(era, CIV.length - 1)] || { kokuMax: 0, cavSpeed: 0, cost: 0, hp: 0, rng: 0, aa: false };
}

export function debutOf(lin: number): number {
  return (LIN[lin] && LIN[lin].debut) || 0;
}
export function unlockedLin(lin: number, era: number): boolean {
  return debutOf(lin) <= era;
}
export function linIndex(id: string): number {
  for (let i = 0; i < LIN.length; i++) if (LIN[i].id === id) return i;
  return 0;
}

/** マスタを展開して各テーブルへ配る。差し替え時にも同じ経路を通る */
export function applyMaster(M: MasterData): void {
  SCALES = M.scales;
  ERAS = M.eras;
  LIN = M.lineages;
  BAL = M.balance;
  NE = ERAS.length;
  buildCiv();
  if (M.arms) ARMS = M.arms;
  if (M.affinity) buildAffinity(M.affinity);
  MASTER_STAGES = M.stages || [];
  META = M.meta || ({ teamSize: 5 } as Meta);
  buildSkills();
  LOCK_OPTS = M.lockOptions;
  SHOT = M.shots;
  MASTER_VER = M.version || "—";
  if (Array.isArray(M.skillLines) && M.skillLines.length) setSkillLines(M.skillLines);
  MUSIC = M.music.map((m) =>
    Object.assign({}, m, { scale: SCALES[m.scale as string] }),
  ) as MusicTrackResolved[];
}

/* 内蔵データをこの場で展開しておく。
   このモジュールを import した時点で ERAS などが必ず埋まっている、という保証になる。 */
applyMaster(embedded as unknown as MasterData);
