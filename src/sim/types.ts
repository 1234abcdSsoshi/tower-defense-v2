/* =====================================================================
   シミュレーション側の型。
   ここに出てくるものは「決定論の対象」＝リプレイで一致しなければならない値。
   演出専用の値（flash / hitFx など）だけは例外で、混ざっていても
   step() が読まない限り再現性には影響しない。
   ===================================================================== */
import type { Arm, Attr, SkillKind } from "@/data/types";

/** 陣営。0=自軍 1=敵軍 */
export type Side = 0 | 1;

/**
 * ユニットの行動状態。描画は "move" かどうかだけを見る（歩行の足運び）。
 * "idle" は盤面に出ないカードの絵姿と倒れた兵が使う。
 */
export type UnitState = "move" | "attack" | "wait" | "idle";

export interface Unit {
  side: Side;
  /** 系譜のインデックス（LIN の添字） */
  lin: number;
  /** 生まれた時代。見た目と強さの両方に効く */
  era: number;
  arm: Arm;
  /** 三すくみの属性。妖怪→人間→退魔師→妖怪 */
  attr: Attr;
  fly: boolean;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  speed: number;
  /** 攻撃間隔（秒） */
  int: number;
  /** 次の攻撃までの残り */
  cd: number;
  /** 範囲攻撃の半径。0 は単体 */
  aoe: number;
  /** 見た目の幅 */
  w: number;
  /** 見た目の高さ */
  hh: number;
  /** 向き。1=右 -1=左 */
  dir: number;
  st: UnitState;
  dead: boolean;

  /** 奥行き。描画順にだけ使い、シムには影響しない */
  z: number;
  /** 横列のずれ。密集を散らす見た目用 */
  lane: number;

  /* --- 系譜ごとの得意・不得意。makeUnit で一度だけ写す --- */
  vs: Partial<Record<Arm, number>> | null;
  weak: Partial<Record<Arm, number>> | null;
  even: boolean;
  tough: number;
  noKnock: boolean;
  debuff: { mul?: number; dur?: number } | null;

  /* --- 一時効果 --- */
  slow: number;
  haste: number;
  buff: number;
  /** 弱体化の残り秒 */
  curse?: number;
  /** 弱体化の倍率 */
  curseV?: number;
  /** 装甲列車。歩兵・術からの被害を減らす */
  armor?: boolean;

  /* --- 演出専用。step() は読まない --- */
  flash: number;
  hitFx: number;
  atkA: number;
  hexFx?: number;

  /* --- 時代の主 / 妖 --- */
  /** 時代の主か（立っていれば 1） */
  lord?: number;
  /** 妖（召喚した味方）か（1 で妖） */
  mon?: number;
  /** 主・妖の固有能力キー */
  power?: string;
  /** 妖が生まれた時刻 */
  born?: number;
  /** 固有能力の再使用待ち */
  pcd?: number;
  /** 見た目の分岐キー */
  art?: string;
  heads?: number;
  name?: string;
  /** 固有能力までの残り時間。pcd から巻き戻す */
  pt?: number;
  /** 突進の残り時間 */
  dash?: number;
  /** 瞬間移動の予兆の残り時間 */
  tel?: number;

  /* --- 妖の固有演出。step() は減算するだけで、判定には使わない --- */
  /** 天狗の団扇 */
  fanFx?: number;
  /** 鎌鼬のつむじ風 */
  whirlFx?: number;
}

/**
 * 飛び道具。ダメージは発射と同時に確定しているので、これは見た目だけの存在。
 * 当たっても何も起きない（当たる前に相手が消えていても構わない）。
 */
export interface Shot {
  /** 発射点 */
  x0: number;
  y0: number;
  /** 着弾点 */
  x1: number;
  y1: number;
  /** 進捗 0→1 */
  p: number;
  /** 着弾までの秒数 */
  dur: number;
  /** 山なりの高さ */
  arc: number;
  kind: string;
  col: string;
  /** 奥行き。撃った兵から受け継ぐ */
  z: number;
  /** 撃った兵の大きさ。矢の太さに効く */
  w: number;
  dir: number;
}

