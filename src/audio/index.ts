import { MUSIC } from "@/data/master";
import { REPLAY } from "@/save/replay";
import { CFG } from "@/ui/config";
import type { MusicTrackResolved } from "@/data/types";

/* =====================================================================
   音。音声ファイルは0バイトで、すべて Web Audio でその場合成する。
   時代ごとに 音階・楽器・テンポ が変わり、進化と同時に切り替わる。

   ブラウザは操作を伴わない音の再生を止めるので、AudioContext は
   init() が最初のユーザー操作から作る。それまで ready は false のまま。
   ===================================================================== */

/** 音を出す先。省略時は効果音バス */
type Dest = AudioNode | undefined;

interface AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  comp: DynamicsCompressorNode;
  /** BGM バス */
  bgmG: GainNode;
  /** 効果音バス */
  sfxG: GainNode;
  /** 最終段のソフトクリップ */
  shaper: WaveShaperNode;
  /** 白色雑音の元。打楽器と風の音に使う */
  noiseBuf: AudioBuffer;
  /** 斬撃音は焼いておいて使い回す。乱戦で毎回合成すると間に合わない */
  hitBuf: AudioBuffer[];

  ready: boolean;
  playing: boolean;
  /** いま鳴らしている時代 */
  era: number;
  /** 小節内の位置 */
  step: number;
  /** 次の音を予約する時刻 */
  nextT: number;
  timer: ReturnType<typeof setInterval>;
  /** 斬撃音の同時発音数を抑えるための残量 */
  hitBudget: number;
  lastBudget: number;
  /** 劣勢のとき BGM を緊迫させる */
  danger: boolean;

  buildGraph(ctx: AudioContext): void;
  makeNoise(ctx: BaseAudioContext): AudioBuffer;
  bakeHits(): void;
  init(): void;
  resume(): void;
  setVol(): void;
  setBgm(): void;
  setSfx(): void;

  /* --- 素の発音器 --- */
  nz(t: number, dur: number, hp: number, lp: number, gain: number, dest?: Dest): void;
  osc(
    t: number,
    dur: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    gain: number,
    dest?: Dest,
    atk?: number,
    lp?: number,
    q?: number,
  ): void;

  /* --- 楽器 --- */
  taiko(t: number, g: number, low: boolean, dest?: Dest): void;
  rim(t: number, g: number, dest?: Dest): void;
  hat(t: number, g: number, open: boolean, dest?: Dest): void;
  snare(t: number, g: number, dest?: Dest): void;
  pluck(t: number, f: number, g: number, dur: number, bright: number, dest?: Dest): void;
  flute(t: number, f: number, g: number, dur: number, dest?: Dest): void;
  brass(t: number, f: number, g: number, dur: number, dest?: Dest): void;
  syn(t: number, f: number, g: number, dur: number, dest?: Dest): void;
  gong(t: number, g: number, dest?: Dest): void;
  horagai(t: number, g: number, dest?: Dest): void;

  /* --- 効果音 --- */
  /** 大きな効果音のとき BGM を一瞬下げる */
  duck(amount: number, hold?: number): void;
  fx(name: string, arg?: number, era?: number): void;

  /* --- BGM --- */
  startBgm(era: number): void;
  stopBgm(): void;
  setEra(era: number): void;
  tick(): void;
  schedule(M: MusicTrackResolved, i: number, t: number, sd: number): void;
}

// drum: 0=なし 1=大太鼓 2=締太鼓/リム 3=閉ハイハット 4=開ハイハット 5=スネア
// bass/mel: -1=休符 それ以外は音階の度数

