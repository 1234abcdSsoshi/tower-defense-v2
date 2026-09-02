# CLAUDE.md

時代戦線 序戦 ── Canvas2D の横画面タワーディフェンス。
TypeScript + Vite + Tauri。**itch.io の有料ダウンロード（PC 専用）だけ**へ配る。

網につながずに完全に動く。書体も絵も音も同梱で、起動しても外へは出ない。
ブラウザ版・モバイル対応・オンライン機能は持たない。

リモート: https://github.com/1234abcdSsoshi/tower-defense-v2.git
パッケージ管理: **pnpm**（npm は使わない）

---

## 毎回やること

**作業を終えたら、必ずこの順で締めくくる。** 途中で赤が出たら直してからやり直す。

```bash
pnpm check                       # 1. 型・lint・マスタ検査・テスト
git add -A                          # 2. 変更をすべて載せる
git commit -m "<日本語で、何をしたか>"  # 3. 記録する
git push                            # 4. GitHub へ送る
```

一行でまとめるなら:

```bash
pnpm check && git add -A && git commit -m "メッセージ" && git push
```

### この順番を崩さない理由

- `pnpm check` を通していないものを push すると、CI が赤いまま main が残る。
  main は常に遊べる状態でなければならない
- `git add -A` にしているのは、新しく作ったファイルの入れ忘れを防ぐため。
  `.gitignore` が `node_modules/` `dist/` `src-tauri/target/` を弾いている
- push まで含めて 1 回の作業。commit だけで止めると、次の作業者が
  古い main を見て同じところを直しはじめる

### commit メッセージの書きかた

一行目に**何をしたか**を日本語で。理由が要るなら空行のあと本文に。

```
進化の硬直中に石高が溜まらない不具合を直す

硬直の判定が evolving だけを見ていて、evoT が残っている
あいだの回復を止められていなかった。
```

### push が弾かれたら

誰かが先に push している。**強制 push はしない。**

```bash
git pull --rebase origin main
pnpm check        # 取り込んだ結果でもう一度通す
git push
```

---

## 触る前に

- 構成と層の向き： [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 作業の進めかた： [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- ゲームの中身： [docs/GAME.md](docs/GAME.md)
- 配布手順： [docs/RELEASE.md](docs/RELEASE.md)
- アカウント（ブラウザ版だけ）： [docs/ACCOUNT.md](docs/ACCOUNT.md)

## 絶対に壊してはいけないもの

**一戦の結果は、シードと入力ログだけで完全に再現できる。**
ゴースト・リプレイ・将来のチート検証がこれに乗っている。

- 盤面に効く乱数は `G.rng()` だけ。演出の揺らぎは `vrng()`
- シムは実時間を見ない（`DT = 1/60` の固定タイムステップ）
- シムは DOM を知らない。`src/sim/` から `src/ui/` を import しない
  （決着の通知は `sim/outcome.ts` の `finishGame()`）

`tests/determinism.test.ts` が見張っている。ここが落ちたら手を止めること。

## よくある作業

| やりたいこと         | 触る場所                                                       |
| -------------------- | -------------------------------------------------------------- |
| バランス調整         | `src/data/master.json` **だけ**。コードは触らない              |
| 戦闘の挙動           | `src/sim/`                                                     |
| 見た目（手続き描画） | `src/render/`                                                  |
| 兵の絵をPNGにする    | `src/assets/units/` に置き、`src/render/unitSprites.ts` に登録 |
| 画面・HUD            | `src/ui/`                                                      |
| 音                   | `src/audio/index.ts`                                           |
| 配布・インストーラ   | `src-tauri/`、手順は docs/RELEASE.md                           |

### 兵の絵について

「歩む者」だけが時代ごとの PNG スプライトで、残りは手続き描画のまま。
`unitSprites.ts` は **読み込み前と失敗時に手続き描画へ落ちる**ようにしてある。
この落ちしろを外さないこと ── 画像のデコードが間に合わないだけで
盤面が空になると、原因が最も追いにくい種類の不具合になる。

実行用の PNG は `src/assets/units/`（各 60〜80KB）。
`asset/` に置いてある原寸（1MB 超）は素材で、ゲームは読み込まない。

`master.json` を編集したら `pnpm validate:master`（`pnpm check` に含まれる）。

## pnpm について

**npm は使わない。** `package-lock.json` ができてロックが二重になり、
どちらが正か分からなくなる。版は `package.json` の `packageManager` が正。

依存を足すときは `pnpm add -D <名前>`。`npx` の代わりは `pnpm dlx`。

### インストール時スクリプトが止められたら

pnpm は依存の postinstall を既定で走らせない。
`Ignored build scripts: ○○` と出たら、それが何をするスクリプトか確かめてから
`pnpm-workspace.yaml` の `allowBuilds` に足す。他人のコードに実行権を渡す場所なので、
名前だけ見て機械的に許可しないこと。

```yaml
allowBuilds:
  esbuild: true
```

許可しないまま放置すると `pnpm install` が終了コード 1 を返し、
`pnpm run` そのものが動かなくなる。

## 動かして確かめる

型とテストが通っても、**絵が出ているかは別の話**。
見た目に関わる変更をしたら開発サーバで一戦して目視すること。

```bash
pnpm dev        # http://127.0.0.1:5173
```

## 落とし穴

- `SAVE_V` を上げると全ユーザーの進行が消える。`loadSave()` に読み替えを足すこと
- `REC_V` を上げると保存済みのゴーストが捨てられる
- `mulberry32` の実装を変えると過去のゴーストが全部無効になる
- `newGame()` に項目を足し忘れると、その値だけ `undefined` のまま一戦が進む
- 時代を1つ増やすときは、時代数ぶんの配列**すべて**を伸ばす（検査が見張っている）
- 版数を上げるときは `package.json` / `src-tauri/tauri.conf.json` /
  `src-tauri/Cargo.toml` / `master.json` の 4 か所（検査が見張っている）
- **画面に新しい字を出したら `pnpm fonts`。** 同梱書体は使う字だけに
  絞ってあるので、焼き直さないとその字が豆腐（□）になる
- **PC 版に外部への通信を足さない。買った人は網につながずに遊ぶ。**
  ブラウザ版だけのアカウント機能は `IS_WEB`（コンパイル時の定数）で
  囲ってあり、PC 版のバンドルからは丸ごと落ちる。新しく通信を足すときも
  同じ囲いの中に入れること（[docs/ACCOUNT.md](docs/ACCOUNT.md)）
- `asset/`（原寸の素材）は Git で追跡していない。手元にしか無いので、
  消す前に控えを取ること。ゲームが読むのは `src/assets/` のほう