/**
 * drawUnitAt が必要とする最小限。生きた兵も倒れた兵も、この形さえ満たせば描ける。
 * 生死で描画関数を分けないための共通面。
 */
export type Drawable = Pick<
  Unit,
  | "lin"
  | "era"
  | "side"
  | "arm"
  | "x"
  | "w"
  | "hh"
  | "z"
  | "dir"
  | "speed"
  | "st"
  | "flash"
  | "hitFx"
  | "atkA"
> &
  Partial<
    Pick<
      Unit,
      | "fly"
      | "curse"
      | "hexFx"
      | "lord"
      | "mon"
      | "art"
      | "name"
      | "power"
      | "tel"
      | "dash"
      | "pt"
      | "pcd"
      | "heads"
      | "fanFx"
      | "whirlFx"
    >
  >;

/** 倒れた兵。見た目だけの存在で、シムは一切参照しない */
export interface Corpse extends Drawable {
  /** 倒れてからの秒数。0.62 秒かけて薄くなって消える */
  age: number;
}

/** 破片・火花・土埃。演出専用で、リプレイ中は一つも作らない */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 残り寿命（秒） */
  l: number;
  /** 生まれたときの寿命。薄れ具合の計算に使う */
  m: number;
  /** 色 */
  c: string;
  /** 見た目の種類。未指定=破片 1=火花 2=土埃 3=着弾輪 */
  k?: number;
  /** かかる重力。土埃は負（ふわりと上がる） */
  g?: number;
  /** 半径。土埃だけが持つ */
  r?: number;
}

/** 戦場に居座る天災 */
export interface Disaster {
  k: SkillKind;
  /** 残り秒 */
  t: number;
  /** 総秒数 */
  dur: number;
  /** 発動間隔 */
  every: number;
  acc: number;
  /** 1回あたりの被害 */
  d: number;
  flash: number;
  /** 落雷の位置 */
  lx?: number;
  /** 燃える地面の中心と半径 */
  x?: number;
  r?: number;
  /** 残りの発動回数。決まった回数だけ起きる災い（津波）が使う */
  n?: number;
  /** 1回ごとに押し流す距離。津波が使う */
  push?: number;
}

/** 入力ログ。ゴーストとリプレイの素 */
export interface Record_ {
  /** 形式の版。REC_V と合わないログは捨てる */
  rv: number;
  seed: number;
  stage: number;
  team: number[];
  /** 系譜 id -> 強化レベル */
  lv: Record<string, number>;
  /** [フレーム, 操作コード, 引数] の並び。コードは 0=生産 1=進化 2=技 */
  in: [number, number, number][];
  /** 制限時間（中の秒） */
  tl: number;
  /** 時代ごとの技の組 */
  pick: string[][];
  /** 技系統のレベル */
  sk: Record<string, number>;
  /** 決着までにかかった中の秒数。自己ベスト判定に使う（保存時に書き込む） */
  tSec?: number;
  /** 終戦時の時代（保存時に書き込む） */
  era?: number;
}

/** 一戦の統計。結果画面に出す */
export interface Stats {
  kills: number;
  spawned: number;
  evo: number;
  peak: number;
  maxUnits: number;
  /** [時代, その時代へ入った秒] の推移 */
  line: [number, number][];
}

/**
 * 入力ログを最後まで回した結果。自己ベストをゴーストとして並走させる素になる。
 * 「シードと入力ログだけで一戦を完全に再現できる」という決定論の産物。
 */
export interface ReplayResult {
  /** 勝ったか */
  ok: boolean;
  /** かかった中の秒数 */
  t: number;
  /** 終戦時の時代 */
  era: number;
  kills: number;
  hpMe: number;
  /** 残 HP の割合 */
  hpMeR: number;
  /** 推移表 1 点あたりの秒数 */
  spf: number;
  /** [敵城HP比, 時代] の推移 */
  tl: [number, number][];
}

