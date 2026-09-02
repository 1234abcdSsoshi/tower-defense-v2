/* =====================================================================
   アカウント機能の設定。

   ブラウザ版だけの機能。買った人が遊ぶ PC 版は、今まで通り
   網につながずに起動してすぐ遊べる（CLAUDE.md の約束）。
   IS_WEB はコンパイル時の定数なので、PC 版のバンドルからは
   この下のコードごと落ちる。

   鍵は .env に書く。無ければアカウント機能は現れず、
   ゲームは今まで通り端末の中だけで進行を持つ。
   ===================================================================== */
import { IS_WEB } from "@/platform/env";

/** Supabase プロジェクトの URL。例: https://xxxx.supabase.co */
export const SB_URL: string = (import.meta.env.VITE_SUPABASE_URL as string) || "";

/**
 * 公開鍵（anon key）。
 * これはブラウザに配って良い鍵で、単体では何も読めない。
 * 実際の出入りは Supabase 側の RLS（行単位の権限）が決める。
 * service_role の鍵はここに置かないこと ── あれは全権を持つ。
 */
export const SB_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

/** アカウント機能を出すか。設定が無ければ黙って引っ込む */
export const AUTH_ON: boolean = IS_WEB && !!SB_URL && !!SB_KEY;

/**
 * ユーザー名から作る、見せかけの電子メール宛先。
 *
 * Supabase の認証は宛先を要る作りになっているが、この遊びでは
 * メールを送らないし、預かりたくもない。そこでユーザー名から
 * 決まった文字列を作って宛先の代わりにする。
 * 実在しない領域なので、誰にも届かない。
 */
export const NAME_DOMAIN = "users.jidai-sensen.example";
