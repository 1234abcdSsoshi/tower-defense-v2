import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AU } from "@/audio/index";
import { MENU_MUSIC, MUSIC } from "@/data/master";
import { CFG } from "@/ui/config";

interface FakeParam {
  value: number;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
  setValueAtTime: ReturnType<typeof vi.fn>;
}

function fakeGain(): GainNode {
  const gain: FakeParam = {
    value: 1,
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
  };
  return {
    gain,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as GainNode;
}

/**
 * 何を呼ばれても黙って受け流す音の殻。
 *
 * 曲の組み立て（schedule）は本物の AudioContext を前提に書かれている。
 * jsdom にも node にも Web Audio は無いので、ここでは「鳴らす」ことではなく
 * 「どの層を重ねたか」だけを見たい。だから全部を受け流す殻を被せる。
 */
function stubAudioContext(): AudioContext {
  const param = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
  });
  const node = (): Record<string, unknown> => ({
    gain: param(),
    frequency: param(),
    detune: param(),
    Q: param(),
    playbackRate: param(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
    type: "",
    curve: null,
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    setPeriodicWave: vi.fn(),
  });
  const buffer = (ch: number, len: number) => ({
    length: len,
    numberOfChannels: ch,
    sampleRate: 48000,
    getChannelData: () => new Float32Array(Math.max(1, len)),
  });
  return {
    currentTime: 4,
    sampleRate: 48000,
    state: "running",
    destination: node(),
    createGain: node,
    createOscillator: node,
    createBufferSource: node,
    createBiquadFilter: node,
    createConvolver: node,
    createDynamicsCompressor: node,
    createWaveShaper: node,
    createBuffer: (ch: number, len: number) => buffer(ch, len),
  } as unknown as AudioContext;
}

function installReadyGraph(): void {
  AU.ctx = stubAudioContext();
  AU.bgmG = fakeGain();
  AU.renderedCache = Object.fromEntries(
    ["menu", "era0", "era1", "era2", "era3", "era4", "era5"].map((key, index) => [
      key,
      { duration: 65.45 - index } as AudioBuffer,
    ]),
  );
  AU.ready = true;
}

beforeEach(() => {
  vi.useFakeTimers();
  if (AU.timer) clearInterval(AU.timer);
  Object.assign(AU, {
    ctx: null,
    bgmG: null,
    trackG: null,
    ready: false,
    bgmWanted: false,
    playing: false,
    scene: "menu",
    era: -1,
    step: 0,
    nextT: 0,
    timer: null,
    renderedBgm: null,
    renderedCache: {},
    renderedSource: null,
    renderedGain: null,
    aweG: null,
    aweSource: null,
    aweBuffer: null,
    aweLoading: null,
    aweFailed: false,
    renderedLoading: {},
    renderedFailed: {},
    renderedOffsets: {},
    renderedTrackKey: "",
    renderedStartedAt: 0,
  });
  CFG.bgm = true;
  CFG.mute = false;
  vi.spyOn(AU, "tick").mockImplementation(() => {});
});

