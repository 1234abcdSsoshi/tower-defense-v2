import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BPM = 88;
const BARS = 24;
const LMMS_TICKS_PER_BEAT = 48;
const MIDI_TICKS_PER_BEAT = 480;
const BAR_TICKS = LMMS_TICKS_PER_BEAT * 4;
const SONG_TICKS = BAR_TICKS * BARS;

const soundFontArgument = process.argv[2];
if (!soundFontArgument) {
  throw new Error("使い方: node scripts/build-adventure-bgm.mjs <GeneralUser-GS.sf2>");
}

const soundFont = path.resolve(soundFontArgument).replaceAll("\\", "/");
const sourceDirectory = path.resolve("asset/audio/source");
mkdirSync(sourceDirectory, { recursive: true });

const tracks = [
  { name: "Koto - 旅路", channel: 0, program: 107, volume: 74, pan: -22, reverb: 0.42, notes: [] },
  { name: "Shakuhachi - 主題", channel: 1, program: 77, volume: 76, pan: 18, reverb: 0.58, notes: [] },
  { name: "Shamisen - 推進", channel: 2, program: 106, volume: 58, pan: 27, reverb: 0.3, notes: [] },
  { name: "Taiko - 鼓動", channel: 3, program: 116, volume: 77, pan: 0, reverb: 0.34, notes: [] },
  { name: "Strings - 地平", channel: 4, program: 48, volume: 39, pan: -12, reverb: 0.55, notes: [] },
  { name: "Choir - 笙の余韻", channel: 5, program: 52, volume: 27, pan: 12, reverb: 0.68, notes: [] },
  { name: "Contrabass - 大地", channel: 6, program: 43, volume: 47, pan: -5, reverb: 0.2, notes: [] },
  { name: "French Horn - 決意", channel: 7, program: 60, volume: 42, pan: 9, reverb: 0.5, notes: [] },
];

function note(trackIndex, bar, beat, key, durationBeats, velocity, offsetTicks = 0) {
  const position = bar * BAR_TICKS + Math.round(beat * LMMS_TICKS_PER_BEAT) + offsetTicks;
  const length = Math.max(1, Math.round(durationBeats * LMMS_TICKS_PER_BEAT));
  tracks[trackIndex].notes.push({
    position: Math.max(0, position),
    length: Math.min(length, SONG_TICKS - Math.max(0, position)),
    key,
    velocity,
  });
}

const harmony = [
  "Dm",
  "Dm",
  "Gm",
  "A",
  "Dm",
  "F",
  "Gm",
  "A",
  "Dm",
  "Gm",
  "Bb",
  "A",
  "Dm",
  "F",
  "Gm",
  "A",
  "Bb",
  "Gm",
  "Dm",
  "A",
  "Gm",
  "Bb",
  "A",
  "Dm",
];

const chords = {
  Dm: [50, 53, 57],
  F: [53, 57, 60],
  Gm: [55, 58, 62],
  Bb: [58, 62, 65],
  A: [45, 52, 57],
};

const kotoFigures = {
  Dm: [62, 69, 65, 69, 74, 69, 65, 69],
  F: [65, 72, 69, 72, 77, 72, 69, 72],
  Gm: [67, 74, 70, 74, 79, 74, 70, 74],
  Bb: [70, 77, 74, 77, 82, 77, 74, 77],
  A: [69, 76, 72, 76, 81, 76, 72, 76],
};

const roots = { Dm: 38, F: 41, Gm: 43, Bb: 46, A: 45 };

// 筝は全編をつなぐ八分音符。後半ほど音域と強弱を広げる。
for (let bar = 0; bar < BARS; bar += 1) {
  const figure = kotoFigures[harmony[bar]];
  for (let step = 0; step < 8; step += 1) {
    const lift = bar >= 12 && (step === 4 || step === 6) ? 12 : 0;
    const velocity = 48 + (step % 2 === 0 ? 10 : 0) + (bar >= 12 ? 7 : 0) + ((bar + step) % 3);
    const offset = bar === 0 && step === 0 ? 0 : [-1, 1, 0, 1][(bar + step) % 4];
    note(0, bar, step / 2, figure[step] + lift, 0.39, velocity, offset);
  }
}

