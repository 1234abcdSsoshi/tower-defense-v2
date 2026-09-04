/* =====================================================================
   作り手のアカウント。全部の駒と全部の戦を使える。

   ここに書く ID は配布物に載るが、秘密ではない。
   誰の画面にも見えるのは「この ID の持ち主は全部使える」という事実だけで、
   その立場を得るにはそのアカウントのパスワードが要る。
   合言葉はこちらでは持っていない（docs/ACCOUNT.md）。

   ブラウザ版だけの仕組み。PC 版はアカウントを持たないので、
   ここは常に false になる。
   ===================================================================== */
import { currentUser } from "@/auth/account";

/** 見せかけのユーザーID（shortId）で照合する */
const OWNERS: { id: string; name: string }[] = [{ id: "5C22-A860", name: "soshi" }];

/** いま入っている人が、全部を使える立場か */
export function isOwner(): boolean {
  const me = currentUser();
  if (!me) return false;
  return OWNERS.some((o) => o.id === me.id);
}
