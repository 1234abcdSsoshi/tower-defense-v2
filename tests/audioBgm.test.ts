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
  AU.ctx = {
    currentTime: 4,
    createGain: () => fakeGain(),
  } as unknown as AudioContext;
  AU.bgmG = fakeGain();
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
    expect(AU.trackG).not.toBeNull();
    expect(AU.timer).not.toBeNull();
    expect(AU.tick).toHaveBeenCalledOnce();
  });

  it("同じ画面曲を再要求してもタイマーと曲を作り直さない", () => {
    installReadyGraph();
    AU.startMenuBgm();
    const timer = AU.timer;
    const track = AU.trackG;

    AU.startMenuBgm();

    expect(AU.timer).toBe(timer);
    expect(AU.trackG).toBe(track);
  });

  it("メニューと戦闘、および戦闘時代の変更時だけ曲を交差切替する", () => {
    installReadyGraph();
    AU.startMenuBgm();
    const menuTrack = AU.trackG;

    AU.startBgm(0);
    const primalTrack = AU.trackG;
    expect(AU.scene).toBe("battle");
    expect(primalTrack).not.toBe(menuTrack);

    AU.setEra(1);
    expect(AU.era).toBe(1);
    expect(AU.trackG).not.toBe(primalTrack);

    AU.startMenuBgm();
    const returnedMenuTrack = AU.trackG;
    AU.setEra(4);
    expect(AU.scene).toBe("menu");
    expect(AU.trackG).toBe(returnedMenuTrack);
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

    CFG.bgm = false;
    AU.setBgm();
    expect(AU.playing).toBe(false);
    expect(AU.bgmWanted).toBe(true);
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
