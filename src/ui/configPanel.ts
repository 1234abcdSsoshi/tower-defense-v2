import { AU } from "@/audio/index";
import { MIN_UNIT } from "@/core/constants";
import { BAL, ERAS, LIN, LOCK_OPTS, MASTER_SRC, MASTER_VER } from "@/data/master";
import { limitMin, timeMinMax } from "@/sim/time";
import { CFG, saveCfg } from "@/ui/config";
import { $ } from "@/ui/dom";
import { dsec } from "@/ui/format";

export function syncCfgUI(): void {
  const trow = $("timeRow");
  if (trow) {
    const [lo, hi] = timeMinMax(),
      unl = CFG.tl === 0,
      cur = limitMin();
    if (!trow.dataset.built) {
      trow.dataset.built = "1";
      trow.innerHTML =
        '<button class="opt step" id="tlDown">−</button>' +
        '<span class="tlVal" id="tlVal">—</span>' +
        '<button class="opt step" id="tlUp">＋</button>' +
        '<button class="opt" id="tlInf">無制限</button>';
      // 押しっぱなしで送れるようにする。20分から45分まで25回叩かせない
      const hold = (el: HTMLElement, dir: number): void => {
        let tm: ReturnType<typeof setTimeout> = null;
        let iv: ReturnType<typeof setInterval> = null;
        const step = () => {
          if (CFG.tl === 0) {
            CFG.tl = CFG.tlBack || BAL.timeDefault || 600;
          } else {
            CFG.tl = Math.max(lo, Math.min(hi, limitMin() + dir)) * MIN_UNIT;
          }
          CFG.tlBack = CFG.tl;
          saveCfg();
          syncCfgUI();
        };
        const stop = () => {
          clearTimeout(tm);
          clearInterval(iv);
          tm = null;
          iv = null;
        };
        el.addEventListener("pointerdown", (ev: PointerEvent) => {
          ev.preventDefault();
          AU.fx("ui");
          step();
          tm = setTimeout(() => {
            iv = setInterval(step, 90);
          }, 420);
        });
        for (const e2 of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(e2, stop);
      };
      hold($("tlDown"), -1);
      hold($("tlUp"), 1);
      $("tlInf").addEventListener("click", () => {
        AU.fx("ui");
        if (CFG.tl === 0) {
          CFG.tl = CFG.tlBack || BAL.timeDefault || 600;
        } else {
          CFG.tlBack = CFG.tl;
          CFG.tl = 0;
        }
        saveCfg();
        syncCfgUI();
      });
    }
    $("tlVal").textContent = unl ? "無制限" : cur + " 分";
    $("tlVal").classList.toggle("inf", unl);
    const dn = $<HTMLButtonElement>("tlDown"),
      up = $<HTMLButtonElement>("tlUp");
    dn.disabled = unl || cur <= lo;
    up.disabled = unl || cur >= hi;
    dn.style.opacity = dn.disabled ? "0.35" : "1";
    up.style.opacity = up.disabled ? "0.35" : "1";
    $("tlInf").classList.toggle("on", unl);
  }
  const row = $("lockRow");
  row.innerHTML = "";
  LOCK_OPTS.forEach((v) => {
    const b = document.createElement("button");
    b.className = "opt" + (CFG.lock === v ? " on" : "");
    b.textContent = dsec(v) + " 秒";
    b.onclick = () => {
      CFG.lock = v;
      saveCfg();
      syncCfgUI();
    };
    row.appendChild(b);
  });
  $("markOpt").classList.toggle("on", CFG.mark);
  $("fpsOpt").classList.toggle("on", CFG.fps);
  $("fps").classList.toggle("show", CFG.fps);
  $("bgmOpt").classList.toggle("on", CFG.bgm);
  $("sfxOpt").classList.toggle("on", CFG.sfx);
  const vr = $("volRow");
  vr.innerHTML = "";
  const VOLS: [number, string][] = [
    [0.35, "音量 小"],
    [0.7, "音量 中"],
    [1, "音量 大"],
  ];
  VOLS.forEach(([v, lab]) => {
    const b = document.createElement("button");
    b.className = "opt" + (CFG.vol === v ? " on" : "");
    b.textContent = lab;
    b.onclick = () => {
      CFG.vol = v;
      CFG.mute = false;
      saveCfg();
      AU.setVol();
      AU.fx("ui");
      syncCfgUI();
    };
    vr.appendChild(b);
  });
  const mb = $("muteBtn");
  mb.textContent = CFG.mute ? "消" : "♪";
  mb.classList.toggle("on", CFG.mute);
  const vn = $("verNote");
  if (vn)
    vn.textContent =
      "データ v" + MASTER_VER + "（" + MASTER_SRC + "）／" + ERAS.length + "時代 × " + LIN.length + "系譜";
}
