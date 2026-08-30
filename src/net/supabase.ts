import { CLOUD_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/net/env";

/* =====================================================================
   Supabase の窓口。
   クライアントは「初めて要るとき」に作る。動的 import にしてあるので、
   接続先が設定されていない配布物には SDK 自体が載らない。
   ===================================================================== */
import type { SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getClient(): Promise<SupabaseClient | null> {
  if (!CLOUD_ENABLED) return Promise.resolve(null);
  if (clientPromise) return clientPromise;
  clientPromise = import("@supabase/supabase-js")
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          // 合言葉を入れ直さずに済むよう、セッションは端末に残して自動で更新する
          persistSession: true,
          autoRefreshToken: true,
          // メールの確認リンクから戻ったとき、URL の断片からセッションを拾う。
          // デスクトップ版は file:// 相当で戻り先が無いので拾わない
          detectSessionInUrl: typeof location !== "undefined" && location.protocol.startsWith("http"),
        },
      }),
    )
    .catch((e): null => {
      console.warn("Supabase を読み込めませんでした。端末内の保存だけで続けます", e);
      return null;
    });
  return clientPromise;
}
