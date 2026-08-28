import { AFF, ARMS, ERAS, META, NE } from "@/data/master";
import { $ } from "@/ui/dom";
import type { Arm } from "@/data/types";

/* ---------- 遊びかた ----------
   時代の数も兵科の相性も倍率もマスタ次第で変わる。文章に数値を焼き込むと必ず古くなるので、
   ここだけは表示のたびにマスタから組み立てる。 */
export const KANSUJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
export function kansuji(v: number): string {
  return v >= 0 && v < KANSUJI.length ? KANSUJI[v] : String(v);
}
export function armName(a: Arm): string {
  return ARMS[a] || a;
}
// 三すくみの輪を 歩兵→弓→騎馬→歩兵 の一本の鎖に畳む
export function cycleText(): string {
  const cy = (AFF && AFF.cycle) || [];
  if (!cy.length) return "";
  const seq = [cy[0][0]];
  for (let i = 0; i < cy.length; i++) {
    const nx = cy.find((p) => p[0] === seq[seq.length - 1]);
    if (!nx) break;
    seq.push(nx[1]);
  }
  return seq.map(armName).join("→");
}
export function extraText(): string {
  return ((AFF && AFF.extra) || []).map((e) => armName(e[0]) + "→" + armName(e[1])).join("／");
}
export function renderHelp(): void {
  const sub = $("titleSub"),
    ul = $("helpList");
  if (!sub || !ul || !AFF) return;
  sub.textContent = ERAS[0].n + "から" + ERAS[NE - 1].n + "まで、" + kansuji(NE) + "つの時代を駆け上がる";
  const cyN = (AFF.cycle || []).length;
  const exV = (AFF.extra || []).map((e) => e[2]).filter((v, i, a) => a.indexOf(v) === i);
  const exTxt = extraText();
  const aaEra = ERAS.findIndex((E) => E.civ && E.civ.aa);
  const keyN = Math.min(9, META.teamSize || 5);
  ul.innerHTML = [
    "下のカードを押すと<b>石高</b>を消費して兵を出します。兵は自動で前進します。",
    "戦っていると<b>文（ふみ）</b>が溜まります。満ちたら<b>進化</b>で次の時代へ。",
    "<b>進化の実行中は兵を出せず、石高もゼロに戻ります。</b>いつ進化するかがこのゲームの全てです。",
    "敵も時代とともに強くなります。進化を遅らせすぎると押し切られます。",
    "兵科は<b>" +
      cycleText() +
      "</b>の" +
      kansuji(cyN) +
      "すくみ。有利なら" +
      AFF.adv +
      "倍、不利なら" +
      AFF.dis +
      "倍。",
    (exTxt
      ? "さらに<b>" + exTxt + "</b>が有利" + (exV.length === 1 ? "（" + exV[0] + "倍）" : "") + "。"
      : "") +
      "<b>飛行に攻撃が届くのは" +
      armName("archer") +
      "だけ</b>です" +
      (aaEra > 0 ? "（" + ERAS[aaEra].n + "からは拠点の対空砲も届きます）" : "") +
      "。",
    "拠点を割るのは<b>" + armName("siege") + "</b>です（拠点へのダメージ" + (AFF.siegeCastle || 1) + "倍）。",
    "<b>カードは横にドラッグすると並べ替えられます。</b>戦闘中でも変えられます（出撃前は編成画面で）。",
    "キーボードなら <b>1〜" + keyN + "</b> で出撃、<b>Space</b> で進化、<b>Q</b>／<b>W</b> で技。",
    "<b>制限時間内に決着がつかないと敗北</b>です。守るだけでは勝てません。",
    "音が出ます。BGMは時代ごとに変わります（右上の <b>♪</b> で消音、設定で個別に調整）。",
  ]
    .map((t) => "<li>" + t + "</li>")
    .join("");
}
