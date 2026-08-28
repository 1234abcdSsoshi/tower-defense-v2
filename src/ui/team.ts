import { AU } from "@/audio/index";
import { ARMS, ERAS, LIN, META, NE, debutOf, linIndex } from "@/data/master";
import { LINE_COL, defaultPick, skById } from "@/data/skills";
import { DPR } from "@/render/viewport";
import { SAVE, saveNow } from "@/save/save";
import { drawPreview } from "@/ui/cards";
import { $ } from "@/ui/dom";
import { attachDrag } from "@/ui/drag";
import { showSheet } from "@/ui/sheets";
import { showSkill } from "@/ui/skillSelect";

/** 系譜カードの見た目と付記 */
export interface LineCardOpts {
  /** 編成に入っている */
  on?: boolean;
  /** 選べない（未所持など） */
  dis?: boolean;
  /** 強化に要る素材数。上限に達していたら「最大」 */
  cost?: string;
  /** 出撃順の番号 */
  slot?: number | string;
}

/* ---------- 編成 ---------- */
export function lineCard(i: number, opts: LineCardOpts): HTMLElement {
  const L = LIN[i],
    sv = SAVE.lin[L.id];
  const el = document.createElement("div");
  el.className = "lcard" + (opts.on ? " on" : "") + (opts.dis ? " no" : "");
  el.innerHTML =
    '<div class="lr"><canvas></canvas><div><div class="ln">' +
    L.name +
    '</div><div class="la">' +
    ARMS[L.arm] +
    '　<span class="db">' +
    ERAS[L.debut || 0].n +
    "から</span></div></div></div>" +
    (L.role ? '<div class="lrole">' + L.role + "</div>" : "") +
    '<div class="lv">Lv ' +
    sv.lv +
    (opts.cost !== undefined ? '　<span class="cost">素材 ' + opts.cost + "</span>" : "") +
    "</div>" +
    '<div class="bar"><i style="width:' +
    Math.round(((sv.lv - 1) / ((META.lvMax || 10) - 1)) * 100) +
    '%"></i></div>' +
    (opts.slot ? '<span class="slot">' + opts.slot + "</span>" : "");
  const cn = el.querySelector("canvas");
  cn.width = Math.max(8, Math.round(30 * DPR));
  cn.height = Math.max(8, Math.round(36 * DPR));
  const c = cn.getContext("2d");
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawPreview(c, 30, 36, i, Math.max(Math.min(4, NE - 1), L.debut || 0), Math.min(36 / 52, 30 / 26));
  return el;
}
export function showTeam(): void {
  showSheet("teamSheet");
  $("tsN").textContent = String(META.teamSize);
  renderTeam();
}
/* 出撃順の行。ここでの並びがそのまま戦闘中のカードの並びになる */
export function renderSlots(): void {
  const box = $("teamSlots");
  box.innerHTML = "";
  for (let i = 0; i < META.teamSize; i++) {
    const id = SAVE.team[i];
    const el = document.createElement("div");
    el.className = "slot" + (id ? "" : " empty");
    if (id) {
      const li = linIndex(id),
        L = LIN[li];
      el.innerHTML =
        '<span class="n">' +
        (i + 1) +
        "</span><canvas></canvas>" +
        '<span class="nm">' +
        L.name +
        '</span><span class="ar">' +
        ARMS[L.arm] +
        "</span>";
      const cn = el.querySelector("canvas");
      cn.width = Math.max(8, Math.round(26 * DPR));
      cn.height = Math.max(8, Math.round(31 * DPR));
      const c = cn.getContext("2d");
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawPreview(c, 26, 31, li, Math.max(Math.min(4, NE - 1), L.debut || 0), Math.min(31 / 52, 26 / 26));
    } else el.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="nm">空き</span>';
    box.appendChild(el);
  }
  const filled = () => [...box.querySelectorAll<HTMLElement>(".slot:not(.empty)")];
  filled().forEach((el, i) =>
    attachDrag(el, i, {
      els: filled,
      onReorder: (a, b) => {
        const t = SAVE.team,
          [m] = t.splice(a, 1);
        t.splice(b, 0, m);
        saveNow();
        AU.fx("ui");
        renderTeam();
      },
      onTap: (k) => {
        if (SAVE.team.length <= 1) return;
        SAVE.team.splice(k, 1);
        saveNow();
        AU.fx("ui");
        renderTeam();
      },
    }),
  );
}
export function renderLines(): void {
  const box = $("lineRow");
  if (!box) return;
  box.innerHTML = "";
  const pk = SAVE.pick || defaultPick();
  const el = document.createElement("div");
  el.className = "lcell on skSum";
  el.innerHTML = ERAS.map(
    (E, e) =>
      '<span class="eb">' +
      E.n +
      "</span>" +
      (pk[e] || [])
        .map((id) => {
          const s = skById(id);
          return '<span style="color:' + (LINE_COL[s.line] || "#888") + '">' + s.n + "</span>";
        })
        .join("・"),
  ).join('<span class="sep">／</span>');
  el.addEventListener("click", () => {
    AU.fx("ui");
    showSkill();
  });
  box.appendChild(el);
}
export function renderTeam(): void {
  renderSlots();
  renderLines();
  const G2 = $("teamGrid");
  G2.innerHTML = "";
  LIN.forEach((L, i) => {
    const sv = SAVE.lin[L.id],
      pos = SAVE.team.indexOf(L.id);
    const el = lineCard(i, { on: pos >= 0, dis: !sv.owned });
    if (sv.owned)
      el.addEventListener("click", () => {
        AU.fx("ui");
        const p = SAVE.team.indexOf(L.id);
        if (p >= 0) {
          if (SAVE.team.length <= 1) return;
          SAVE.team.splice(p, 1);
        } else if (SAVE.team.length >= META.teamSize) {
          $("teamNote").textContent = "枠が埋まっています。上の出撃順から1つタップして外してください";
          return;
        } else SAVE.team.push(L.id);
        saveNow();
        renderTeam();
      });
    G2.appendChild(el);
  });
  const n = SAVE.team.length;
  const mp = META.minPrimal || 0;
  const prim = SAVE.team.filter((id) => debutOf(linIndex(id)) === 0).length;
  const ok = n >= 1 && n <= META.teamSize && prim >= mp;
  $("teamNote").textContent = !ok
    ? prim < mp
      ? ERAS[0].n + "から使える系譜を" + mp + "つ以上入れてください（現在 " + prim + "）"
      : "1つ以上選んでください"
    : "編成 " +
      n +
      "／" +
      META.teamSize +
      "　" +
      SAVE.team.map((id) => LIN[linIndex(id)].name).join("・") +
      (n < META.teamSize ? "　（あと" + (META.teamSize - n) + "枠 空き）" : "");
  $<HTMLButtonElement>("teamOk").disabled = !ok;
  $("teamOk").style.opacity = ok ? "1" : "0.45";
}
