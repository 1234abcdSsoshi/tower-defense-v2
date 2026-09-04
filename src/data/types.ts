/* =====================================================================
   マスタデータの型。data/master.json と 1:1 で対応する。
   ここを直したら scripts/validate-master.ts も必ず追随させること
   （型は実行時には消えるので、外部差し替え master.json の検査は別に要る）。
   ===================================================================== */

/** 兵科。三すくみ（foot→archer→cavalry→foot）＋特殊三種 */
export type Arm = "foot" | "archer" | "cavalry" | "mystic" | "siege" | "air";

/** 技の系統。天災（sai）と妖（you） */
export type SkillLineId = "sai" | "you";

/** 天災の種類。妖のときは summon */
export type SkillKind = "bug" | "thunder" | "fire" | "quake" | "wind" | "summon" | string;

export interface Affinity {
  /** 有利側の倍率 */
  adv: number;
  /** 不利側の倍率 */
  dis: number;
  /** 三すくみの輪。[勝つ兵科, 負ける兵科] */
  cycle: [Arm, Arm][];
  /** 三すくみに乗せる特殊関係。[攻, 受, 倍率] */
  extra: [Arm, Arm, number][];
  /** 攻城が拠点へ与える倍率 */
  siegeCastle: number;
  /** 飛行が拠点へ与える倍率 */
  airCastle: number;
}

/** 時代ごとの文明効果。時代を進めるたび積み上がる */
export interface Civ {
  kokuMax?: number;
  cavSpeed?: number;
  cost?: number;
  hp?: number;
  rng?: number;
  aa?: boolean;
}
/** buildCiv が積み上げたあとの形（全項目が確定している） */
export interface CivAcc {
  kokuMax: number;
  cavSpeed: number;
  cost: number;
  hp: number;
  rng: number;
  aa: boolean;
}

/** 時代の主（ボス）の定義 */
export interface HeroDef {
  /** 表示名 */
  n: string;
  /** 見た目と挙動の下敷きにする系譜 id */
  lin: string;
  /** 描画の分岐キー（drawBoss が見る） */
  art: string;
  /** 固有能力の分岐キー（lordTick が見る） */
  power: string;
  /** 主の基本色。省略時は時代のパレットを使う */
  col?: string;
  /** 素の系譜からの倍率 */
  mul: { hp: number; atk: number; w: number };
}

/** 妖として呼び出される味方の定義 */
export interface MonDef {
  art: string;
  hp: number;
  atk: number;
  w: number;
  hh: number;
  range: number;
  speed: number;
  /** 攻撃間隔（秒） */
  intv: number;
  power: string;
  aoe?: number;
  /** 固有能力の再使用待ち（秒） */
  pcd?: number;
  heads?: number;
}

/** 時代ごとに一つずつ持つ技 */
/**
 * 天災の強さ。kind ごとに使う項目が違う。
 * 省略した項目はコード側の既定値へ落ちるので、調整したいものだけ書けばよい。
 */
export interface SkillPower {
  /** 1回あたりの被害。bug / thunder / tsunami / erupt が使う */
  dmg?: number;
  /** 効き続ける秒数。bug / thunder / quake2 / erupt / typhoon が使う */
  dur?: number;
  /** 発動の間隔（秒）。bug / thunder / tsunami / erupt が使う */
  every?: number;
  /** 何回発動して終わるか。tsunami が使う */
  hits?: number;
  /** 押し流す距離。tsunami が使う */
  push?: number;
  /** 効く範囲の半径。erupt が使う */
  r?: number;
  /** 燃え続ける地面の1回あたりの被害。erupt が使う */
  burn?: number;
  /** 受ける被害の倍率。quake2 が使う */
  mul?: number;
  /** 毎秒の被害。typhoon が使う */
  dps?: number;
}

export interface EraSkillDef {
  n: string;
  /** 再使用待ち（秒） */
  cd: number;
  kind: SkillKind;
  /** 説明文。遊びかた画面へそのまま出す */
  d: string;
  /** 天災の強さ。ここに書いた値がコードの既定値より優先される */
  pow?: SkillPower;
  mon?: MonDef;
}

export interface EraPalette {
  cloth: string;
  cloth2: string;
  skin: string;
  metal: string;
  accent: string;
}

export interface Era {
  /** 時代名（原始・古代…） */
  n: string;
  /** ローマ字表記 */
  r: string;
  /** 年代 */
  yr: string;
  /** その時代を一語で表す概念 */
  concept: string;
  /** 空のグラデーション [上, 下] */
  sky: [string, string];
  sun: string;
  ground: string;
  ground2: string;
  /** 遠景の色 */
  far: string;
  /** 近景の色 */
  near: string;
  pal: EraPalette;
  /** pal を差し替える上書き。あればこちらが優先される */
  P?: EraPalette;
  /** かぶり物の形 */
  hat: string;
  /** 胴の模様 */
  tex: string;
  /** 時代ごとの色被せ */
  grade: { c: string; a: number };
  /** 拠点の姿 */
  castle: string;
  /** 拠点に立つ主の姿 */
  lord: string;
  /** 前景の草 */
  plant: string;
  /** 前景の静止物 */
  props: string;
  civ: Civ;
  hero: HeroDef;
  skills: Record<SkillLineId, EraSkillDef>;
}

