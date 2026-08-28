import { AU } from "@/audio/index";
import { LIN } from "@/data/master";
import { SAVE, saveNow } from "@/save/save";
import { G } from "@/sim/state";
import { refreshCards } from "@/ui/cards";
import { updateHud } from "@/ui/hud";

/** ドラッグ並べ替えの受け口。並び順の実体は呼び出し側が持つ */
export interface DragCtx {
  /** 並んでいる要素を左から順に返す */
  els: () => HTMLElement[];
  /** 今この行を操作してよいか */
  enabled?: () => boolean;
  /** 動かさずに離した（＝ふつうの押下） */
  onTap?: (idx: number) => void;
  /** 掴んだ位置から離した位置へ */
  onReorder?: (from: number, to: number) => void;
}

/* ---------- 横並びの要素をドラッグで並べ替える ----------
   タップ（生産・解除）とドラッグ（並べ替え）は移動量で区別する。
   実際のDOM順は動かさず、transformで見た目だけずらして、離した時に配列を並べ替える。 */
export const DRAG_TH = 10;
export function attachDrag(el: HTMLElement, idx: number, ctx: DragCtx): void {
  el.addEventListener("pointerdown", (e) => {
    if (ctx.enabled && !ctx.enabled()) return;
    if (e.button !== undefined && e.button !== 0) return;
    const els = ctx.els();
    if (els.length < 1) return;
    // offsetLeft/Widthは疑似回転(#appのtransform)の影響を受けない「並びの向き」そのままの値
    const step = els.length > 1 ? els[1].offsetLeft - els[0].offsetLeft : el.offsetWidth;
    const rot = document.body.classList.contains("is-portrait");
    const x0 = e.clientX,
      y0 = e.clientY;
    let moved = false,
      target = idx;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}
    const move = (ev: PointerEvent): void => {
      // 疑似回転時は実画面の縦方向の動きが、見た目上の横方向の動きにあたる
      const dx = rot ? ev.clientY - y0 : ev.clientX - x0;
      if (!moved) {
        if (Math.abs(dx) < DRAG_TH) return;
        moved = true;
        el.classList.add("dragging");
      }
      el.style.transform = "translateX(" + dx + "px) scale(1.05)";
      const t = Math.max(0, Math.min(els.length - 1, Math.round(idx + dx / (step || 1))));
      if (t !== target) {
        target = t;
        for (let j = 0; j < els.length; j++) {
          if (j === idx) continue;
          let sh = 0;
          if (idx < target && j > idx && j <= target) sh = -step;
          else if (idx > target && j >= target && j < idx) sh = step;
          els[j].style.transform = sh ? "translateX(" + sh + "px)" : "";
        }
      }
    };
    const up = (ev: PointerEvent): void => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch (_) {}
      for (const e2 of ctx.els()) {
        e2.style.transform = "";
        e2.classList.remove("dragging");
      }
      if (moved) {
        if (target !== idx && ctx.onReorder) ctx.onReorder(idx, target);
      } else if (ctx.onTap) ctx.onTap(idx);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  });
}
/* 戦闘中の並べ替え。系譜基準で生産しているので、順番を変えても待機時間も記録も乱れない */
export function reorderTeam(from: number, to: number): void {
  if (!G || !G.team) return;
  const t = G.team,
    [m] = t.splice(from, 1);
  t.splice(to, 0, m);
  if (SAVE && SAVE.team && SAVE.team.length === t.length) {
    SAVE.team = t.map((li) => LIN[li].id);
    saveNow();
  }
  refreshCards(true);
  updateHud();
  AU.fx("ui");
}