export const AU: AudioEngine = {
  ctx: null,
  master: null,
  comp: null,
  bgmG: null,
  sfxG: null,
  shaper: null,
  noiseBuf: null,
  hitBuf: null,
  ready: false,
  playing: false,
  era: -1,
  step: 0,
  nextT: 0,
  timer: null,
  hitBudget: 0,
  lastBudget: 0,
  danger: false,

  buildGraph(ctx: AudioContext) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = CFG.mute ? 0 : CFG.vol;
    const bgm = ctx.createGain();
    bgm.gain.value = CFG.bgm ? 0.85 : 0;
    const sfx = ctx.createGain();
    sfx.gain.value = CFG.sfx ? 1 : 0;
    // 最終段のソフトクリップ。乱戦で効果音が重なっても波形を割らない
    const shaper = ctx.createWaveShaper();
    const N = 2048,
      curve = new Float32Array(N),
      k = 1.9;
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
    bgm.connect(comp);
    sfx.connect(comp);
    comp.connect(master);
    master.connect(shaper);
    shaper.connect(ctx.destination);
    this.comp = comp;
    this.master = master;
    this.bgmG = bgm;
    this.sfxG = sfx;
    this.shaper = shaper;
    return this;
  },
  makeNoise(ctx: BaseAudioContext) {
    const sr = ctx.sampleRate,
      len = Math.ceil(sr * 2);
    const buf = ctx.createBuffer(1, len, sr),
      d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = (v + (Math.random() * 2 - 1)) * 0.5;
      d[i] = v * 1.6;
    }
    return buf;
  },
  // 最頻出の被弾音だけは事前に焼いておき、再生時のノード生成を1個に抑える
  bakeHits() {
    const SR = this.ctx.sampleRate;
    const specs = [
      { hp: 260, lp: 2400, g: 0.34, d: 0.045 },
      { hp: 900, lp: 6500, g: 0.32, d: 0.038, ring: 620 },
      { hp: 1600, lp: 9000, g: 0.3, d: 0.03, ring: 900 },
    ];
    this.hitBuf = [];
    specs.forEach((sp, idx) => {
      const oc = new OfflineAudioContext(1, Math.ceil(SR * 0.18), SR);
      const nb = this.makeNoise(oc);
      const src = oc.createBufferSource();
      src.buffer = nb;
      src.loop = true;
      const hp = oc.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = sp.hp;
      const lp = oc.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = sp.lp;
      const g = oc.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(sp.g, 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, sp.d);
      src.connect(hp);
      hp.connect(lp);
      lp.connect(g);
      g.connect(oc.destination);
      src.start(0);
      src.stop(sp.d + 0.02);
      if (sp.ring) {
        const o = oc.createOscillator();
        o.type = idx === 2 ? "square" : "triangle";
        o.frequency.setValueAtTime(sp.ring, 0);
        o.frequency.exponentialRampToValueAtTime(sp.ring * 0.6, 0.06);
        const og = oc.createGain();
        og.gain.setValueAtTime(0.0001, 0);
        og.gain.exponentialRampToValueAtTime(idx === 2 ? 0.11 : 0.13, 0.002);
        og.gain.exponentialRampToValueAtTime(0.0001, 0.06);
        o.connect(og);
        og.connect(oc.destination);
        o.start(0);
        o.stop(0.08);
      }
      oc.startRendering()
        .then((b) => {
          this.hitBuf[idx] = b;
        })
        .catch(() => {});
    });
  },
  init() {
    if (this.ready) return true;
    // Safari 系は prefix 付きしか持たないことがある
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    try {
      this.buildGraph(new AC());
    } catch (e) {
      return false;
    }
    this.ready = true;
    this.noiseBuf = this.makeNoise(this.ctx); // ノイズ源は使い回す
    try {
      this.bakeHits();
    } catch (e) {}
    return true;
  },
  resume() {
    if (this.ctx && this.ctx.state !== "running") this.ctx.resume().catch(() => {});
  },
  setVol() {
    if (this.master) this.master.gain.setTargetAtTime(CFG.mute ? 0 : CFG.vol, this.ctx.currentTime, 0.03);
  },
  setBgm() {
    if (!this.bgmG) return;
    const t = this.ctx.currentTime;
    this.bgmG.gain.cancelScheduledValues(t); // ダッキング中の予約を打ち消す
    this.bgmG.gain.setTargetAtTime(CFG.bgm ? 0.85 : 0, t, 0.05);
  },
  setSfx() {
    if (this.sfxG) this.sfxG.gain.value = CFG.sfx ? 1 : 0;
  },

  /* ---------- 素の発音器 ---------- */
  nz(t: number, dur: number, hp: number, lp: number, gain: number, dest?: Dest) {
    const c = this.ctx,
      s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    let node: AudioNode = s;
    if (hp) {
      const f = c.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hp;
      node.connect(f);
      node = f;
    }
    if (lp) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    g.connect(dest || this.sfxG);
    s.start(t);
    s.stop(t + dur + 0.02);
  },
  osc(
    t: number,
    dur: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    gain: number,
    dest?: Dest,
    atk?: number,
    lp?: number,
    q?: number,
  ) {
    const c = this.ctx,
      o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * 0.9);
    let node: AudioNode = o;
    if (lp) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(lp, t);
      if (q) f.Q.value = q;
      f.frequency.exponentialRampToValueAtTime(Math.max(120, lp * 0.28), t + dur);
      node.connect(f);
      node = f;
    }
    const g = c.createGain();
    const a = atk || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    g.connect(dest || this.sfxG);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  /* ---------- 楽器 ---------- */
  taiko(t: number, g: number, low: boolean, dest?: Dest) {
    this.osc(t, low ? 0.42 : 0.22, "sine", low ? 92 : 150, low ? 46 : 78, g * (low ? 1 : 0.7), dest, 0.003);
    this.nz(t, low ? 0.09 : 0.05, 120, low ? 900 : 2200, g * 0.5, dest);
  },
  rim(t: number, g: number, dest?: Dest) {
    this.nz(t, 0.05, 1400, 5200, g * 0.6, dest);
    this.osc(t, 0.05, "triangle", 420, 300, g * 0.4, dest, 0.002);
  },
  hat(t: number, g: number, open: boolean, dest?: Dest) {
    this.nz(t, open ? 0.16 : 0.035, 7200, 15000, g * (open ? 0.3 : 0.24), dest);
  },
  snare(t: number, g: number, dest?: Dest) {
    this.nz(t, 0.13, 900, 7000, g * 0.55, dest);
    this.osc(t, 0.09, "triangle", 190, 140, g * 0.35, dest, 0.002);
  },
  pluck(t: number, f: number, g: number, dur: number, bright: number, dest?: Dest) {
    this.osc(t, dur, "triangle", f, f, g, dest, 0.003, f * bright, 3);
    this.osc(t, dur * 0.55, "sawtooth", f * 2.01, f * 2, g * 0.22, dest, 0.003, f * bright * 1.4, 2);
    this.nz(t, 0.022, f * 1.5, 9000, g * 0.3, dest);
  },
  flute(t: number, f: number, g: number, dur: number, dest?: Dest) {
    const c = this.ctx,
      o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.2;
    const lg = c.createGain();
    lg.gain.value = f * 0.008;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(g, t + 0.075);
    g1.gain.setValueAtTime(g, t + dur * 0.62);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g1);
    g1.connect(dest || this.bgmG);
    o.start(t);
    o.stop(t + dur + 0.03);
    lfo.start(t);
    lfo.stop(t + dur + 0.03);
    this.nz(t + 0.005, dur * 0.5, f * 0.8, f * 3.2, g * 0.16, dest || this.bgmG);
  },
  brass(t: number, f: number, g: number, dur: number, dest?: Dest) {
    this.osc(t, dur, "sawtooth", f, f, g * 0.55, dest, 0.035, f * 4, 1);
    this.osc(t, dur, "square", f * 1.005, f * 1.005, g * 0.18, dest, 0.05, f * 3, 1);
  },
  syn(t: number, f: number, g: number, dur: number, dest?: Dest) {
    this.osc(t, dur, "sawtooth", f, f, g * 0.5, dest, 0.004, f * 7, 7);
    this.osc(t, dur, "sawtooth", f * 1.008, f * 1.008, g * 0.32, dest, 0.004, f * 5, 6);
  },
  gong(t: number, g: number, dest?: Dest) {
    const d = dest || this.sfxG;
    [1, 1.51, 2.34, 3.11, 4.2].forEach((r, i) =>
      this.osc(t, 2.6 - i * 0.3, "sine", 128 * r, 124 * r, g * (0.5 / (i + 1)), d, 0.006),
    );
    this.nz(t, 0.5, 300, 3000, g * 0.2, d);
  },
  horagai(t: number, g: number, dest?: Dest) {
    // 法螺貝ふう
    const d = dest || this.sfxG;
    this.osc(t, 1.15, "sawtooth", 118, 176, g * 0.32, d, 0.14, 900, 2);
    this.osc(t, 1.15, "sine", 236, 352, g * 0.18, d, 0.16);
    this.nz(t, 1.0, 200, 1400, g * 0.1, d);
  },

  /* ---------- 効果音 ---------- */
  duck(amount: number, hold?: number) {
    // 大きな効果音のときBGMを一瞬下げる
    if (!this.bgmG || !CFG.bgm) return;
    const t = this.ctx.currentTime,
      base = 0.85;
    this.bgmG.gain.cancelScheduledValues(t);
    this.bgmG.gain.setTargetAtTime(base * amount, t, 0.02);
    this.bgmG.gain.setTargetAtTime(base, t + (hold || 0.35), 0.22);
  },
  fx(name: string, arg?: number, era?: number) {
    if (REPLAY || !this.ready || !CFG.sfx) return;
    const t = this.ctx.currentTime + 0.002,
      e = era || 0;
    switch (name) {
      case "produce": {
        const f = [196, 262, 330, 392, 147][arg || 0];
        if (e >= 7) {
          this.syn(t, f * 2, 0.62, 0.16, this.sfxG);
          this.nz(t, 0.03, 1800, 9000, 0.16);
        } else if (e === 6) {
          this.brass(t, f, 0.66, 0.2, this.sfxG);
          this.nz(t, 0.025, 500, 4000, 0.13);
        } else if (e >= 3) {
          this.pluck(t, f, 0.75, 0.22, 9, this.sfxG);
          this.nz(t, 0.03, 900, 6000, 0.16);
        } else {
          this.pluck(t, f, 0.75, 0.18, 3.5, this.sfxG);
          this.nz(t, 0.035, 300, 2600, 0.21);
        }
        break;
      }
      case "hit": {
        if (this.hitBudget <= 0) return;
        this.hitBudget--;
        const bi = e >= 6 ? 2 : e >= 3 ? 1 : 0,
          bf = this.hitBuf && this.hitBuf[bi];
        if (bf) {
          const s2 = this.ctx.createBufferSource();
          s2.buffer = bf;
          s2.playbackRate.value = 0.88 + Math.random() * 0.26;
          s2.connect(this.sfxG);
          s2.start(t);
        } else if (e >= 6) {
          this.nz(t, 0.03, 1600, 9000, 0.3);
          this.osc(t, 0.05, "square", 900, 520, 0.11, null, 0.002);
        } else if (e >= 3) {
          this.nz(t, 0.038, 900, 6500, 0.32);
          this.osc(t, 0.06, "triangle", 620, 380, 0.13, null, 0.002);
        } else {
          this.nz(t, 0.045, 260, 2400, 0.34);
        }
        break;
      }
      case "kill": {
        this.nz(t, 0.15, 160, 2400, 0.52);
        this.osc(t, 0.18, "triangle", 190, 64, 0.4, null, 0.003);
        break;
      }
      case "castle": {
        this.osc(t, 0.36, "sine", 122, 50, 0.55, null, 0.004);
        this.nz(t, 0.18, 80, 950, 0.42);
        break;
      }
      case "evoStart":
        this.duck(0.55, 0.9);
        this.horagai(t, 0.62);
        break;
      case "evoDone":
        this.duck(0.35, 0.7);
        this.gong(t, 0.75);
        [0, 4, 7, 12].forEach((s, i) =>
          this.osc(
            t + 0.04 + i * 0.055,
            0.7,
            "triangle",
            330 * Math.pow(2, s / 12),
            330 * Math.pow(2, s / 12),
            0.18,
            null,
            0.005,
          ),
        );
        break;
      case "skill":
        this.duck(0.6, 0.4);
        this.osc(t, 0.5, "sawtooth", 180, 900, 0.46, null, 0.01, 2600, 5);
        this.nz(t, 0.32, 400, 9000, 0.34);
        break;
      case "boss":
        this.duck(0.5, 0.8);
        this.taiko(t, 0.9, true);
        this.taiko(t + 0.2, 0.9, true);
        this.taiko(t + 0.4, 1.1, true);
        this.osc(t, 1.1, "sawtooth", 70, 58, 0.24, null, 0.02, 500, 3);
        break;
      case "ui":
        this.nz(t, 0.024, 1800, 8000, 0.22);
        break;
      case "deny":
        this.osc(t, 0.1, "square", 150, 110, 0.12, null, 0.003, 900);
        break;
      case "win":
        [0, 4, 7, 12, 16, 19].forEach((s, i) =>
          this.osc(
            t + i * 0.1,
            1.0,
            "triangle",
            262 * Math.pow(2, s / 12),
            262 * Math.pow(2, s / 12),
            0.22,
            null,
            0.006,
          ),
        );
        this.gong(t, 0.45);
        break;
      case "lose":
        [0, -1, -3, -5].forEach((s, i) =>
          this.osc(
            t + i * 0.18,
            1.3,
            "sawtooth",
            196 * Math.pow(2, s / 12),
            190 * Math.pow(2, s / 12),
            0.18,
            null,
            0.02,
            700,
            2,
          ),
        );
        this.taiko(t, 0.7, true);
        break;
    }
  },

  /* ---------- BGM ---------- */
  startBgm(era: number) {
    if (!this.ready) return;
    this.era = era;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.08;
    this.playing = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
  },
  stopBgm() {
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  setEra(era: number) {
    if (era !== this.era) {
      this.era = era;
      this.step = 0;
    }
  },
  tick() {
    if (!this.playing || !this.ready) return;
    if (this.ctx.state !== "running") return;
    const M = MUSIC[this.era] || MUSIC[0];
    const sd = 60 / M.bpm / 4; // 16分音符
    const now = this.ctx.currentTime;
    if (this.nextT < now - 0.4) this.nextT = now + 0.05; // タブ復帰時の暴走防止
    while (this.nextT < now + 0.14) {
      this.schedule(M, this.step, this.nextT, sd);
      this.nextT += sd;
      this.step = (this.step + 1) % 32;
    }
  },
  schedule(M: MusicTrackResolved, i: number, t: number, sd: number) {
    const B = this.bgmG,
      sc = M.scale,
      root = M.root;
    const f = (deg: number): number => {
      const n = sc.length,
        o = Math.floor(deg / n),
        k = ((deg % n) + n) % n;
      return root * Math.pow(2, (sc[k] + o * 12) / 12);
    };
    const d = M.drum[i];
    if (d === 1) this.taiko(t, 0.3, true, B);
    else if (d === 2) this.rim(t, 0.24, B);
    else if (d === 3) this.hat(t, 0.2, false, B);
    else if (d === 4) this.hat(t, 0.2, true, B);
    else if (d === 5) this.snare(t, 0.24, B);
    const b = M.bass[i];
    if (b >= 0) this.osc(t, sd * 3.1, "sine", f(b) / 2, f(b) / 2, 0.26, B, 0.006, 420);
    const m = M.m.length ? M.m[i] : -1;
    if (m >= 0) {
      const fr = f(m + 7);
      if (M.mel === "flute") this.flute(t, fr, 0.13, sd * 3.4, B);
      else if (M.mel === "koto") this.pluck(t, fr, 0.17, sd * 3.6, 6, B);
      else if (M.mel === "shamisen") this.pluck(t, fr, 0.16, sd * 2.4, 9, B);
      else if (M.mel === "brass") this.brass(t, fr, 0.13, sd * 2.6, B);
      else if (M.mel === "syn") this.syn(t, fr, 0.1, sd * 1.5, B);
    }
    if (i === 0 && M.pad !== "none") {
      const g = M.padGain * (M.pad === "swell" ? 1.1 : 1);
      this.osc(t, sd * 30, "sine", root, root, g, B, M.pad === "swell" ? 0.7 : 0.25, 300);
      this.osc(t, sd * 30, "sine", root * 1.4983, root * 1.4983, g * 0.55, B, 0.9, 340);
    }
    // 自城が危ういときだけ低い鼓動を足す
    if (this.danger && (i === 0 || i === 16)) this.osc(t, 0.5, "sine", 58, 44, 0.22, B, 0.01);
  },
};