export interface LineageBase {
  cost: number;
  hp: number;
  atk: number;
  /** 見た目の幅。当たり判定にも使う */
  w: number;
  range: number;
  speed: number;
  /** 攻撃間隔（秒） */
  int: number;
  /** 見た目の高さ。省略時は w */
  hh?: number;
  /** 範囲攻撃の半径。0 は単体 */
  aoe?: number;
}

/**
 * 三すくみの属性。
 *   妖怪 → 人間 → 退魔師 → 妖怪
 * 兵科（歩兵→弓→騎馬）とは別の軸で、掛け合わせには頭打ちを入れる。
 */
export type Attr = "yo" | "hito" | "tai";

export interface AttrAffinity {
  /** [強い側, 弱い側] の輪 */
  cycle: [Attr, Attr][];
  /** 時代ごとの有利倍率。時代が進むほど三者が裂けて開く */
  adv: number[];
  /** 時代ごとの不利倍率 */
  dis: number[];
  /** 兵科と掛け合わせたあとの下限 */
  clampLo: number;
  /** 同じく上限。ここを外すと最大 17.8 倍まで開く */
  clampHi: number;
}

/** 畏（おそれ）── 世が怪異をどれだけ信じているか。0〜1 */
export interface AweConf {
  /** 妖を呼んだときに上がる幅 */
  summon: number;
  /** 妖が敵を倒すたびに上がる幅 */
  kill: number;
  /** 毎秒下がる幅 */
  decay: number;
  /** 畏が満ちたとき退魔師が得る攻撃の増分 */
  taiPow: number;
  /** 畏が満ちたとき退魔師の湧きが何倍増えるか */
  taiWave?: number;
  /** 人間が退魔師を白けさせる間合い */
  hushR?: number;
  /** 何人で囲めば、畏の後押しを完全に消せるか */
  hushN?: number;
}

/** 里（さと）── 線の上に置く固定の集落。保てば入り続け、喰えば一度に入る */
export interface SatoConf {
  /** 立っている位置。戦場は laneL〜laneR */
  at: number[];
  /** 保有と見なす半径 */
  hold: number;
  /** 一つ保つごとの石高の増分。kokuRegen に対する倍率 */
  rate: number;
  /** 喰ったときに入る石高。kokuRegen の何秒分か */
  eat: number;
  /** 喰ったときに跳ねる畏 */
  eatAwe: number;
  /** 廃村が残す畏 */
  ruinAwe: number;
}

export interface Lineage {
  id: string;
  arm: Arm;
  /** 三すくみの属性。既存の兵は人間、術は退魔師 */
  attr: Attr;
  /** この系譜が使えるようになる時代 */
  debut: number;
  name: string;
  /** 時代ごとの呼び名。forms[era] */
  forms: string[];
  base: LineageBase;
  /** 生産の再使用待ち（秒） */
  cd: number;
  /** 系譜色 */
  hue: string;
  /** 得物の形 */
  wep: string;
  /** 遊びかた画面に出す一行説明 */
  role: string;
  /** 背負い物の形。系譜を後ろ姿でも見分けるための目印 */
  pack?: string;
  /** 受ける被害の倍率（防御特化） */
  tough?: number;
  /** 吹き飛ばされない */
  noKnock?: boolean;
  /** この兵科に強い */
  vs?: Partial<Record<Arm, number>>;
  /** この兵科から脆い */
  weak?: Partial<Record<Arm, number>>;
  /** 兵科の不利を受けない */
  even?: boolean;
  /** 攻撃時に相手を弱らせる */
  debuff?: { mul?: number; dur?: number };
}

export interface StageReward {
  mag: number;
  mat: number[];
}

export interface Stage {
  id: string;
  no: number;
  chapter: string;
  name: string;
  sub: string;
  hpFoe: number;
  hpMe: number;
  foeStat: number;
  foeCap: number;
  foeCapEra?: number;
  foeCapMin?: number;
  foeWave0: number;
  foeWaveMin?: number;
  foeWaveDecay?: number;
  foeStart?: number;
  foePair?: number;
  foeBossAt?: number;
  foeSchedule: number[];
  bossEvery: number;
  /** 終盤の追い上げ具合 */
  foeLate?: number;
  /** 制限時間の倍率。速攻の戦だけ 0.7 など */
  timeMul: number;
  airCap: number;
  /** 敵城HPの何割で主が出るか */
  lordAts: number[];
  foePool: { lin: number; w: number; wEra?: number }[];
  /** 敵の主力兵科の傾き */
  bias: string;
  reward: StageReward;
  /** 初回撃破の追加報酬 */
  first?: { mag: number };
  /** 解放条件（クリア済みステージ数） */
  needs?: number;
  /** このステージ固定の進化硬直 */
  lock?: number;
}

