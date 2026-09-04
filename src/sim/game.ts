import { REC_V } from "@/core/constants";
import { mulberry32 } from "@/core/rng";
import { BAL, LIN, MASTER_STAGES, META, linIndex } from "@/data/master";
import { defaultPick } from "@/data/skills";
import { SAVE } from "@/save/save";
import { makeSato } from "@/sim/sato";
import { timeLimitOf } from "@/sim/time";
import { linLevels } from "@/sim/unit";
import { CFG } from "@/ui/config";
import type { Stage } from "@/data/types";
import type { GameState, Record_ } from "@/sim/types";

export function newGame(seed: number, stageIdx?: number, rec?: Record_): GameState {
  // ステージはマスタの一部だけを上書きする。無い項目は BAL の既定値へ落ちる
  const ST: Partial<Stage> = (MASTER_STAGES && MASTER_STAGES[stageIdx || 0]) || {};
  const team =
    rec && rec.team
      ? rec.team.slice()
      : SAVE && SAVE.team && SAVE.team.length >= 1
        ? SAVE.team.slice(0, META.teamSize).map((id) => linIndex(id))
        : (META.startOwned || []).slice(0, META.teamSize).map((id) => linIndex(id));
  const lv = linLevels(rec);
  const lvOf: Record<number, number> = {};
  for (let i = 0; i < LIN.length; i++) lvOf[i] = 1 + ((lv[LIN[i].id] || 1) - 1) * (META.lvGain || 0.09);
  return {
    seed,
    rng: mulberry32(seed),
    t: 0,
    frame: 0,
    over: 0,
    running: false,
    stage: stageIdx || 0,
    team,
    lvOf,
    rec: {
      rv: REC_V,
      seed,
      stage: stageIdx || 0,
      team: team.slice(),
      lv,
      in: [],
      tl: timeLimitOf(),
      pick: ((rec && rec.pick) || (SAVE && SAVE.pick) || defaultPick()).map((a) => a.slice()),
      sk: Object.assign({ atk: 1, def: 1, eco: 1 }, (SAVE && SAVE.sk) || {}),
    },
    ghost: null,
    foeStat: ST.foeStat || BAL.foeStat,
    foeCap: ST.foeCap || BAL.foeCap,
    foeWave0: ST.foeWave0 || BAL.foeWave0,
    foeSchedule: ST.foeSchedule || BAL.foeSchedule,
    foePool: ST.foePool || BAL.foePool,
    foeCapEra: ST.foeCapEra !== undefined ? ST.foeCapEra : BAL.foeCapEra || 0,
    timeLimit: (function () {
      const v = rec && rec.tl !== undefined ? rec.tl : timeLimitOf();
      return v ? v * (ST.timeMul || 1) : Infinity;
    })(),
    airCap: ST.airCap || BAL.airCap || 3,
    lordAts: (ST.lordAts || [BAL.lordAt || 0.45]).slice(),
    lordN: 0,
    bossEvery: ST.bossEvery || BAL.bossEvery,
    foeLate: ST.foeLate !== undefined ? ST.foeLate : BAL.foeLate,
    // 序盤のステージをゆっくりにするための調整代
    foeWaveDecay: ST.foeWaveDecay !== undefined ? ST.foeWaveDecay : BAL.foeWaveDecay,
    foeWaveMin: ST.foeWaveMin !== undefined ? ST.foeWaveMin : BAL.foeWaveMin,
    foeCapMin: ST.foeCapMin !== undefined ? ST.foeCapMin : BAL.foeCapMin,
    foeStart: ST.foeStart !== undefined ? ST.foeStart : BAL.foeStart || 0,
    foePair: ST.foePair !== undefined ? ST.foePair : BAL.foePair !== undefined ? BAL.foePair : 0.62,
    foeBossAt: ST.foeBossAt !== undefined ? ST.foeBossAt : BAL.foeBossAt || 0,
    era: 0,
    foeEra: 0,
    koku: BAL.kokuMax[0] * 0.35,
    fumi: 0,
    aaCd: 0,
    aaCdF: 0,
    guardF: 0,
    evolving: false,
    evoT: 0,
    evoFlash: 0,
    bgFade: 1,
    bgPrev: 0,
    hpMe: ST.hpMe || BAL.hpMe,
    hpFoe: ST.hpFoe || BAL.hpFoe,
    hpMeMax: ST.hpMe || BAL.hpMe,
    hpFoeMax: ST.hpFoe || BAL.hpFoe,
    units: [],
    parts: [],
    shots: [],
    corpses: [],
    hitStop: 0,
    zSeq: 2463534242,
    prodCd: new Array(LIN.length).fill(0),
    skCd: [0, 0],
    waveT: 2.4,
    bossT: ST.bossEvery || BAL.bossEvery,
    pick: ((rec && rec.pick) || (SAVE && SAVE.pick) || defaultPick()).map((a) => a.slice()),
    bDef: 0,
    bDefV: 1,
    bNoKnock: 0,
    bCap: 0,
    bRegen: 0,
    dis: null,
    bQuake: 0,
    quakeMul: 2,
    bWind: 0,
    yokai: 0,
    awe: 0,
    sato: makeSato(),
    monName: "",
    wave: 0,
    windD: 0, // 天災と妖
    lordName: "",
    lordIn: 0,
    lordKill: 0,
    bAuto: 0,
    autoT: 0,
    bLast: 0,
    bBlack: 0,
    autoI: 0,
    bHaste: 0,
    bAtk: 0,
    bCheap: 0,
    bAdv: 0,
    bFast: 0,
    legacy: 0,
    shake: 0,
    lock: ST.lock || CFG.lock,
    st: { kills: 0, spawned: 0, evo: 0, peak: 0, maxUnits: 0, line: [[0, 0]] },
    endEra: 0,
    lastCastleSfx: -9,
  };
}
