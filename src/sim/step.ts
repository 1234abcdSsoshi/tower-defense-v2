import { AU } from "@/audio/index";
import { DT } from "@/core/constants";
import { BAL, LIN, civ, unlockedLin } from "@/data/master";
import { GY, SC, sx } from "@/render/viewport";
import { REPLAY } from "@/save/replay";
import { canHit, castleMulOf, dmgMul } from "@/sim/affinity";
import { castleAA, hurt } from "@/sim/combat";
import { disTick, weaken } from "@/sim/disaster";
import { finishEvolve, legacyMul } from "@/sim/evolution";
import { addCorpse, spawnParts, spawnShot } from "@/sim/fx";
import { finishGame } from "@/sim/outcome";
import { G, addUnit } from "@/sim/state";
import { lordTick, monTick, spawnLord } from "@/sim/summons";
import { airAlive, kokuCapOf, lvMulOf, makeUnit } from "@/sim/unit";
import { toast } from "@/ui/dom";

/* ================================================================== シミュ1ステップ */
export function step(): void {
  const t = G.t;
  G.t += DT;
  G.frame++;
  if (G.evoFlash > 0) G.evoFlash = Math.max(0, G.evoFlash - DT * 2.4);
  if (G.lordIn > 0) G.lordIn = Math.max(0, G.lordIn - DT);
  if (G.bgFade < 1) G.bgFade = Math.min(1, G.bgFade + DT * 1.5);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - DT * 34);
  if (G.over) return;

  // 進化の硬直
  if (G.evolving) {
    G.evoT -= DT;
    if (G.evoT <= 0) finishEvolve();
  } else {
    G.koku = Math.min(kokuCapOf(G.era), G.koku + BAL.kokuRegen[G.era] * (G.bRegen > 0 ? 2 : 1) * DT);
    G.fumi += BAL.fumiRate * DT * (1 + G.era * BAL.fumiEraR);
  }
  for (let i = 0; i < G.prodCd.length; i++) if (G.prodCd[i] > 0) G.prodCd[i] -= DT;
  for (let i = 0; i < G.skCd.length; i++) if (G.skCd[i] > 0) G.skCd[i] -= DT;
  if (G.bDef > 0) {
    G.bDef -= DT;
    if (G.bDef <= 0) G.bDefV = 1;
  }
  if (G.bNoKnock > 0) G.bNoKnock -= DT;
  if (G.bCap > 0) G.bCap -= DT;
  if (G.bRegen > 0) G.bRegen -= DT;
  if (G.bLast > 0) G.bLast -= DT;
  if (G.bBlack > 0) G.bBlack -= DT;
  if (G.bQuake > 0) G.bQuake -= DT;
  if (G.bWind > 0) {
    G.bWind -= DT;
    // 暴風は飛行を叩き落とし、地上もじわじわ削る
    for (const u of G.units) if (u.side === 1 && !u.dead) hurt(u, (u.fly ? G.windD : G.windD * 0.22) * DT);
  }
  if (G.dis) {
    if (G.dis.flash > 0) G.dis.flash -= DT / 0.22;
    disTick();
  }
  // 自動生産：編成を順ぐりに無料で出す
  if (G.bAuto > 0) {
    G.bAuto -= DT;
    G.autoT -= DT;
    if (G.autoT <= 0) {
      G.autoT = 1.1;
      for (let k = 0; k < G.team.length; k++) {
        const li = G.team[(G.autoI + k) % G.team.length];
        if (!unlockedLin(li, G.era)) continue;
        if (LIN[li].arm === "air" && airAlive(0) >= G.airCap) continue;
        G.autoI = (G.autoI + k + 1) % G.team.length;
        addUnit(makeUnit(0, li, G.era, BAL.laneL + 14, false, lvMulOf(li) * legacyMul()));
        G.st.spawned++;
        break;
      }
    }
  }
  if (G.bHaste > 0) G.bHaste -= DT;
  if (G.bAtk > 0) G.bAtk -= DT;
  if (G.bCheap > 0) G.bCheap -= DT;
  if (G.bAdv > 0) G.bAdv -= DT;
  if (G.bFast > 0) G.bFast -= DT;

  // 敵の時代進行
  let fe = 0;
  for (let i = 0; i < G.foeSchedule.length; i++) if (t >= G.foeSchedule[i]) fe = i;
  G.foeEra = fe;
  const feLast = G.foeSchedule[G.foeSchedule.length - 1];
  const late = Math.max(0, t - feLast);
  const foeBoost = 1 + late * G.foeLate;

  // 敵の湧き
  G.waveT -= DT;
  const foeAlive = G.units.reduce((a, u) => a + (u.side === 1 && !u.dead ? 1 : 0), 0);
  // 敵の予備兵力は最終時代到達後に尽きていく（＝押し切る窓が開く）
  const cap = Math.max(
    G.foeCapMin,
    G.foeCap + Math.floor(fe * G.foeCapEra) - Math.floor(Math.max(0, t - feLast) / BAL.foeCapDecay),
  );
  if (G.waveT <= 0 && t >= G.foeStart && foeAlive < cap && G.bBlack <= 0) {
    const n = 1 + (G.rng() < Math.min(G.foePair, 0.12 + t / 380) ? 1 : 0);
    let airF = airAlive(1);
    for (let k = 0; k < n; k++) {
      const P2 = G.foePool;
      const w = P2.map((p) => {
        const L = LIN[p.lin];
        if (fe < (L.debut || 0)) return 0;
        if (L.arm === "air" && airF >= G.airCap) return 0;
        return Math.max(0, p.w + (p.wEra || 0) * fe);
      });
      const s = w.reduce((a, b) => a + b, 0);
      if (s <= 0) break;
      let r = G.rng() * s,
        pick = 0;
      for (let i = 0; i < w.length; i++) {
        r -= w[i];
        if (r <= 0) {
          pick = i;
          break;
        }
      }
      if (LIN[P2[pick].lin].arm === "air") airF++;
      const u = makeUnit(1, P2[pick].lin, fe, BAL.laneR - 14 - k * 13, true);
      u.hp *= foeBoost;
      u.maxHp *= foeBoost;
      u.atk *= foeBoost;
      addUnit(u);
    }
    G.waveT = Math.max(G.foeWaveMin, G.foeWave0 - t * G.foeWaveDecay) * (0.78 + G.rng() * 0.44);
  }
  G.bossT -= DT;
  // 大物：数の圧力として一定間隔で湧く。名前は付かない
  if (G.bossT <= 0 && t >= G.foeBossAt && foeAlive < cap + 4 && G.bBlack <= 0) {
    G.bossT = G.bossEvery;
    let bl = BAL.foeBoss;
    if (fe < (LIN[bl].debut || 0)) bl = 0;
    const bm = BAL.bossMul || { hp: 2.5, atk: 1.25, w: 1.45 };
    const u = makeUnit(1, bl, fe, BAL.laneR - 16, true);
    u.hp *= bm.hp * foeBoost;
    u.maxHp = u.hp;
    u.atk *= bm.atk * foeBoost;
    u.w *= bm.w;
    u.hh = (u.hh || u.w) * bm.w;
    addUnit(u);
    AU.fx("boss");
    G.hitStop = Math.max(G.hitStop, 0.05);
    toast("大物　接近", "#E8907A");
  }

  // 時代の主：敵城を半分近くまで削ると一度だけ現れる
  while (G.lordN < G.lordAts.length && G.hpFoe / G.hpFoeMax <= G.lordAts[G.lordN]) {
    G.lordN++;
    spawnLord(fe, foeBoost);
  }

  // ユニット処理
  const U = G.units,
    n = U.length;
  if (n > G.st.maxUnits) G.st.maxUnits = n;
  for (let i = 0; i < n; i++) {
    const u = U[i];
    if (u.dead) continue;
    if (u.flash > 0) u.flash -= DT;
    if (u.atkA > 0) u.atkA -= DT / 0.34;
    if (u.hitFx > 0) u.hitFx -= DT / 0.26;
    if (u.hexFx > 0) u.hexFx -= DT / 0.45;
    if (u.curse > 0) u.curse -= DT;
    if (u.lord) lordTick(u);
    if (u.mon) {
      monTick(u);
      if (u.fanFx > 0) u.fanFx -= DT / 0.34;
      if (u.whirlFx > 0) u.whirlFx -= DT / 0.3;
      u.life -= DT;
      if (u.life <= 0) {
        u.dead = true;
        addCorpse(u);
        if (!REPLAY) {
          AU.fx("ui");
          spawnParts(sx(u.x), GY - 26 * SC, 22, "#C79BE8", 4.4);
        }
        continue;
      }
    }
    if (u.slow > 0) {
      u.slow -= DT;
      u.st = "move";
      continue;
    }
    if (u.dash > 0) {
      u.st = "move";
      u.x += u.dir * u.speed * 3.4 * DT;
      for (let j = 0; j < n; j++) {
        const o = U[j];
        if (o.dead || o.side === u.side || o.fly) continue;
        if (Math.abs(o.x - u.x) < 9 * u.w) {
          hurt(o, u.atk * 0.55);
          if (G.bNoKnock <= 0 && !o.noKnock) o.x = Math.max(BAL.laneL + 6, o.x - 26);
        }
      }
      continue;
    }
    let tgt = null,
      tgtD = 1e9,
      crowd = false;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const o = U[j];
      if (o.dead) continue;
      const dx = (o.x - u.x) * u.dir;
      if (o.side !== u.side) {
        if (canHit(u.arm, o.arm) && dx > -6 && dx < u.range && dx < tgtD) {
          tgt = o;
          tgtD = dx;
        }
      } else if (!u.fly && !o.fly && dx > 0 && dx < 4.6 * u.w) {
        crowd = true;
      }
    }
    const cx = u.side === 0 ? BAL.laneR : BAL.laneL;
    const cdx = (cx - u.x) * u.dir;
    const atkCastle = !tgt && cdx < u.range + 16;
    if (tgt || atkCastle) {
      u.st = "attack";
      u.cd -= DT;
      if (u.cd <= 0) {
        u.cd = u.int;
        u.atkA = 1;
        const bm = u.side === 0 && G.bAtk > 0 ? 1.22 : 1;
        if (tgt) {
          spawnShot(u, tgt.x, tgt.w, tgt.fly);
          hurt(tgt, u.atk * dmgMul(u, tgt) * bm, u);
          if (u.debuff) weaken(tgt, u.debuff);
          if (u.mon) {
            if (u.power === "knock" && !tgt.noKnock)
              // 河童：平手で吹き飛ばす
              tgt.x = Math.min(BAL.laneR - 8, tgt.x + 40);
            else if (u.power === "venom")
              // 大蛇：毒で弱らせる
              weaken(tgt, { mul: 0.66, dur: 5 });
            else if (u.power === "heads") {
              // 八岐大蛇：残りの頭が別の敵を襲う
              let got = 1;
              for (let j = 0; j < n && got < (u.heads || 8); j++) {
                const o = U[j];
                if (o.dead || o.side === u.side || o === tgt) continue;
                if (!canHit(u.arm, o.arm)) continue;
                if ((o.x - u.x) * u.dir > u.range + 30) continue;
                hurt(o, u.atk * dmgMul(u, o) * bm, u);
                got++;
              }
            }
          }
          if (u.aoe) {
            for (let j = 0; j < n; j++) {
              const o = U[j];
              if (o.dead || o.side === u.side || o === tgt) continue;
              if (!canHit(u.arm, o.arm)) continue;
              if (Math.abs(o.x - tgt.x) < u.aoe) {
                hurt(o, u.atk * 0.55 * dmgMul(u, o) * bm);
                if (u.debuff) weaken(o, u.debuff);
              }
            }
          }
        } else {
          const d = u.atk * BAL.castleMul * castleMulOf(u.arm) * bm * (u.curse > 0 ? u.curseV || 0.6 : 1);
          spawnShot(u, cx, 0, false);
          if (G.t - G.lastCastleSfx > 0.22) {
            G.lastCastleSfx = G.t;
            AU.fx("castle");
          }
          if (u.side === 0) {
            G.hpFoe -= d;
            spawnParts(sx(BAL.laneR - 14), GY - 34 * SC, 3, "#FFC98A", 3);
          } else {
            G.hpMe -= d;
            spawnParts(sx(BAL.laneL + 14), GY - 34 * SC, 3, "#FFC98A", 3);
            G.shake = Math.max(G.shake, 3);
          }
        }
      }
    } else {
      u.st = "move";
      let hb = u.side === 0 && G.bHaste > 0 ? 1.55 : 1;
      if (u.side === 1 && G.bQuake > 0) hb *= 0.5; // 地震：足が半分
      u.x += u.dir * u.speed * hb * (crowd ? 0.45 : 1) * DT;
      if (u.side === 1 && G.bWind > 0 && !u.noKnock)
        // 台風：じりじり押し戻される
        u.x = Math.min(BAL.laneR - 8, u.x + 26 * DT);
    }
  }
  // 敵拠点が削れるたびに守備隊が湧く。一本槍の押し切りを止め、戦線に呼吸を作る
  const GT = BAL.guardAt || [0.7, 0.45, 0.25];
  while (G.guardF < GT.length && G.hpFoe / G.hpFoeMax <= GT[G.guardF]) {
    G.guardF++;
    const gn = Math.max(2, Math.round(cap * (BAL.guardRate || 0.55)));
    for (let k = 0; k < gn; k++) {
      const P3 = G.foePool;
      const w3 = P3.map((q) => {
        const L = LIN[q.lin];
        if (fe < (L.debut || 0)) return 0;
        if (L.arm === "air") return 0;
        return Math.max(0, q.w + (q.wEra || 0) * fe);
      });
      const s3 = w3.reduce((a, b) => a + b, 0);
      if (s3 <= 0) break;
      let r3 = G.rng() * s3,
        pk = 0;
      for (let i = 0; i < w3.length; i++) {
        r3 -= w3[i];
        if (r3 <= 0) {
          pk = i;
          break;
        }
      }
      const gu = makeUnit(1, P3[pk].lin, fe, BAL.laneR - 12 - k * 11, true);
      gu.hp *= foeBoost;
      gu.maxHp *= foeBoost;
      gu.atk *= foeBoost;
      addUnit(gu);
    }
    AU.fx("boss");
    toast("敵の守備隊", "#E8907A");
    G.shake = Math.max(G.shake, 6);
  }

  // 拠点の対空砲。近世で対空が生まれ、以後どの時代でも撃てる
  if (civ(G.era).aa) {
    G.aaCd -= DT;
    if (G.aaCd <= 0 && castleAA(0)) G.aaCd = BAL.aaInterval || 3;
  }
  if (civ(G.foeEra).aa) {
    G.aaCdF -= DT;
    if (G.aaCdF <= 0 && castleAA(1)) G.aaCdF = BAL.aaInterval || 3;
  }

  for (let i = U.length - 1; i >= 0; i--) if (U[i].dead) U.splice(i, 1);

  // 粒子
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.l -= DT;
    if (p.l <= 0) {
      G.parts.splice(i, 1);
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.g !== undefined ? p.g : 0.16;
    if (p.k === 2) {
      p.vx *= 0.94;
      p.r *= 1.024;
    }
  }

  if (G.hpFoe <= 0) {
    G.hpFoe = 0;
    finishGame(true);
  } else if (G.hpMe <= 0) {
    G.hpMe = 0;
    finishGame(false);
  } else if (G.t > G.timeLimit) finishGame(false, true);
}
