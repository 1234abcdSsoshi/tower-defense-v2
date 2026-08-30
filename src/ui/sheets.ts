import { $ } from "@/ui/dom";

/* ---------- 画面遷移 ---------- */
export const SHEETS = [
  "titleSheet",
  "homeSheet",
  "stageSheet",
  "teamSheet",
  "skSheet",
  "upSheet",
  "gachaSheet",
  "authSheet",
  "resSheet",
  "cfgSheet",
];
export function hideSheets(): void {
  for (const id of SHEETS) {
    const e = $(id);
    if (e) e.classList.remove("show");
  }
}
export function showSheet(id: string): void {
  hideSheets();
  $(id).classList.add("show");
}
