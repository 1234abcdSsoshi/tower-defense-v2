# アカウント（ブラウザ版）

ブラウザ版だけの機能。ユーザー名とパスワードで登録するとユーザーIDが発行され、
別の端末でログインすれば続きから遊べる。

**買った人が遊ぶ PC 版には入っていない。** `IS_WEB` がコンパイル時の定数なので、
PC 版のバンドルからはアカウント関係のコードが丸ごと落ちる（`pnpm build:desktop`
した `dist/desktop/assets/index-*.js` を `signUp` で検索すると出てこない）。
PC 版は今まで通り、網につながずに起動してすぐ遊べる。

設定していなければ、アカウントの入口は**画面に出ない**。
ゲームは今まで通り、進行を端末の中だけで持つ。

---

## 用意する（一度だけ）

### 1. Supabase のプロジェクトを作る

<https://supabase.com> で無料のプロジェクトを一つ作る。

### 2. メール確認を切る

**Authentication → Sign In / Providers → Email → Confirm email を off。**

ここを切らないと、登録しても合鍵が返らず「サーバー側でメール確認が
有効になっています」と表示されて登録が完了しない。

この遊びではメールを送らないし、預かりたくもない。ユーザー名から作った
届かない宛先を使っているので、確認メールは誰にも届かない。

同じ画面の **Minimum password length は 6**（初期値のまま）にしておく。
ゲーム側も 6 字以上で見ているので、ここを 8 などに上げると、
画面を通ったパスワードがサーバーで弾かれ、遊ぶ人には
「パスワードが短すぎます」としか出ない。二重の決まりを作らないこと。

### 3. 進行の置き場を作る

**SQL Editor** で下をそのまま流す。

```sql
-- 進行の預かり所。一人につき一行
create table if not exists public.saves (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 行単位の権限。自分の行しか読めないし、書けない
alter table public.saves enable row level security;

create policy "自分の進行を読む"
  on public.saves for select
  using (auth.uid() = user_id);

create policy "自分の進行を作る"
  on public.saves for insert
  with check (auth.uid() = user_id);

create policy "自分の進行を書き換える"
  on public.saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

RLS を有効にしないと、**誰でも他人の進行を読める**。
`enable row level security` の行を飛ばさないこと。

### 4. 鍵を控える

**Project Settings → API** から二つ。

| 名前            | 置き場                   |
| --------------- | ------------------------ |
| Project URL     | `VITE_SUPABASE_URL`      |
| anon public key | `VITE_SUPABASE_ANON_KEY` |

`service_role` の鍵は**使わない**。あれは RLS を素通りする全権の鍵で、
ブラウザへ配ると誰でも全員の進行を読み書きできる。

### 5. 手元で動かす

`.env.example` を `.env` に複製して、上の二つを書く。
`.env` は Git で追跡していない。

```bash
pnpm dev
```

### 6. 公開する側にも渡す

GitHub の **Settings → Secrets and variables → Actions** に同じ名前で二つ登録する。
`.github/workflows/pages.yml` がビルド時に読む。

**Repository variables のほうに置くこと。** Environment variables ではない。

組んでいるのは `build` ジョブで、これには `environment:` の指定が無い
（`environment: github-pages` が付いているのは `deploy` ジョブだけ）。
Environment variables は、そのジョブが `environment:` でその環境を
宣言していないと読めないので、そちらに置くと**空のまま組み上がり、
アカウントの入口が出ないサイトが公開される**。しかも赤くならない。
黙って機能が消えるだけなので、いちばん気づきにくい間違いかた。

anon key は公開して良い鍵なので Variables で構わない
（Secrets に入れても動くが、その場合は `vars.` を `secrets.` に書き換える）。

`VITE_SUPABASE_URL` は Project ID から組み立てる ──
`https://<Project ID>.supabase.co`。region は使わない。

---

## 中の作り

| やること                   | 場所                    |
| -------------------------- | ----------------------- |
| 鍵と、機能を出すかの判断   | `src/auth/config.ts`    |
| 合鍵の保持と取り替え       | `src/auth/session.ts`   |
| 登録・ログイン・ログアウト | `src/auth/account.ts`   |
| 進行の預け入れ・取り戻し   | `src/auth/cloudSave.ts` |
| 画面                       | `src/ui/authUI.ts`      |

### ユーザー名に日本語が使えるわけ

Supabase の認証は宛先（メール）を要る作りになっている。ユーザー名をそのまま
宛先にすると半角英数字しか使えないので、ユーザー名を NFKC で正して小文字にし、
SHA-256 で算し直した文字列を宛先の代わりにしている
（`u<32桁>@users.jidai-sensen.example`）。

- 日本語のユーザー名が使える
- 「Taro」と「ＴＡＲＯ」が同じアカウントになる（別々にできると本人が入れなくなる）
- ユーザー名の重複は、宛先の重複として Supabase が弾いてくれる

見たままのユーザー名は `user_metadata.username` に入れてあるので、
Supabase の管理画面でも誰が誰か分かる。

### 預けるもの

引き継ぎコードと**同じ中身**。`src/save/transfer.ts` の `carry()` を
両方が呼んでいるので、片方だけゴーストを載せる、といった食い違いが起きない。

**ゴーストは預けない。** 入力ログは最大 1.1MB あり、人数ぶん積むと
無料枠（500MB）が持たない。ゴーストは遊んだ端末の中にだけ残る。

### 進行の突き合わせ

ログインした直後に一度だけ。

- 相手側に何も無い → いま手元にある進行を預ける（初めてログインしたとき）
- 相手側にある、手元はまっさら → そのまま戻す
- 相手側にある、手元にも進行がある → **断りを入れてから**置き換える

三つめは取り返しがつかないので、確認を出す。手元の進行を残したいときは、
先に設定の「引き継ぎ」でコードを控えてもらう。

そのあとは、進行が保存されるたびに 4 秒待ってまとめて預ける
（`setSaveHook` → `schedulePush`）。一戦のあいだ何度も送らないため。

---

## 落とし穴

- **メール確認を切り忘れる**と、登録が最後まで通らない
- **RLS を有効にし忘れる**と、誰でも他人の進行を読める
- `service_role` の鍵を `.env` に書かない
- `SAVE_V` を上げると、預けてある進行も読めなくなる（`normalizeSave` が弾く）。
  `loadSave()` に読み替えを足せば、預けてあるものも同じ道で救われる
- パスワードを忘れると入れなくなる。メールを預かっていないので**再発行できない**。
  進行を失わないために、引き継ぎコードを控えるよう画面で案内している
- パスワードは**半角の見える字だけ**（`!`〜`~`）。全角を通すと、変換を入れたまま
  登録した人が次に半角で打ったときに入れなくなる。しかもサーバーは
  「違います」としか言わないので、本人には理由が分からない
- 最初に出る画面は、ブラウザ版でまだ入っていなければアカウントの画面。
  **登録するかログインするまで遊べない**（逃げ道は無い）。
  PC 版と、鍵を設定していないブラウザ版は今まで通りタイトルから始まる ──
  ここを取り違えると、PC 版が起動して何も出ない状態になる
- **新しく登録したアカウントは、必ず初期状態から始まる。**
  その端末に前の人の進行が残っていても引き継がない。
  登録の画面から設定へは行けないので、**その進行は控えを取れないまま消える**。
  そういう決めごとなので、控えを促す仕掛けを足さないこと
- 遊べるかどうかが Supabase の生死に懸かっている。落ちている日は
  ブラウザ版で遊べない（PC 版は影響を受けない）
