import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceDirectory = path.resolve("asset/audio/source");
const baseProjectPath = path.join(sourceDirectory, "jidai-adventure.mmp");
const baseProject = readFileSync(baseProjectPath, "utf8");

const arrangements = [
  {
    slug: "era0-primitive",
    title: "原始・大地の鼓動",
    bpm: 72,
    transpose: -5,
    tracks: [
      [115, 34],
      [77, 74],
      [115, 38],
      [116, 92],
      [43, 18],
      [52, 20],
      [43, 58],
      [60, 0],
    ],
  },
  {
    slug: "era1-ancient",
    title: "古代・天平の風",
    bpm: 80,
    transpose: 2,
    tracks: [
      [107, 70],
      [77, 78],
      [106, 20],
      [116, 70],
      [48, 30],
      [52, 42],
      [43, 40],
      [60, 0],
    ],
  },
  {
    slug: "era2-medieval",
    title: "中世・武門の旗",
    bpm: 88,
    transpose: 0,
    tracks: [
      [107, 68],
      [77, 68],
      [106, 54],
      [116, 86],
      [48, 38],
      [52, 24],
      [43, 50],
      [60, 48],
    ],
  },
  {
    slug: "era3-early-modern",
    title: "近世・城下疾走",
    bpm: 98,
    transpose: -2,
    tracks: [
      [107, 60],
      [77, 54],
      [106, 76],
      [116, 94],
      [48, 42],
      [52, 14],
      [43, 55],
      [60, 58],
    ],
  },
  {
    slug: "era4-modern",
    title: "近代・維新行進",
    bpm: 104,
    transpose: 5,
    tracks: [
      [0, 54],
      [73, 54],
      [0, 46],
      [47, 78],
      [48, 60],
      [52, 14],
      [43, 56],
      [56, 66],
    ],
  },
  {
    slug: "era5-contemporary",
    title: "現代・情報戦線",
    bpm: 112,
    transpose: 7,
    tracks: [
      [80, 48],
      [81, 56],
      [99, 48],
      [118, 78],
      [89, 54],
      [91, 28],
      [38, 60],
      [62, 60],
    ],
  },
];

function arrangeTrack(trackXml, [program, volume], transpose) {
  return trackXml
    .replace(/(<instrumenttrack[^>]*\bvol=")\d+("[^>]*>)/, `$1${volume}$2`)
    .replace(/(<sf2player\b[^>]*\bpatch=")\d+("[^>]*>)/, `$1${program}$2`)
    .replace(/(<midiport\b[^>]*\boutputprogram=")\d+("[^>]*>)/, `$1${program + 1}$2`)
    .replace(/(<note\b[^>]*\bkey=")(\d+)(")/g, (_, before, key, after) => {
      const transposed = Math.max(0, Math.min(127, Number(key) + transpose));
      return `${before}${transposed}${after}`;
    });
}

function buildArrangement(config) {
  let trackIndex = 0;
  return baseProject
    .replace(/(<head\b[^>]*\bbpm=")\d+("[^>]*>)/, `$1${config.bpm}$2`)
    .replace(/<track type="0"[\s\S]*?<\/track>/g, (trackXml) =>
      arrangeTrack(trackXml, config.tracks[trackIndex++], config.transpose),
    )
    .replace(
      /(<automationpattern[^>]*name="Tempo"[^>]*>[\s\S]*?<time pos="0" value=")\d+("\/>)\s*<\/automationpattern>/,
      `$1${config.bpm}$2</automationpattern>`,
    )
    .replace(
      /<projectnotes[\s\S]*?<\/projectnotes>/,
      `<projectnotes visible="0" width="640" height="500" x="0" y="0" maximized="0" minimized="0"><![CDATA[${config.title}\nOriginal arrangement for 時代戦線. ${config.bpm} BPM / 24 bars / seamless loop.]]></projectnotes>`,
    );
}

mkdirSync(sourceDirectory, { recursive: true });
for (const arrangement of arrangements) {
  const destination = path.join(sourceDirectory, `${arrangement.slug}.mmp`);
  writeFileSync(destination, buildArrangement(arrangement));
  console.log(`${arrangement.title}: ${destination}`);
}
