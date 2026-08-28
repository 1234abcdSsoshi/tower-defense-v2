/* =====================================================================
   背景・前景は時代ごとにオフスクリーンへ焼いて使い回す。
   時代が変わったとき／画面寸法が変わったときだけ捨てる。

   二つのキャッシュを同じモジュールに置いてあるのは、
   「捨てるときは必ず両方いっしょ」という前提を型の上でも守るため。
   background.ts と foreground.ts の双方から参照されるが、
   このモジュールは何も import しないので循環にならない。
   ===================================================================== */
import type { FgLayer } from "@/render/foreground";

/** 時代インデックス -> 焼いた背景レイヤー */
export const bgCache: Record<number, HTMLCanvasElement> = {};
/** 時代インデックス -> 焼いた前景レイヤー（草・静止物） */
export const fgCache: Record<number, FgLayer> = {};

/** 背景と前景の焼き直しを促す。解像度変更・マスタ差し替え・開戦時に呼ぶ */
export function clearSceneryCache(): void {
  for (const k of Object.keys(bgCache)) delete bgCache[k as unknown as number];
  for (const k of Object.keys(fgCache)) delete fgCache[k as unknown as number];
}