/**
 * 一戦ぶんの全状態。
 * これと入力ログさえあれば、同じ結果が必ず再現できる（決定論）。
 * 新しい項目を足すときは newGame() に初期値を書くのを忘れないこと。
 */
/** 里ひとつ分の状態 */
export interface Sato {
  /** 立っている位置 */
  x: number;
  /** 保っている側。-1 は誰のものでもない */
  side: number;
  /** 喰われて廃村になったか */
  ruin: boolean;
  /** 喰われた瞬間の演出の残り（1→0） */
  fx: number;
}

export interface GameState {
  seed: number;
  rng: () => number;
  /** 中の時計（秒）。画面表示は dsec() で倍にする */
  t: number;
  frame: number;
  /** 0=続行中 1=勝ち -1=負け */
  over: number;
  running: boolean;
  stage: number;
  /** 出撃順に並んだ系譜インデックス */
  team: number[];
  /** 系譜インデックス -> 強化倍率。対局開始時に凍結する */
  lvOf: Record<number, number>;
  rec: Record_;
  ghost: ReplayResult | null;

  /* --- ステージから写した敵の出しかた --- */
  foeStat: number;
  foeCap: number;
  foeWave0: number;
  foeSchedule: number[];
  foePool: { lin: number; w: number; wEra?: number }[];
  foeCapEra: number;
  foeLate: number;
  foeWaveDecay: number;
  foeWaveMin: number;
  foeCapMin: number;
  foeStart: number;
  foePair: number;
  foeBossAt: number;
  timeLimit: number;
  airCap: number;
  lordAts: number[];
  lordN: number;
  bossEvery: number;

  /* --- 進行 --- */
  era: number;
  foeEra: number;
  koku: number;
  fumi: number;
  aaCd: number;
  aaCdF: number;
  guardF: number;
  evolving: boolean;
  evoT: number;
  /** 硬直（秒）。設定で変えられる */
  lock: number;

  hpMe: number;
  hpFoe: number;
  hpMeMax: number;
  hpFoeMax: number;

  units: Unit[];
  parts: Particle[];
  shots: Shot[];
  corpses: Corpse[];
  hitStop: number;
  /** 奥行き用の線形合同法。G.rng を消費しない */
  zSeq: number;

  /** 系譜ごとの生産待ち */
  prodCd: number[];
  /** 技二つぶんの再使用待ち */
  skCd: number[];
  waveT: number;
  bossT: number;
  /** 時代ごとの技の組 */
  pick: string[][];

  /* --- 天災と妖 --- */
  dis: Disaster | null;
  bQuake: number;
  /** 地震のあいだ、敵が受ける被害の倍率 */
  quakeMul: number;
  bWind: number;
  /** 直近に数えた、出ている妖の数。同時数に上限は無い */
  yokai: number;
  /** 線の上に立つ里。保てば入り続け、喰えば一度に入る */
  sato: Sato[];
  /**
   * 畏（おそれ）── 世が怪異をどれだけ信じているか。0〜1。
   * 妖を呼び、妖が敵を倒すほど上がり、放っておくと下がる。
   * 高いほど退魔師が力を得るので、妖を使うほど討たれやすくなる。
   */
  awe: number;
  /** いま出ている妖の名。HUD に出す */
  monName: string;
  /** 突風の演出の残り（1→0） */
  wave: number;
  /** 突風が毎秒与える被害 */
  windD: number;

  /* --- 一時的な陣営強化 --- */
  bDef: number;
  bDefV: number;
  bNoKnock: number;
  bCap: number;
  bRegen: number;
  bHaste: number;
  bAtk: number;
  bCheap: number;
  bAdv: number;
  bFast: number;
  bAuto: number;
  autoT: number;
  bLast: number;
  bBlack: number;
  autoI: number;

  legacy: number;
  lordName: string;
  lordIn: number;
  /** 時代の主を討ち取ったか。報酬に効く */
  lordKill: number;

  /* --- 演出専用 --- */
  evoFlash: number;
  bgFade: number;
  bgPrev: number;
  shake: number;
  lastCastleSfx: number;

  st: Stats;
  endEra: number;
}
