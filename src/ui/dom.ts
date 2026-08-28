import { REPLAY } from "@/save/replay";

/* =====================================================================
   DOM への最小限の入口。ここ以外で document を直接触らないこと。
   ===================================================================== */

/** id で要素を引く。存在しない id は書き間違いなので、握りつぶさず落ちるに任せる */
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

/** 画面下に短く出る通知。リプレイ中は出さない（無人で回るため） */
export function toast(txt: string, col?: string): void {
  if (REPLAY) return;
  // シムからも呼ばれる。画面が無い環境（テスト・ゴーストの検証）では黙って捨てる
  if (typeof document === "undefined") return;
  const el = $<HTMLElement & { _t?: ReturnType<typeof setTimeout> }>("toast");
  if (!el) return;
  el.textContent = txt;
  el.style.color = col || "#FFF3D0";
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1100);
}
