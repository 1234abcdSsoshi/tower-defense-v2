import { describe, expect, it } from "vitest";

import { LIN } from "@/data/master";
import { shotSpecOf } from "@/sim/fx";
import type { Arm } from "@/data/types";
import type { Unit } from "@/sim/types";

function unit(lineage: string, era: number, arm: Arm): Unit {
  return {
    lin: LIN.findIndex((entry) => entry.id === lineage),
    era,
    arm,
  } as Unit;
}

function kinds(lineage: string, arm: Arm): string[] {
  return Array.from({ length: 6 }, (_, era) => shotSpecOf(unit(lineage, era, arm)).kind);
}

describe("ユニットに合った飛び道具", () => {
  it("投げる者は石から弓矢・火矢・銃弾・光弾へ進歩する", () => {
    const eras = kinds("throw", "archer");
    expect(eras).toEqual(["stone", "ancient-arrow", "samurai-arrow", "fire-arrow", "rifle-bullet", "smart-round"]);
    expect(new Set(eras).size).toBe(6);
  });

  it("兵射・馬射・遠矢の各系譜も名称と武器に合わせる", () => {
    expect(kinds("pbow", "archer")).toEqual(["stone", "ancient-arrow", "samurai-arrow", "matchlock-ball", "rifle-bullet", "smart-round"]);
    expect(kinds("ubow", "archer")).toEqual(["stone", "ancient-arrow", "samurai-arrow", "matchlock-ball", "rifle-bullet", "missile"]);
    expect(kinds("snipe", "archer")).toEqual(["ancient-arrow", "ancient-arrow", "samurai-arrow", "matchlock-ball", "rifle-bullet", "smart-round"]);
  });

  it("攻城兵と航空兵も投石・砲弾・爆弾・ミサイルを使い分ける", () => {
    expect(kinds("make", "siege")).toEqual(["stone", "stone", "stone", "shell", "shell", "shell"]);
    expect(kinds("siegeH", "siege")).toEqual(["shell", "shell", "shell", "shell", "shell", "bolt"]);
    expect(kinds("fly", "air")).toEqual(["stone", "stone", "stone", "stone", "bomb", "missile"]);
  });
});