export interface Meta {
  teamSize: number;
  startOwned: string[];
  minPrimal: number;
  lvMax: number;
  lvGain: number;
  lvCost: { base: number; step: number };
  koyomiMax: number;
  koyomiRegenSec: number;
  koyomiBonus: number;
  gacha: { one: number; ten: number; dupMat: number };
  skLvMax: number;
  startLines: SkillLineId[];
}

/** BGM 一時代ぶん。音声ファイルは使わず、その場で合成する */
export interface MusicTrack {
  bpm: number;
  /** 主音の周波数 */
  root: number;
  /** SCALES のキー。applyMaster で実体の配列へ差し替わる */
  scale: string | number[];
  /** 旋律の楽器 */
  mel: string;
  /** 持続音の楽器 */
  pad: string;
  padGain: number;
  /** 0=なし 1=大太鼓 2=締太鼓/リム 3=閉ハイハット 4=開ハイハット 5=スネア */
  drum: number[];
  /** -1=休符 それ以外は音階の度数 */
  bass: number[];
  m: number[];
}
/** applyMaster を通したあとの形。scale が実体の配列になっている */
export interface MusicTrackResolved extends Omit<MusicTrack, "scale"> {
  scale: number[];
}

export interface ShotSpec {
  kind: string;
  /** 着弾までの秒数 */
  dur: number;
  /** 山なりの高さ */
  arc: number;
  /** 発射点のオフセット */
  oy: number;
  ox: number;
}

export interface SkillLine {
  id: SkillLineId;
  n: string;
  /** 一文字表記 */
  k: string;
}

/** バランス。項目数が多いので、意味の切れ目でまとめてある */
export interface Balance {
  /** 属性が有利な相手を、どれだけ優先して狙うか。小さいほど強く引かれる */
  attrSeek?: number;
  /** 戦場の左端・右端 */
  laneL: number;
  laneR: number;
  hpMe: number;
  hpFoe: number;
  castleMul: number;
  /** 時代ごとのステータス倍率 */
  statMul: number[];
  costMul: number[];
  kokuMax: number[];
  kokuRegen: number[];
  /** 進化に要る文 */
  fumiNeed: number[];
  fumiRate: number;
  fumiEraR: number;
  fumiKill: number;
  fumiKillE: number;
  /** 進化の硬直（秒） */
  evoLock: number;
  legacyRate: number;
  legacyPer: number;
  legacyGain: number;
  legacyCap: number;
  foeSchedule: number[];
  foeStat: number;
  foeLate: number;
  foeCap: number;
  foeCapDecay: number;
  foeCapMin: number;
  foeCapEra: number;
  foeWave0: number;
  foeWaveMin: number;
  foeWaveDecay: number;
  foePool: { lin: number; w: number; wEra?: number }[];
  /** 大物として湧く系譜のインデックス */
  foeBoss: number;
  foeStart?: number;
  foePair?: number;
  foeBossAt?: number;
  airCap: number;
  airY: number;
  aaRange: number;
  aaInterval: number;
  aaDamage: number;
  timeLimit: number;
  timeDefault: number;
  timeMin: number;
  timeMax: number;
  bossEvery: number;
  /** 大物の倍率 */
  bossMul: { hp: number; atk: number; w: number };
  /** 敵城 HP がこの割合を切るたび守備が固くなる */
  guardAt: number[];
  guardRate: number;
  hueMix: number;
  markOn: boolean;
  /** 技レベル1あたりの効果上昇 */
  skGain: number;
  skCdGain: number;
  skillCdDefault: number;
  skCdMul: number;
  /** 同系統をもう一つ持っているときの待ち割合 */
  skSameCd: number;
  lordAt: number;
  lordReward: number;
  /** 装甲列車が歩兵・術から受ける倍率 */
  armorMul: number;
  hpMul: number;
  intMul: number;
  /** 通常攻撃が命中したときの基準ノックバック距離 */
  knockback?: number;
  /** 射程46を超える攻撃へ掛けるノックバック倍率 */
  knockbackRanged?: number;
  /** 体格差などを含めた一撃のノックバック上限 */
  knockbackMax?: number;
  /** 天災の見た目の大きさ。未指定なら 1 */
  scale?: number;
}

/** master.json のルート */
export interface MasterData {
  version: string;
  scales: Record<string, number[]>;
  arms: Record<Arm, string>;
  affinity: Affinity;
  attrAffinity?: AttrAffinity;
  sato?: SatoConf;
  awe?: AweConf;
  eras: Era[];
  lineages: Lineage[];
  balance: Balance;
  stages: Stage[];
  meta: Meta;
  lockOptions: number[];
  music: MusicTrack[];
  /** 戦闘外の全画面で流す曲。旧マスタでは先頭の時代曲へ戻す */
  menuMusic?: MusicTrack;
  shots: Record<string, ShotSpec>;
  skillLines?: SkillLine[];
}