// 尺八の主題。休符を残し、息遣いを感じる長さにする。
const melody = [
  [4, 0, 74, 1, 74],
  [4, 1, 79, 0.5, 70],
  [4, 1.5, 81, 0.5, 76],
  [4, 2, 84, 1, 82],
  [4, 3, 81, 0.8, 72],
  [5, 0, 82, 1, 76],
  [5, 1, 81, 1, 72],
  [5, 2, 79, 1.8, 75],
  [6, 0, 77, 1, 68],
  [6, 1, 79, 1, 72],
  [6, 2, 81, 1, 79],
  [6, 3, 84, 0.8, 82],
  [7, 0, 81, 1.45, 76],
  [7, 1.5, 79, 0.5, 68],
  [7, 2, 74, 1.7, 70],
  [8, 0, 74, 1, 75],
  [8, 1, 75, 0.5, 67],
  [8, 1.5, 79, 0.5, 75],
  [8, 2, 81, 1, 82],
  [8, 3, 86, 0.8, 86],
  [9, 0, 84, 1, 80],
  [9, 1, 82, 1, 74],
  [9, 2, 81, 1.8, 76],
  [10, 0, 79, 1, 70],
  [10, 1, 81, 1, 76],
  [10, 2, 84, 1, 82],
  [10, 3, 81, 0.8, 74],
  [11, 0, 79, 1.8, 72],
  [11, 2, 74, 1.7, 67],
  [12, 0, 81, 1, 82],
  [12, 1, 84, 1, 86],
  [12, 2, 86, 1.8, 90],
  [13, 0, 86, 1, 86],
  [13, 1, 84, 1, 78],
  [13, 2, 81, 1, 74],
  [13, 3, 79, 0.8, 70],
  [14, 0, 82, 1, 76],
  [14, 1, 86, 1, 88],
  [14, 2, 84, 1, 82],
  [14, 3, 81, 0.8, 74],
  [15, 0, 79, 1.8, 72],
  [15, 2, 81, 1.7, 78],
  [16, 0, 86, 1, 90],
  [16, 1, 87, 0.5, 82],
  [16, 1.5, 86, 0.5, 84],
  [16, 2, 84, 1, 80],
  [16, 3, 81, 0.8, 75],
  [17, 0, 82, 1, 80],
  [17, 1, 81, 1, 74],
  [17, 2, 79, 1.8, 72],
  [18, 0, 77, 1, 68],
  [18, 1, 79, 1, 74],
  [18, 2, 81, 1, 80],
  [18, 3, 84, 0.8, 84],
  [19, 0, 86, 1.8, 88],
  [19, 2, 84, 1, 78],
  [19, 3, 81, 0.8, 72],
  [20, 0, 79, 1, 72],
  [20, 1, 81, 1, 78],
  [20, 2, 82, 1, 82],
  [20, 3, 86, 0.8, 88],
  [21, 0, 84, 1, 82],
  [21, 1, 81, 1, 76],
  [21, 2, 79, 1, 70],
  [21, 3, 77, 0.8, 66],
  [22, 0, 74, 1, 70],
  [22, 1, 79, 1, 76],
  [22, 2, 81, 1, 82],
  [22, 3, 84, 0.8, 84],
  [23, 0, 81, 1, 76],
  [23, 1, 79, 1, 70],
  [23, 2, 77, 0.5, 65],
  [23, 2.5, 75, 0.5, 62],
  [23, 3, 74, 0.85, 72],
];
for (const [bar, beat, key, duration, velocity] of melody) note(1, bar, beat, key, duration, velocity, 1);

// 三味線は中盤から入り、裏拍で隊列の歩みを押し出す。
for (let bar = 8; bar < BARS; bar += 1) {
  const chord = chords[harmony[bar]];
  const strong = bar >= 12 && bar < 20;
  for (const [beat, degree] of [
    [0.5, 0],
    [1.5, 2],
    [2.5, 1],
    [3.5, 2],
  ]) {
    note(2, bar, beat, chord[degree] + 12, 0.22, strong ? 65 : 55, (bar + degree) % 2);
  }
}

