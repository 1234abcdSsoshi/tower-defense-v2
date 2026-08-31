/* =====================================================================
   同梱する書体を、ゲームが使う字だけに絞って焼く。

   ダウンロード版はオフラインで動く必要があり、書体を網から取りに行けない。
   かといって全字入れると 35MB。実際に出る 1,200 字ほどへ絞れば 1MB を切る。

   使いかた:
     node scripts/collect-glyphs.mjs      使う字を集める
     node scripts/build-fonts.mjs <原本の置き場>

   原本（TTF）は Google Fonts の配布そのままを使う。ライセンスは OFL で、
   同梱・再配布が認められている（LICENSE を一緒に置くこと）。
   ===================================================================== */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = process.argv[2];
const OUT = path.join(ROOT, "src/assets/fonts");

if (!SRC || !fs.existsSync(SRC)) {
  console.error("原本の置き場を渡してください: node scripts/build-fonts.mjs <dir>");
  process.exit(1);
}

/** 画面で使っている書体と太さ。CSS の font-weight と合わせること */
const FACES = [
  { file: "ShipporiMinchoB1-SemiBold.ttf", family: "Shippori Mincho B1", weight: 600 },
  { file: "ShipporiMinchoB1-ExtraBold.ttf", family: "Shippori Mincho B1", weight: 800 },
  { file: "ZenKakuGothicNew-Medium.ttf", family: "Zen Kaku Gothic New", weight: 500 },
  { file: "ZenKakuGothicNew-Bold.ttf", family: "Zen Kaku Gothic New", weight: 700 },
  { file: "ZenKakuGothicNew-Black.ttf", family: "Zen Kaku Gothic New", weight: 900 },
  { file: "IBMPlexMono-Medium.ttf", family: "IBM Plex Mono", weight: 500 },
];

const glyphFile = path.join(ROOT, "scripts/glyphs.txt");
if (!fs.existsSync(glyphFile)) {
  console.error("先に node scripts/collect-glyphs.mjs を実行してください");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
let total = 0;
const css = [];

for (const face of FACES) {
  const src = path.join(SRC, face.file);
  if (!fs.existsSync(src)) {
    console.error("原本が無い:", face.file);
    process.exit(1);
  }
  const out = path.join(OUT, face.file.replace(/\.ttf$/, ".woff2"));
  execFileSync(
    "pyftsubset",
    [
      src,
      `--text-file=${glyphFile}`,
      "--flavor=woff2",
      `--output-file=${out}`,
      // 記号や合字の変形は使っていない。落として軽くする
      "--layout-features=",
      "--no-hinting",
      "--desubroutinize",
      "--drop-tables+=DSIG",
      // 字形の対応表は残す。これが無いと文字が引けない
      "--notdef-glyph",
      "--notdef-outline",
    ],
    { stdio: "inherit" },
  );
  const kb = fs.statSync(out).size / 1024;
  total += kb;
  console.log(`  ${face.file.padEnd(34)} -> ${kb.toFixed(0).padStart(5)} KB`);
  css.push(
    `@font-face {\n` +
      `  font-family: "${face.family}";\n` +
      `  font-style: normal;\n` +
      `  font-weight: ${face.weight};\n` +
      `  font-display: block;\n` +
      `  src: url("./${path.basename(out)}") format("woff2");\n` +
      `}`,
  );
}

const header =
  `/* =====================================================================\n` +
  `   同梱の書体。scripts/build-fonts.mjs が作る ── 手で書き換えないこと。\n` +
  `   ゲームが使う字だけに絞ってあるので、新しい字を画面へ出したら\n` +
  `   collect-glyphs → build-fonts をやり直す（さもないと豆腐になる）。\n\n` +
  `   font-display: block にしてあるのは、字が入れ替わって見えるのを\n` +
  `   避けるため。同梱なので待ち時間はほぼ無い。\n` +
  `   書体は SIL Open Font License 1.1（src/assets/fonts/OFL.txt）。\n` +
  `   ===================================================================== */\n\n`;

fs.writeFileSync(path.join(OUT, "fonts.css"), header + css.join("\n\n") + "\n", "utf8");
console.log(`合計 ${total.toFixed(0)} KB / ${FACES.length} 面`);
