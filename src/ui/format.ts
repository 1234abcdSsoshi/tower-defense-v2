import { DSEC } from "@/core/constants";

export function dsec(s: number): number {
  return s * DSEC;
}
export function mmss(s: number): string {
  const v = Math.max(0, Math.round(s));
  return Math.floor(v / 60) + ":" + String(v % 60).padStart(2, "0");
}
