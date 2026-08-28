/* =====================================================================
   Service Worker のキャッシュ世代に版数を焼き込む。
   VER が変わらないと、利用者のブラウザが古い殻を返し続けて
   「更新したのに古いまま」という一番たちの悪い事故になる。
   vite build のあとに必ず走らせること（npm run build がそうしている）。
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";

const outDir = process.argv[2] ?? "dist/web";
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const file = path.join(outDir, "sw.js");

if (!fs.existsSync(file)) {
  console.log(`- ${file} が無いので何もしません（desktop ビルドでは正常）`);
  process.exit(0);
}
const src = fs.readFileSync(file, "utf8");
if (!src.includes("__APP_VERSION__")) {
  console.warn(`! ${file} に __APP_VERSION__ がありません。版数が固定されている可能性があります`);
}
// ビルドのたびに必ず変わるよう、版数に加えてビルド時刻も混ぜる
const stamp = `${version}-${Date.now().toString(36)}`;
fs.writeFileSync(file, src.replaceAll("__APP_VERSION__", stamp));
console.log(`✓ ${file} の世代を jidai-${stamp} にしました`);
