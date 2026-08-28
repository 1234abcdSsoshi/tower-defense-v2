import { ERAS } from "@/data/master";
import type { EraSkillDef, SkillLine, SkillLineId } from "@/data/types";

/** 通し番号を振ったあとの技。「系統＋出る時代」で一意に決まる */
export interface Skill extends EraSkillDef {
  /** 系統 id + 時代番号（sai0 は原始の天災、you3 は近世の妖） */
  id: string;
  line: SkillLineId;
  era: number;
}

export let SKLINES: SkillLine[] = [
  { id: "sai", n: "天災", k: "災" },
  { id: "you", n: "妖", k: "妖" },
];
/** マスタが技系統を持っていたら差し替える。applyMaster からのみ呼ぶ */
export function setSkillLines(v: SkillLine[]): void {
  SKLINES = v;
}
// 技の一覧。applyMaster から組み立てるので、宣言はそれより前に置く
/** 技が選ばれていない枠。null を配り歩かずに済むよう、無害な既定値を持つ */
export const SK_NONE: Skill = { id: "", n: "—", d: "", cd: 26, kind: "bug", line: "sai", era: 0 };
export let SKILL_ALL: Skill[] = [];
export let SKILL_MAP: Record<string, Skill> = {};

/* ---------- 時代技：天災と妖の二つを持ち込む ----------
   系統（攻・守・富）を選ぶと、中身は進化に合わせて自動で変わる。
   ボタンは戦闘中ずっと二つのままなので、操作は増えない。 */
export const LINE_COL: Record<string, string> = {
  sai: "#D8523A",
  you: "#8E63C4",
  atk: "#D8523A",
  def: "#4E86C6",
  eco: "#5FA86A",
}; // 古い保存の読み替え用
export const LINE_OLD: Record<string, SkillLineId> = { atk: "sai", def: "you", eco: "sai" }; // 三系統だったころの引き継ぎ
export function lineList(): SkillLine[] {
  return SKLINES;
}
export function lineName(id: string): string {
  const l = lineList().find((x) => x.id === id);
  return l ? l.n : id;
}

/* ---------- 技の通し番号 ----------
   「系統＋出る時代」で一意に決まる（sai0 は原始の天災、you3 は近世の妖）。
   マスタの持ち方は変えず、参照のしかただけを増やしている。 */
export function buildSkills(): void {
  SKILL_ALL = [];
  SKILL_MAP = {};
  for (let e = 0; e < ERAS.length; e++) {
    const ss: Partial<Record<SkillLineId, EraSkillDef>> = (ERAS[e] && ERAS[e].skills) || {};
    for (const L of lineList()) {
      const s = ss[L.id];
      if (!s) continue;
      const o = Object.assign({}, s, { id: L.id + e, line: L.id, era: e });
      SKILL_ALL.push(o);
      SKILL_MAP[o.id] = o;
    }
  }
}
export function skById(id: string): Skill {
  return SKILL_MAP[id] || SK_NONE;
}
export function defaultPick(): string[][] {
  const out = [];
  for (let e = 0; e < ERAS.length; e++) {
    const p = [];
    for (const L of lineList()) {
      const id = L.id + e;
      if (SKILL_MAP[id]) p.push(id);
    }
    out.push(p.slice(0, 2));
  }
  return out;
}
// その時代までに出そろっている技
export function skillPool(era: number): Skill[] {
  return SKILL_ALL.filter((s) => s.era <= era);
}
