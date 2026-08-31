import { ARMS, ERAS, LIN, META, debutOf } from "@/data/master";
import { LINE_COL, lineName } from "@/data/skills";
import { tryDrawSkillSprite } from "@/render/skillSprites";
import { drawUnitAt } from "@/render/unit";
import { DPR, popCamera, pushCamera } from "@/render/viewport";
import { SAVE } from "@/save/save";
import { produce } from "@/sim/production";
import { skLv, skillAt, useSkill } from "@/sim/skills";
import { G } from "@/sim/state";
import { makeUnit } from "@/sim/unit";
import { $ } from "@/ui/dom";
import { attachDrag, reorderTeam } from "@/ui/drag";

/* =====================================================================
   戦闘中の生産カードと技ボタン。
   DOM を毎フレーム作り直さず、要素を使い回して中身だけ書き換える。
   ===================================================================== */

/** 生産カード1枚ぶんの DOM 参照。era/key は「前回と同じなら描き直さない」ための覚え書き */
export interface Card {
  el: HTMLElement;
  pic: HTMLCanvasElement;
  nm: HTMLElement;
  cost: HTMLElement;
  arm: HTMLElement;
  cd: HTMLElement;
  lk: HTMLElement;
  era: number;
  key: string;
}

/** 技ボタン1つぶん。技には残り待ち時間の帯を出すので cost を流用している */
export interface SkillCard {
  el: HTMLElement;
  pic: HTMLCanvasElement;
  nm: HTMLElement;
  arm: HTMLElement;
  cost: HTMLElement;
  key: string;
}

/** sizePic() が返す、実寸を揃えたあとの描き込み先 */
export interface PicSurface {
  c: CanvasRenderingContext2D;
  /** CSS ピクセルでの幅・高さ（DPR を掛ける前） */
  w: number;
  h: number;
}

export let cards: Card[] = [];
export let skillCards: SkillCard[] = [];

