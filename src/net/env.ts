/* =====================================================================
   接続先の設定。値は .env（Git には入れない）から来る。
   設定が無ければオンライン機能はまるごと眠り、
   ゲームは今までどおり端末内の保存だけで完全に動く。

   anon キーは「公開してよい鍵」で、これ自体は秘密ではない。
   データを守るのは鍵ではなく、Supabase 側の行レベルセキュリティ（RLS）。
   supabase/schema.sql を必ず適用すること。適用しないと、
   誰でも他人の進行データを読み書きできる状態になる。
   ===================================================================== */

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** オンライン機能を使える状態か */
export const CLOUD_ENABLED = url.startsWith("https://") && anonKey.length > 20;

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