// 和太鼓。四小節ごとの終端には連打を置き、展開を明確にする。
for (let bar = 0; bar < BARS; bar += 1) {
  const intro = bar < 4;
  note(3, bar, 0, 48, 0.3, intro ? 64 : 88);
  if (!intro || bar % 2 === 1) note(3, bar, 2, 43, 0.3, intro ? 58 : 76, 1);
  if (bar >= 12 && bar < 20) {
    note(3, bar, 1.5, 50, 0.22, 64, -1);
    note(3, bar, 3, 48, 0.22, 72, 1);
  }
  if (bar % 4 === 3) {
    note(3, bar, 3.25, 50, 0.18, 62);
    note(3, bar, 3.5, 52, 0.18, 70, 1);
    note(3, bar, 3.75, 55, 0.18, 82, -1);
  }
}

// 弦と声の層は笙のような持続感を担う。ループ端には短い空気を残す。
for (let bar = 0; bar < BARS; bar += 1) {
  const chord = chords[harmony[bar]];
  for (const pitch of chord) note(4, bar, 0, pitch + 12, bar === BARS - 1 ? 3.75 : 3.9, bar >= 12 ? 50 : 42);
  note(5, bar, 0, chord[0] + 24, bar === BARS - 1 ? 3.7 : 3.9, bar >= 12 ? 38 : 31);
  note(5, bar, 0, chord[2] + 24, bar === BARS - 1 ? 3.7 : 3.9, bar >= 12 ? 34 : 27);
}

// 低音は二分音符単位。フレーズ後半だけ上行して推進力を強める。
for (let bar = 0; bar < BARS; bar += 1) {
  const root = roots[harmony[bar]];
  note(6, bar, 0, root, 1.8, bar < 4 ? 46 : 62);
  note(6, bar, 2, bar >= 12 && bar < 20 ? root + 7 : root, 1.75, bar < 4 ? 42 : 56, 1);
}