export function drawPreview(
  c: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  lin: number,
  era: number,
  scale: number,
): void {
  if (!(cw > 4 && ch > 4 && scale > 0.02)) return;
  const cam = pushCamera(ch - 1, scale, 0);
  const u = makeUnit(0, lin, era, 0, false);
  u.st = "idle"; // カードの絵姿は歩かせない
  c.clearRect(0, 0, cw, ch);
  drawUnitAt(c, u, cw / 2, 0, scale);
  popCamera(cam);
}
export function buildCards(n?: number): void {
  const cnt = Math.max(
    1,
    Math.min(
      META.teamSize || 6,
      n || (G && G.team && G.team.length) || (SAVE && SAVE.team && SAVE.team.length) || 5,
    ),
  );
  const wrap = $("cards");
  wrap.innerHTML = "";
  cards = [];
  for (let i = 0; i < cnt; i++) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML =
      '<span class="arm"></span><canvas class="pic"></canvas><span class="nm"></span><span class="cost"></span><span class="cd"></span><span class="lk"></span>';
    attachDrag(el, i, {
      els: () => cards.map((c) => c.el),
      enabled: () => !!(G && G.team),
      onTap: (k) => produce(k),
      onReorder: (a, b) => reorderTeam(a, b),
    });
    wrap.appendChild(el);
    cards.push({
      el,
      pic: el.querySelector(".pic"),
      nm: el.querySelector(".nm"),
      cost: el.querySelector(".cost"),
      arm: el.querySelector(".arm"),
      cd: el.querySelector(".cd"),
      lk: el.querySelector(".lk"),
      era: -1,
      key: "",
    });
  }
  skillCards = [];
  for (let s = 0; s < 2; s++) {
    const sk = document.createElement("div");
    sk.className = "card skill";
    sk.innerHTML =
      '<span class="arm"></span><canvas class="pic"></canvas><span class="nm"></span><span class="cost"></span>';
    sk.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      useSkill(s);
    });
    wrap.appendChild(sk);
    skillCards.push({
      el: sk,
      pic: sk.querySelector(".pic"),
      nm: sk.querySelector(".nm"),
      arm: sk.querySelector(".arm"),
      cost: sk.querySelector(".cost"),
      key: "",
    });
  }
  refreshCards(true);
}
/** カード内キャンバスの実解像度を DPR に合わせる。疑似回転の影響を受けない実寸で測る */
export function sizePic(cn: HTMLCanvasElement): PicSurface {
  const w = cn.offsetWidth,
    h = cn.offsetHeight;
  cn.width = Math.max(8, Math.round(w * DPR));
  cn.height = Math.max(8, Math.round(h * DPR));
  const c = cn.getContext("2d");
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  return { c, w, h };
}
export function refreshCards(force?: boolean): void {
  const e = G ? G.era : 0;
  const need = G && G.team ? G.team.length : cards.length;
  if (need !== cards.length) {
    buildCards(need);
    return;
  }
  for (let i = 0; i < cards.length; i++) {
    const cd = cards[i];
    const li = G && G.team ? G.team[i] : i,
      key = e + ":" + li;
    if (cd.key === key && !force) continue;
    cd.key = key;
    cd.era = e;
    const db = debutOf(li),
      open = db <= e;
    cd.nm.textContent = open ? LIN[li].forms[e] : LIN[li].name;
    cd.arm.textContent = ARMS[LIN[li].arm];
    cd.lk.textContent = open ? "" : ERAS[db].n + "で解放";
    const p = sizePic(cd.pic);
    drawPreview(p.c, p.w, p.h, li, Math.max(e, db), Math.min(p.h / 50, p.w / 26, 1.5));
  }
  for (let s = 0; s < skillCards.length; s++) {
    const sc = skillCards[s],
      S2 = skillAt(e, s),
      line = S2.line;
    const key = e + ":" + S2.id + ":" + skLv(line);
    if (sc.key === key && !force) continue;
    sc.key = key;
    sc.nm.textContent = S2.n;
    sc.arm.textContent = lineName(line) + (skLv(line) > 1 ? " Lv" + skLv(line) : "");
    sc.el.title = S2.d || "";
    const col = LINE_COL[line] || ERAS[e].pal.accent;
    const p = sizePic(sc.pic);
    p.c.clearRect(0, 0, p.w, p.h);
    if (tryDrawSkillSprite(p.c, S2.id, p.w, p.h)) continue;
    const cx = p.w / 2,
      cy = p.h / 2,
      r = Math.min(p.w, p.h) * 0.3;
    p.c.globalAlpha = 0.28;
    p.c.fillStyle = col;
    p.c.beginPath();
    p.c.arc(cx, cy, r * 1.55, 0, 7);
    p.c.fill();
    p.c.globalAlpha = 1;
    p.c.fillStyle = col;
    p.c.beginPath();
    if (line === "sai") {
      // 天災：渦を巻く風
      p.c.closePath();
      p.c.strokeStyle = col;
      p.c.lineWidth = Math.max(1.8, r * 0.34);
      p.c.lineCap = "round";
      p.c.beginPath();
      for (let k = 0; k < 3; k++) {
        const a0 = k * 2.1,
          rr = r * (1.15 - k * 0.3);
        p.c.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
        p.c.arc(cx, cy, rr, a0, a0 + 2.5);
      }
      p.c.stroke();
      p.c.fillStyle = col;
      p.c.beginPath();
      p.c.arc(cx, cy, r * 0.24, 0, 7);
      p.c.fill();
    } else {
      // 妖：角のある面
      p.c.moveTo(cx - r * 0.86, cy - r * 0.42);
      p.c.quadraticCurveTo(cx, cy - r * 1.3, cx + r * 0.86, cy - r * 0.42);
      p.c.quadraticCurveTo(cx + r * 0.62, cy + r * 1.2, cx, cy + r * 1.24);
      p.c.quadraticCurveTo(cx - r * 0.62, cy + r * 1.2, cx - r * 0.86, cy - r * 0.42);
      p.c.closePath();
      p.c.fill();
      p.c.beginPath(); // 角
      p.c.moveTo(cx - r * 0.7, cy - r * 0.72);
      p.c.lineTo(cx - r * 0.96, cy - r * 1.34);
      p.c.lineTo(cx - r * 0.34, cy - r * 0.92);
      p.c.moveTo(cx + r * 0.7, cy - r * 0.72);
      p.c.lineTo(cx + r * 0.96, cy - r * 1.34);
      p.c.lineTo(cx + r * 0.34, cy - r * 0.92);
      p.c.closePath();
      p.c.fill();
      p.c.fillStyle = "rgba(10,13,18,.72)"; // 目
      p.c.beginPath();
      p.c.ellipse(cx - r * 0.34, cy - r * 0.1, r * 0.2, r * 0.13, 0.2, 0, 7);
      p.c.fill();
      p.c.beginPath();
      p.c.ellipse(cx + r * 0.34, cy - r * 0.1, r * 0.2, r * 0.13, -0.2, 0, 7);
      p.c.fill();
    }
    p.c.strokeStyle = "rgba(10,13,18,.55)";
    p.c.lineWidth = 1.4;
  }
}
