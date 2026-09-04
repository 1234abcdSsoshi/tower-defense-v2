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
  Attr,
  AttrAffinity,
  AweConf,
  Balance,
  CivAcc,
  Era,
  Lineage,
  MasterData,
  Meta,
  MusicTrackResolved,
  SatoConf,
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
/** タイトル・拠点・各選択画面・結果画面で共通して流す曲 */
export let MENU_MUSIC: MusicTrackResolved;
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

/* 属性の三すくみ（妖怪→人間→退魔師→妖怪）。
   兵科とは別の軸なので表も別に持つ。倍率は時代で開くため配列。 */
export let ATTR_AFF: AttrAffinity = null;
/** 展開済み。ATTRM[攻][受] = 有利なら 1、不利なら -1、関係なければ 0 */
let ATTRM: Record<string, Record<string, number>> = null;

export function buildAttrAffinity(a: AttrAffinity): void {
  ATTR_AFF = a;
  ATTRM = {};
  const set = (x: string, y: string, v: number) => {
    (ATTRM[x] || (ATTRM[x] = {}))[y] = v;
  };
  for (const [w, l] of a.cycle) {
    set(w, l, 1);
    set(l, w, -1);
  }
}

/**
 * 属性の向きだけを返す。1=有利 / -1=不利 / 0=無関係（同属性を含む）。
 * 倍率にしないのは、時代によって開き方が変わるため。
 */
export function attrSide(atk: Attr, def: Attr): number {
  const r = ATTRM && ATTRM[atk];
  return r && r[def] !== undefined ? r[def] : 0;
}

/** その時代の属性倍率。関係が無ければ 1 */
export function attrMulOf(atk: Attr, def: Attr, era: number): number {
  if (!ATTR_AFF) return 1;
  const side = attrSide(atk, def);
  if (side === 0) return 1;
  const table = side > 0 ? ATTR_AFF.adv : ATTR_AFF.dis;
  const e = Math.max(0, Math.min(table.length - 1, era | 0));
  return table[e] ?? 1;
}

/** 畏の設定 */
export let AWE: AweConf = null;

/** 里の設定 */
export let SATO: SatoConf = null;

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
  if (M.attrAffinity) buildAttrAffinity(M.attrAffinity);
  AWE = M.awe || null;
  SATO = M.sato || null;
  MASTER_STAGES = M.stages || [];
  META = M.meta || ({ teamSize: 5 } as Meta);
  buildSkills();
  LOCK_OPTS = M.lockOptions;
  SHOT = M.shots;
  MASTER_VER = M.version || "—";
  if (Array.isArray(M.skillLines) && M.skillLines.length) setSkillLines(M.skillLines);
  const resolveMusic = (m: (typeof M.music)[number]): MusicTrackResolved =>
    Object.assign({}, m, {
      scale: Array.isArray(m.scale) ? m.scale : SCALES[m.scale] || SCALES.minyo,
    }) as MusicTrackResolved;
  MUSIC = M.music.map(resolveMusic);
  // menuMusic を持たない旧マスタも、そのまま読み込めるよう先頭曲へ戻す。
  MENU_MUSIC = M.menuMusic ? resolveMusic(M.menuMusic) : MUSIC[0];
}

/* 内蔵データをこの場で展開しておく。
   このモジュールを import した時点で ERAS などが必ず埋まっている、という保証になる。 */
applyMaster(embedded as unknown as MasterData);
