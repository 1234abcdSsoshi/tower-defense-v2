/* =====================================================================
   系譜の並べかた。編成でも強化でも同じ順・同じ名で見せる。

   27 系譜を素のまま並べると、どれが味方の三すくみのどこに居るのか
   読めない。陣営で束ねて、頭に見出しを立てる。

   ここを一箇所に持っているのは、編成と強化で並びが食い違うと
   「さっき上にあった駒が無い」と探すはめになるから。
   ===================================================================== */
import { LIN } from "@/data/master";
import type { Lineage } from "@/data/types";

export interface LinGroup {
  key: string;
  /** 見出し */
  name: string;
  /** 見出しの下に一行だけ添える説明 */
  note: string;
  /** 陣営の色。三すくみの色分けに合わせる */
  col: string;
  /** この束に入るか */
  has: (L: Lineage) => boolean;
}

/**
 * 民 → 人間 → 妖怪 → 退魔師 の順。
 * 民を先頭に置いているのは、戦わない駒だと分かった上で
 * 枠を割く判断をしてほしいから（うっかり戦力として数えない）。
 */
export const LIN_GROUPS: LinGroup[] = [
  {
    key: "tami",
    name: "民",
    note: "戦いません。立っているだけで石高を産み、妖が近づくと逃げます",
    col: "#7aa8d4",
    has: (L) => !!L.civil,
  },
  {
    key: "hito",
    name: "人間",
    note: "数と制度。囲むほど退魔師の後押し（畏）を打ち消します",
    col: "#5f8fbf",
    has: (L) => L.attr === "hito" && !L.civil,
  },
  {
    key: "yo",
    name: "妖怪",
    note: "人間に強い。出すほど畏が高まり、討伐の手が厚くなります",
    col: "#a98ade",
    has: (L) => L.attr === "yo",
  },
  {
    key: "tai",
    name: "退魔師",
    note: "妖怪に強い。畏が高いほど力を得ます",
    col: "#d9a94a",
    has: (L) => L.attr === "tai",
  },
];

/** 束ごとに系譜の添字を返す。どの束にも入らない系譜は最後にまとめる */
export function groupedLineages(): { group: LinGroup; idx: number[] }[] {
  const used = new Set<number>();
  const out = LIN_GROUPS.map((group) => {
    const idx: number[] = [];
    LIN.forEach((L, i) => {
      if (!used.has(i) && group.has(L)) {
        used.add(i);
        idx.push(i);
      }
    });
    return { group, idx };
  }).filter((g) => g.idx.length);

  const rest = LIN.map((_, i) => i).filter((i) => !used.has(i));
  if (rest.length) {
    out.push({
      group: { key: "etc", name: "その他", note: "", col: "#9a917f", has: () => true },
      idx: rest,
    });
  }
  return out;
}

/** 見出しの札を作る。グリッドの一行を丸ごと使う */
export function groupHeader(g: LinGroup, tail: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "gsec";
  el.style.setProperty("--gc", g.col);
  el.innerHTML =
    '<span class="gname">' +
    g.name +
    "</span>" +
    (tail ? '<span class="gcount">' + tail + "</span>" : "") +
    (g.note ? '<span class="gnote">' + g.note + "</span>" : "");
  return el;
}
