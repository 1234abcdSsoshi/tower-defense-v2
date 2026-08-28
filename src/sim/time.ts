import { MIN_UNIT } from "@/core/constants";
import { BAL } from "@/data/master";
import { CFG } from "@/ui/config";

export function timeMinMax(): [number, number] {
  return [(BAL && BAL.timeMin) || 3, (BAL && BAL.timeMax) || 60];
}
export function timeLimitOf(): number {
  const v = CFG.tl,
    [lo, hi] = timeMinMax();
  if (v === 0) return 0;
  const m = Math.round(v / MIN_UNIT);
  return m >= lo && m <= hi ? m * MIN_UNIT : BAL.timeDefault || 600;
}
export function limitMin(): number {
  return Math.round(timeLimitOf() / MIN_UNIT);
}
export function limitLabel(v: number): string {
  return v ? Math.round(v / MIN_UNIT) + " 分" : "無制限";
}