afterEach(() => {
  if (AU.timer) clearInterval(AU.timer);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("全画面 BGM", () => {
  it("音声初期化前のメニュー曲要求を覚え、初回操作後に始められる", () => {
    AU.startMenuBgm();

    expect(AU.bgmWanted).toBe(true);
    expect(AU.scene).toBe("menu");
    expect(AU.playing).toBe(false);

    installReadyGraph();
    AU.ensureBgm();

    expect(AU.playing).toBe(true);
    expect(AU.renderedSource).not.toBeNull();
    expect(AU.timer).toBeNull();
    expect(AU.tick).not.toHaveBeenCalled();
  });

  it("同じ画面で再要求しても完成BGMを作り直さない", () => {
    installReadyGraph();
    AU.startMenuBgm();
    const source = AU.renderedSource;

    AU.startMenuBgm();

    expect(AU.renderedSource).toBe(source);
  });

  it("メニュー・戦闘・時代の変更に合わせて専用BGMを交差切替する", () => {
    installReadyGraph();
    AU.startMenuBgm();
    const menuSource = AU.renderedSource;
    expect(AU.renderedTrackKey).toBe("menu");

    AU.startBgm(0);
    const primitiveSource = AU.renderedSource;
    expect(AU.scene).toBe("battle");
    expect(AU.renderedTrackKey).toBe("era0");
    expect(primitiveSource).not.toBe(menuSource);

    AU.setEra(1);
    expect(AU.era).toBe(1);
    expect(AU.renderedTrackKey).toBe("era1");
    expect(AU.renderedSource).not.toBe(primitiveSource);

    AU.startMenuBgm();
    AU.setEra(4);
    expect(AU.scene).toBe("menu");
    expect(AU.renderedTrackKey).toBe("menu");
  });

  it("BGM設定OFFでは予約だけ残し、ONに戻すと現在の画面曲を再開する", () => {
    installReadyGraph();
    CFG.bgm = false;
    AU.startMenuBgm();

    expect(AU.bgmWanted).toBe(true);
    expect(AU.playing).toBe(false);

    CFG.bgm = true;
    AU.setBgm();
    expect(AU.playing).toBe(true);
    expect(AU.renderedSource).not.toBeNull();

    CFG.bgm = false;
    AU.setBgm();
    expect(AU.playing).toBe(false);
    expect(AU.renderedSource).toBeNull();
    expect(AU.bgmWanted).toBe(true);
  });

  it("BGMをONに戻すと停止した位置から続ける", () => {
    installReadyGraph();
    AU.startMenuBgm();
    Object.defineProperty(AU.ctx, "currentTime", { value: 14, configurable: true });

    CFG.bgm = false;
    AU.setBgm();
    expect(AU.renderedOffsets.menu).toBe(10);

    CFG.bgm = true;
    AU.setBgm();
    expect(AU.renderedSource.start).toHaveBeenCalledWith(0, 10);
  });

  it("メニューと全6時代のBGMをOGGとして同梱する", () => {
    const names = [
      "jidai-adventure",
      "era0-primitive",
      "era1-ancient",
      "era2-medieval",
      "era3-early-modern",
      "era4-modern",
      "era5-contemporary",
      "awe-layer",
    ];
    for (const name of names) {
      const audio = fs.readFileSync(path.resolve(__dirname, `../src/assets/audio/${name}.ogg`));
      expect(audio.subarray(0, 4).toString("ascii"), name).toBe("OggS");
      expect(audio.byteLength, name).toBeGreaterThan(500_000);
    }
  });

  it("メニュー曲は律音階の和楽器で展開する四小節の冒険テーマ", () => {
    expect(MENU_MUSIC.bpm).toBe(86);
    expect(MENU_MUSIC.mel).toBe("adventure");
    expect(MENU_MUSIC.pad).toBe("sho");
    expect(MENU_MUSIC.drum).toHaveLength(64);
    expect(MENU_MUSIC.bass).toHaveLength(64);
    expect(MENU_MUSIC.m).toHaveLength(64);
    expect(MENU_MUSIC.scale).toEqual([0, 2, 5, 7, 9]);
  });

  it("冒険テーマを64ステップ目の次で正しくループする", () => {
    vi.mocked(AU.tick).mockRestore();
    AU.ctx = stubAudioContext();
    AU.bgmG = fakeGain();
    Object.assign(AU, {
      ready: true,
      playing: true,
      scene: "menu",
      step: 63,
      nextT: 4,
    });
    const schedule = vi.spyOn(AU, "schedule").mockImplementation(() => {});

    AU.tick();

    expect(schedule).toHaveBeenCalledWith(MENU_MUSIC, 63, 4, 60 / 86 / 4);
    expect(AU.step).toBe(0);
  });

  it("冒険テーマに琴・尺八・笙・太鼓を重ねる", () => {
    AU.ctx = stubAudioContext();
    AU.bgmG = fakeGain();
    const pluck = vi.spyOn(AU, "pluck").mockImplementation(() => {}),
      flute = vi.spyOn(AU, "flute").mockImplementation(() => {}),
      sho = vi.spyOn(AU, "sho").mockImplementation(() => {}),
      taiko = vi.spyOn(AU, "taiko").mockImplementation(() => {});

    AU.schedule(MENU_MUSIC, 0, 1, 60 / 86 / 4);

    expect(pluck).toHaveBeenCalled();
    expect(flute).toHaveBeenCalled();
    expect(sho).toHaveBeenCalled();
    expect(taiko).toHaveBeenCalled();
  });

  it("全時代の戦闘曲に笙と鉦の和楽器層を重ねる", () => {
    AU.ctx = stubAudioContext();
    AU.bgmG = fakeGain();
    const sho = vi.spyOn(AU, "sho").mockImplementation(() => {}),
      gong = vi.spyOn(AU, "gong").mockImplementation(() => {});
    for (const track of MUSIC) AU.schedule(track, 0, 1, 0.12);

    expect(sho).toHaveBeenCalledTimes(MUSIC.length);
    expect(gong).toHaveBeenCalledTimes(MUSIC.length);
  });

  it("主要な戦闘外画面はメニュー曲を予約し、途中でBGMを停止しない", () => {
    const root = path.resolve(__dirname, "../src");
    const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
    expect(read("main.ts")).toContain("AU.startMenuBgm()");
    expect(read("ui/authUI.ts")).toContain("AU.startMenuBgm()");
    expect(read("ui/home.ts")).toContain("AU.startMenuBgm()");
    expect(read("ui/result.ts")).toContain("AU.startMenuBgm()");
    expect(read("ui/home.ts") + read("ui/result.ts")).not.toContain("AU.stopBgm()");
  });
});

describe("畏を音へ移す", () => {
  it("音がまだ立ち上がっていなくても落ちない", () => {
    // 初回操作より前は AudioContext が無い。ここで例外が出ると起動が止まる
    Object.assign(AU, { ctx: null, bgmTone: null, bgmWet: null, bgmDry: null, renderedSource: null });
    expect(() => AU.setAwe(0.5)).not.toThrow();
  });

  it("畏が高いほど、こもって遠くなる", () => {
    const param = () => ({ value: 0, setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
    const tone = { frequency: param() },
      wet = { gain: param() },
      dry = { gain: param() };
    Object.assign(AU, {
      ctx: { currentTime: 0 } as unknown as AudioContext,
      bgmTone: tone as unknown as BiquadFilterNode,
      bgmWet: wet as unknown as GainNode,
      bgmDry: dry as unknown as GainNode,
      renderedSource: null,
    });

    AU.setAwe(0);
    expect(tone.frequency.setTargetAtTime).toHaveBeenLastCalledWith(9800, 0, 0.5);
    expect(wet.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.16, 0, 0.5);

    AU.setAwe(1);
    // 低域通過が下がり（世界が遠のく）、残響が増える（空間が洞になる）
    expect(tone.frequency.setTargetAtTime).toHaveBeenLastCalledWith(2000, 0, 0.5);
    expect(wet.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 0, 0.5);
  });

  it("0〜1 の外を渡されても押し込む", () => {
    const param = () => ({ value: 0, setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
    const tone = { frequency: param() };
    Object.assign(AU, {
      ctx: { currentTime: 0 } as unknown as AudioContext,
      bgmTone: tone as unknown as BiquadFilterNode,
      bgmWet: null,
      bgmDry: null,
      renderedSource: null,
    });
    AU.setAwe(5);
    expect(tone.frequency.setTargetAtTime).toHaveBeenLastCalledWith(2000, 0, 0.5);
    AU.setAwe(-5);
    expect(tone.frequency.setTargetAtTime).toHaveBeenLastCalledWith(9800, 0, 0.5);
  });
});