// 金管は冒険性を補うが、和楽器の主題を隠さないよう節目だけに限定する。
const hornLines = [
  [0, 0, 50, 3.8, 44],
  [2, 0, 55, 3.8, 46],
  [4, 0, 50, 1.8, 48],
  [6, 0, 55, 1.8, 50],
  [8, 0, 50, 1.8, 52],
  [10, 0, 58, 1.8, 55],
  [12, 0, 50, 1.8, 60],
  [13, 2, 53, 1.8, 58],
  [14, 0, 55, 1.8, 62],
  [15, 2, 57, 1.8, 60],
  [16, 0, 58, 1.8, 64],
  [17, 2, 55, 1.8, 60],
  [18, 0, 50, 1.8, 66],
  [19, 2, 57, 1.8, 62],
  [20, 0, 55, 1.8, 56],
  [22, 0, 57, 1.8, 54],
  [23, 2, 50, 1.7, 48],
];
for (const [bar, beat, key, duration, velocity] of hornLines) note(7, bar, beat, key, duration, velocity);

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function lmmsTrack(track) {
  const noteXml = track.notes
    .sort((a, b) => a.position - b.position || a.key - b.key)
    .map(
      (item) =>
        `        <note key="${item.key}" vol="${Math.round((item.velocity / 127) * 100)}" pos="${item.position}" pan="0" len="${item.length}"/>`,
    )
    .join("\n");
  return `    <track type="0" muted="0" name="${xmlEscape(track.name)}" solo="0">
      <instrumenttrack pitch="0" vol="${track.volume}" fxch="0" pan="${track.pan}" basenote="57" usemasterpitch="1" pitchrange="1">
        <instrument name="sf2player">
          <sf2player patch="${track.program}" chorusLevel="0.35" chorusDepth="5" reverbOn="1" reverbRoomSize="0.68" chorusOn="${track.program === 48 || track.program === 52 ? 1 : 0}" chorusSpeed="0.32" reverbDamping="0.42" chorusNum="3" reverbLevel="${track.reverb}" bank="0" reverbWidth="0.82" src="${xmlEscape(soundFont)}" gain="1"/>
        </instrument>
        <eldata fwet="0" ftype="0" fres="0.5" fcut="14000">
          <elvol lspd="0.1" ctlenvamt="0" lpdel="0" pdel="0" amt="0" hold="0.5" syncmode="0" userwavefile="" latt="0" sustain="0.5" lamt="0" lshp="0" lspd_denominator="4" lspd_numerator="4" x100="0" rel="0.1" dec="0.5" att="0"/>
          <elcut lspd="0.1" ctlenvamt="0" lpdel="0" pdel="0" amt="0" hold="0.5" syncmode="0" userwavefile="" latt="0" sustain="0.5" lamt="0" lshp="0" lspd_denominator="4" lspd_numerator="4" x100="0" rel="0.1" dec="0.5" att="0"/>
          <elres lspd="0.1" ctlenvamt="0" lpdel="0" pdel="0" amt="0" hold="0.5" syncmode="0" userwavefile="" latt="0" sustain="0.5" lamt="0" lshp="0" lspd_denominator="4" lspd_numerator="4" x100="0" rel="0.1" dec="0.5" att="0"/>
        </eldata>
        <chordcreator chordrange="1" chord="0" chord-enabled="0"/>
        <arpeggiator arpdir="0" arpgate="100" arptime_denominator="4" syncmode="0" arp-enabled="0" arprange="1" arptime_numerator="4" arpmode="0" arp="0" arptime="100"/>
        <midiport inputchannel="0" fixedinputvelocity="-1" outputcontroller="0" outputchannel="${track.channel + 1}" fixedoutputvelocity="-1" readable="0" fixedoutputnote="-1" outputprogram="${track.program + 1}" writable="0" basevelocity="127" inputcontroller="0"/>
        <fxchain numofeffects="0" enabled="0"/>
      </instrumenttrack>
      <pattern type="1" muted="0" steps="16" name="${xmlEscape(track.name)}" pos="0" len="${SONG_TICKS}">
${noteXml}
      </pattern>
    </track>`;
}

const project = `<?xml version="1.0"?>
<!DOCTYPE lmms-project>
<lmms-project type="song" version="1.0" creator="LMMS" creatorversion="1.2.2">
  <head timesig_denominator="4" bpm="${BPM}" masterpitch="0" mastervol="88" timesig_numerator="4"/>
  <song>
    <trackcontainer visible="1" width="1180" height="720" type="song" x="0" y="0" maximized="1" minimized="0">
${tracks.map(lmmsTrack).join("\n")}
    </trackcontainer>
    <track type="6" muted="0" name="Automation track" solo="0">
      <automationtrack/>
      <automationpattern prog="0" mute="0" name="Tempo" pos="0" tens="1" len="192"><time pos="0" value="${BPM}"/></automationpattern>
      <automationpattern prog="0" mute="0" name="Master volume" pos="0" tens="1" len="192"><time pos="0" value="88"/></automationpattern>
      <automationpattern prog="0" mute="0" name="Master pitch" pos="0" tens="1" len="192"><time pos="0" value="0"/></automationpattern>
    </track>
    <fxmixer visible="0" width="647" height="332" x="0" y="0" maximized="0" minimized="0">
      <fxchannel num="0" muted="0" volume="0.92" name="Master" soloed="0"><fxchain numofeffects="0" enabled="0"/></fxchannel>
    </fxmixer>
    <ControllerRackView visible="0" width="258" height="173" x="0" y="0" maximized="0" minimized="0"/>
    <pianoroll visible="0" width="900" height="600" x="0" y="0" maximized="0" minimized="0"/>
    <automationeditor visible="0" width="800" height="500" x="0" y="0" maximized="0" minimized="0"/>
    <projectnotes visible="0" width="640" height="400" x="0" y="0" maximized="0" minimized="0"><![CDATA[Original composition for 時代戦線. 88 BPM / 24 bars / seamless loop.]]></projectnotes>
    <timeline lp0pos="0" lp1pos="${SONG_TICKS}" lpstate="1"/>
    <controllers/>
  </song>
</lmms-project>
`;

