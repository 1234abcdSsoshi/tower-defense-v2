/* =====================================================================
   引き継ぎコードの画面。設定シートの「引き継ぎ」欄。

   発行 -> 欄にコードが出る -> 写し取る
   読込 -> 欄に貼る -> 中身を見せて確かめてから -> この進行にする

   読み込みは取り返しがつかない（いまの進行が消える）ので、
   一度で終わらせず、必ず中身を見せてから二度目の押下で通す。
   ===================================================================== */
import { AU } from "@/audio/index";
import { SAVE, saveNow, setSaveFailListener } from "@/save/save";
import { applyTransferCode, makeTransferCode, peekTransferCode } from "@/save/transfer";
import { $, toast } from "@/ui/dom";
import { showHome } from "@/ui/home";

/** いま欄に何が入っているか。発行したものと、貼られたものを取り違えないため */
type Mode = "none" | "made" | "pasted";
let mode: Mode = "none";

function box(): HTMLTextAreaElement {
  return $<HTMLTextAreaElement>("xferBox");
}

/** 状況に応じて下のボタン列を出し入れする */
function syncActs(): void {
  const acts = $("xferActs");
  acts.hidden = mode === "none";
  $("xferCopy").hidden = mode !== "made";
  $("xferApply").hidden = mode !== "pasted";
}

export function initTransferUI(): void {
  // 保存できなくなったら黙って捨てず、控えを促す
  setSaveFailListener((reason) => toast(reason, "#ff9a6a"));

  $("xferMake").addEventListener("click", () => {
    AU.fx("ui");
    void (async () => {
      try {
        const code = await makeTransferCode(SAVE);
        box().value = code;
        mode = "made";
        syncActs();
        box().focus();
        box().select();
        // select は末尾まで送る。頭の JIDAI- が見えていないと
        // 「これがコードだ」と分からないので、先頭へ戻す
        box().scrollTop = 0;
        toast("コードを発行しました");
      } catch (e) {
        toast("コードを作れませんでした", "#ff9a6a");
      }
    })();
  });

  $("xferLoad").addEventListener("click", () => {
    AU.fx("ui");
    box().value = "";
    mode = "pasted";
    syncActs();
    box().focus();
    toast("コードを貼り付けてください");
  });

  $("xferCopy").addEventListener("click", () => {
    AU.fx("ui");
    const text = box().value;
    if (!text) return;
    // 書き込みが拒まれる場でも（file:// や許可なし）、選択だけは残す
    box().select();
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast("写し取りました"))
      .catch(() => toast("選択しました。手で写し取ってください"));
  });

  $("xferApply").addEventListener("click", () => {
    AU.fx("ui");
    void (async () => {
      const code = box().value;
      const peek = await peekTransferCode(code);
      if (!peek) {
        toast("読み取れないコードです", "#ff9a6a");
        return;
      }
      const btn = $("xferApply");
      // 一度目は中身を見せるだけ。二度目で通す
      if (btn.dataset.armed !== "1") {
        btn.dataset.armed = "1";
        btn.textContent = `突破 ${peek.cleared} 戦・勾玉 ${peek.mag} に置き換える`;
        btn.classList.add("on");
        toast("いまの進行は消えます。もう一度押すと置き換えます", "#ffd27a");
        setTimeout(() => disarm(), 6000);
        return;
      }
      disarm();
      const r = await applyTransferCode(code);
      toast(r.message, r.ok ? "#FFF3D0" : "#ff9a6a");
      if (!r.ok) return;
      saveNow();
      box().value = "";
      mode = "none";
      syncActs();
      // 拠点を作り直す。編成も強化も、いまの進行を見て組み上がる
      $("cfgSheet").classList.remove("show");
      showHome();
    })();
  });

  syncActs();
}

function disarm(): void {
  const btn = $("xferApply");
  if (btn.dataset.armed !== "1") return;
  delete btn.dataset.armed;
  btn.textContent = "この進行にする";
  btn.classList.remove("on");
}
