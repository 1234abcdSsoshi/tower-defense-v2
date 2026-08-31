import { AU } from "@/audio/index";
import { DSEC } from "@/core/constants";
import { ERAS } from "@/data/master";
import { LINE_COL, defaultPick, lineName, skById, skillPool } from "@/data/skills";
import { skillSpriteUrl } from "@/render/skillSprites";
import { SAVE } from "@/save/save";
import { skCdOfS } from "@/sim/skills";
import { $ } from "@/ui/dom";
import { showSheet } from "@/ui/sheets";
import type { Skill } from "@/data/skills";

/** 技カードの見た目の切り替え */
export interface SkCardOpts {
  /** 選択済み */
  on?: boolean;
  /** まだ届いていない時代の技 */
  dim?: boolean;
}

/* ---------- 強化 ---------- */
/* ---------- 技を選ぶ ---------- */
/** いま編集している時代タブ */
export let skEra = 0;
/** 決定を押すまでの下書き。SAVE.pick はここを写して初めて変わる */
export let skDraft: string[][] = null;
export function setSkDraft(v: string[][]): void {
  skDraft = v;
}
/** 決定後にどの画面へ戻るか。"homeSheet" か "teamSheet" */
export let skFrom = "teamSheet";
export function showSkill(from?: string): void {
  skDraft = (SAVE.pick || defaultPick()).map((a) => a.slice());
  skEra = 0;
  skFrom = from || "teamSheet";
  showSheet("skSheet");
  renderSkill();
}
export function skCard(s: Skill, opts: SkCardOpts): HTMLElement {
  const el = document.createElement("div");
  el.className = "skc" + (opts.on ? " on" : "") + (opts.dim ? " dim" : "");
  el.innerHTML =
    '<img class="skIcon" alt="" src="' +
    skillSpriteUrl(s.id) +
    '"><div class="skBody"><div class="h"><span class="dot2" style="background:' +
    (LINE_COL[s.line] || "#888") +
    '"></span>' +
    '<span class="nm">' +
    s.n +
    '</span><span class="er">' +
    ERAS[s.era].n +
    "</span></div>" +
    '<div class="ds">' +
    (s.d || "") +
    "</div>" +
    '<div class="cd">' +
    lineName(s.line) +
    "　間隔 " +
    Math.round(skCdOfS(s) * DSEC) +
    "秒</div></div>";
  return el;
}
export function renderSkill(): void {
  // 時代のタブ
  const tabs = $("skEras");
  tabs.innerHTML = "";
  ERAS.forEach((E, e) => {
    const b = document.createElement("button");
    b.className = e === skEra ? "on" : "";
    b.textContent = E.n;
    b.onclick = () => {
      AU.fx("ui");
      skEra = e;
      renderSkill();
    };
    tabs.appendChild(b);
  });
  // 選んだ二つ
  const row = skDraft[skEra] || [];
  const sl = $("skSlots");
  sl.innerHTML = "";
  for (let i = 0; i < 2; i++) {
    const id = row[i],
      el = document.createElement("div");
    if (id) {
      const s = skById(id);
      el.className = "slot";
      el.innerHTML =
        '<span class="n">' +
        (i + 1) +
        '</span><img class="skIcon" alt="" src="' +
        skillSpriteUrl(s.id) +
        '">' +
        '<span class="nm" style="color:' +
        (LINE_COL[s.line] || "#888") +
        '">' +
        s.n +
        "</span>" +
        '<span class="ar">' +
        ERAS[s.era].n +
        "の" +
        lineName(s.line) +
        "</span>";
      el.addEventListener("click", () => {
        AU.fx("ui");
        skDraft[skEra] = row.filter((x) => x !== id);
        renderSkill();
      });
    } else {
      el.className = "slot empty";
      el.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="nm">空き</span>';
    }
    sl.appendChild(el);
  }
  // 選べる技
  const pool = $("skPool");
  pool.innerHTML = "";
  skillPool(skEra).forEach((s) => {
    const on = row.indexOf(s.id) >= 0;
    const full = row.length >= 2 && !on;
    const el = skCard(s, { on, dim: full });
    if (!full)
      el.addEventListener("click", () => {
        AU.fx("ui");
        const r = skDraft[skEra];
        if (on) skDraft[skEra] = r.filter((x) => x !== s.id);
        else if (r.length < 2) r.push(s.id);
        renderSkill();
      });
    pool.appendChild(el);
  });
  // 決定できるか
  const bad = [];
  for (let e = 0; e < ERAS.length; e++) if ((skDraft[e] || []).length !== 2) bad.push(ERAS[e].n);
  const ok = !bad.length;
  $<HTMLButtonElement>("skOk").disabled = !ok;
  $("skOk").style.opacity = ok ? "1" : "0.45";
  $("skNote").textContent = ok
    ? ERAS[skEra].n + "：" + skDraft[skEra].map((id) => skById(id).n).join("・")
    : bad.join("・") + " が足りません（それぞれ二つ）";
}
