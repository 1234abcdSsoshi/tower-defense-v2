/* =====================================================================
   ゲームが実際に画面へ出す文字を、ソースから残らず集める。
   同梱する書体はここで集めた字だけに絞る。全部入れると 35MB、
   絞れば 1MB を切る ── ダウンロード版では効く差になる。

   集め漏れると、その字だけ豆腐（□）になる。だから多めに拾う：
   master.json は値も鍵も、ソースは文字列リテラルもコメントも見る。
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
let text = "";

const eat = (p) => {
  text += fs.readFileSync(p, "utf8");
};
const walk = (dir, re) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, re);
    else if (re.test(e.name)) eat(p);
  }
};

eat(path.join(ROOT, "index.html"));
walk(path.join(ROOT, "src"), /\.(ts|css|json)$/);

/* 遊ぶ人の目に入りうるが、ソースには無い字を足しておく。
   数字・記号・かな全域は、どう転んでも出る可能性がある */
const EXTRA =
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
  " !\"#$%&'()*+,-./:;<=>?@[]^_`{|}~" +
  "　、。，．・：；？！゛゜´｀¨＾￣＿ヽヾゝゞ〃仝々〆〇ー―‐／＼〜‖｜…‥‘’“”（）〔〕［］｛｝〈〉《》「」『』【】＋－±×÷＝≠＜＞≦≧∞∴♂♀°′″℃￥＄￠￡％＃＆＊＠§☆★○●◎◇◆□■△▲▽▼※〒→←↑↓〓" +
  "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをん" +
  "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ";

const chars = new Set([...text, ...EXTRA]);
chars.delete("\n");
chars.delete("\r");
chars.delete("\t");

const list = [...chars].sort();
const out = path.join(ROOT, "scripts", "glyphs.txt");
fs.writeFileSync(out, list.join(""), "utf8");
console.log(`${list.length} 字を ${path.relative(ROOT, out)} へ書き出しました`);