function variableLength(value) {
  const bytes = [value & 0x7f];
  for (value >>= 7; value > 0; value >>= 7) bytes.unshift((value & 0x7f) | 0x80);
  return bytes;
}

function midiTrack(events) {
  const sorted = events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const bytes = [];
  let previousTick = 0;
  for (const event of sorted) {
    bytes.push(...variableLength(event.tick - previousTick), ...event.data);
    previousTick = event.tick;
  }
  bytes.push(0, 0xff, 0x2f, 0);
  const size = bytes.length;
  return [
    0x4d,
    0x54,
    0x72,
    0x6b,
    (size >>> 24) & 255,
    (size >>> 16) & 255,
    (size >>> 8) & 255,
    size & 255,
    ...bytes,
  ];
}

function textEvent(type, value) {
  const bytes = [...Buffer.from(value, "utf8")];
  return [0xff, type, ...variableLength(bytes.length), ...bytes];
}

const conductor = [
  { tick: 0, order: 0, data: textEvent(0x03, "Jidai Sensen - Harukanaru Shingun") },
  { tick: 0, order: 1, data: textEvent(0x02, "Original composition for Jidai Sensen") },
  {
    tick: 0,
    order: 2,
    data: [
      0xff,
      0x51,
      0x03,
      ...[
        (Math.round(60_000_000 / BPM) >>> 16) & 255,
        (Math.round(60_000_000 / BPM) >>> 8) & 255,
        Math.round(60_000_000 / BPM) & 255,
      ],
    ],
  },
  { tick: 0, order: 3, data: [0xff, 0x58, 0x04, 4, 2, 24, 8] },
];

const midiTracks = [midiTrack(conductor)];
for (const track of tracks) {
  const events = [
    { tick: 0, order: 0, data: textEvent(0x03, track.name) },
    { tick: 0, order: 1, data: [0xc0 | track.channel, track.program] },
    { tick: 0, order: 2, data: [0xb0 | track.channel, 7, Math.min(127, Math.round(track.volume * 1.18))] },
    { tick: 0, order: 3, data: [0xb0 | track.channel, 10, Math.round(((track.pan + 100) / 200) * 127)] },
    { tick: 0, order: 4, data: [0xb0 | track.channel, 91, Math.round(track.reverb * 127)] },
  ];
  for (const item of track.notes) {
    const start = item.position * (MIDI_TICKS_PER_BEAT / LMMS_TICKS_PER_BEAT);
    const end = (item.position + item.length) * (MIDI_TICKS_PER_BEAT / LMMS_TICKS_PER_BEAT);
    events.push(
      { tick: start, order: 10, data: [0x90 | track.channel, item.key, item.velocity] },
      { tick: end, order: 5, data: [0x80 | track.channel, item.key, 0] },
    );
  }
  midiTracks.push(midiTrack(events));
}

const midiHeader = [
  0x4d,
  0x54,
  0x68,
  0x64,
  0,
  0,
  0,
  6,
  0,
  1,
  0,
  midiTracks.length,
  (MIDI_TICKS_PER_BEAT >>> 8) & 255,
  MIDI_TICKS_PER_BEAT & 255,
];

writeFileSync(path.join(sourceDirectory, "jidai-adventure.mmp"), project);
writeFileSync(
  path.join(sourceDirectory, "jidai-adventure.mid"),
  Buffer.from([...midiHeader, ...midiTracks.flat()]),
);

console.log(`LMMSプロジェクト: ${path.join(sourceDirectory, "jidai-adventure.mmp")}`);
console.log(`MIDI: ${path.join(sourceDirectory, "jidai-adventure.mid")}`);
console.log(`長さ: 約${((BARS * 4 * 60) / BPM).toFixed(1)}秒`);
