/* =====================================================================
   マスタデータの検査。
   型はビルド時に消えるので、外から差し替えられた master.json が
   本当に遊べる形かどうかは実行時に確かめるしかない。

   使いかた:
     npm run validate:master                 内蔵データを検査
     npm run validate:master -- path.json    差し替え用のファイルを検査

   ここを通らない master.json は絶対に配らないこと。
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MasterData } from "../src/data/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ?? path.join(here, "../src/data/master.json");

const problems: string[] = [];
const bad = (msg: string) => problems.push(msg);

const M = JSON.parse(fs.readFileSync(target, "utf8")) as MasterData;
const NE = M.eras?.length ?? 0;

if (NE < 3) bad(`eras が ${NE} 個しかありません（3以上が必要）`);
if (!Array.isArray(M.lineages) || !M.lineages.length) bad("lineages が空です");
if (!M.balance) bad("balance がありません");
if (!M.meta) bad("meta がありません");

/* --- 時代ごとの配列は、必ず時代数と同じ長さ --- */
for (const key of ["statMul", "costMul", "kokuMax", "kokuRegen", "fumiNeed"] as const) {
  const arr = M.balance?.[key];
  if (!Array.isArray(arr) || arr.length !== NE)
    bad(`balance.${key} の長さが ${Array.isArray(arr) ? arr.length : "不正"}（${NE} であるべき）`);
}
for (const key of ["knockback", "knockbackRanged", "knockbackMax"] as const) {
  const value = M.balance?.[key];
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0))
    bad(`balance.${key} は0以上の有限な数値であるべきです`);
}
if ((M.balance?.knockbackRanged ?? 0) > 1) bad("balance.knockbackRanged は1以下であるべきです");
if ((M.balance?.knockbackMax ?? Infinity) < (M.balance?.knockback ?? 0))
  bad("balance.knockbackMax は balance.knockback 以上であるべきです");

/* --- 系譜 --- */
const linIds = new Set<string>();
M.lineages?.forEach((L, i) => {
  const at = `lineages[${i}] (${L.id ?? "id なし"})`;
  if (!L.id) bad(`${at}: id がありません`);
  if (linIds.has(L.id)) bad(`${at}: id が重複しています`);
  linIds.add(L.id);
  if (!M.arms?.[L.arm]) bad(`${at}: 兵科 "${L.arm}" が arms 表にありません`);
  if (!Array.isArray(L.forms) || L.forms.length !== NE)
    bad(`${at}: forms の長さが ${L.forms?.length}（${NE} であるべき）`);
  if (typeof L.debut !== "number" || L.debut < 0 || L.debut >= NE)
    bad(`${at}: debut ${L.debut} が時代の範囲外です`);
  for (const k of ["cost", "hp", "atk", "speed", "range", "int", "w"] as const)
    if (typeof L.base?.[k] !== "number") bad(`${at}: base.${k} が数値ではありません`);
});

/* --- 時代 --- */
M.eras?.forEach((E, i) => {
  const at = `eras[${i}] (${E.n ?? "名前なし"})`;
  if (!E.hero) bad(`${at}: hero がありません`);
  else if (!linIds.has(E.hero.lin)) bad(`${at}: hero.lin "${E.hero.lin}" が実在しません`);
  for (const line of ["sai", "you"] as const)
    if (!E.skills?.[line]) bad(`${at}: skills.${line} がありません`);
  if (!Array.isArray(E.sky) || E.sky.length !== 2) bad(`${at}: sky は色2つの配列であるべきです`);
  if (M.music?.[i] === undefined) bad(`${at}: 対応する music[${i}] がありません`);
});

/* --- 音階 --- */
M.music?.forEach((track, i) => {
  if (typeof track.scale === "string" && !M.scales?.[track.scale])
    bad(`music[${i}]: 音階 "${track.scale}" が scales にありません`);
});
if (M.menuMusic && typeof M.menuMusic.scale === "string" && !M.scales?.[M.menuMusic.scale])
  bad(`menuMusic: 音階 "${M.menuMusic.scale}" が scales にありません`);

/* --- ステージ --- */
const stageIds = new Set<string>();
M.stages?.forEach((st, i) => {
  const at = `stages[${i}] (${st.id ?? "id なし"})`;
  if (!st.id) bad(`${at}: id がありません`);
  if (stageIds.has(st.id)) bad(`${at}: id が重複しています`);
  stageIds.add(st.id);
  if (!Array.isArray(st.reward?.mat) || st.reward.mat.length !== NE)
    bad(`${at}: reward.mat の長さが ${st.reward?.mat?.length}（${NE} であるべき）`);
  st.foePool?.forEach((p) => {
    if (p.lin < 0 || p.lin >= (M.lineages?.length ?? 0)) bad(`${at}: foePool の lin ${p.lin} が実在しません`);
  });
  if (typeof st.needs === "number" && st.needs > (M.stages?.length ?? 0))
    bad(`${at}: needs ${st.needs} が総ステージ数を超えています（永久に開放されません）`);
});

/* --- meta --- */
M.meta?.startOwned?.forEach((id) => {
  if (!linIds.has(id)) bad(`meta.startOwned の "${id}" が実在しません`);
});
if ((M.meta?.startOwned?.length ?? 0) < 1) bad("meta.startOwned が空です（開始編成が組めません）");
if ((M.balance?.foeBoss ?? -1) >= (M.lineages?.length ?? 0))
  bad("balance.foeBoss が実在しない系譜を指しています");

/* --- 相性 --- */
const arms = Object.keys(M.arms ?? {});
M.affinity?.cycle?.forEach(([a, b]) => {
  if (!arms.includes(a) || !arms.includes(b)) bad(`affinity.cycle の [${a}, ${b}] に未知の兵科があります`);
});
M.affinity?.extra?.forEach(([a, b]) => {
  if (!arms.includes(a) || !arms.includes(b)) bad(`affinity.extra の [${a}, ${b}] に未知の兵科があります`);
});

const rel = path.relative(process.cwd(), target);
if (problems.length) {
  console.error(`✗ ${rel} に ${problems.length} 件の問題があります\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(
  `✓ ${rel} は正しい形です（時代 ${NE} / 系譜 ${M.lineages.length} / ステージ ${M.stages.length}）`,
);
