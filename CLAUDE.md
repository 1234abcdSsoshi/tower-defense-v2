# CLAUDE.md

時代戦線 序戦 ── Canvas2D の横画面タワーディフェンス。
TypeScript + Vite。Web（itch.io）と Tauri（Steam）の二方向へ配る。

リモート: https://github.com/1234abcdSsoshi/tower-defense-v2.git

---

## 毎回やること

**作業を終えたら、必ずこの順で締めくくる。** 途中で赤が出たら直してからやり直す。

```bash
npm run check                       # 1. 型・lint・マスタ検査・テスト
git add -A                          # 2. 変更をすべて載せる
git commit -m "<日本語で、何をしたか>"  # 3. 記録する
git push                            # 4. GitHub へ送る
```

一行でまとめるなら:

```bash
npm run check && git add -A && git commit -m "メッセージ" && git push
```

### この順番を崩さない理由

- `npm run check` を通していないものを push すると、CI が赤いまま main が残る。
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
npm run check        # 取り込んだ結果でもう一度通す
git push
```

---

## 触る前に

- 構成と層の向き： [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 作業の進めかた： [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- ゲームの中身： [docs/GAME.md](docs/GAME.md)
- 配布手順： [docs/RELEASE.md](docs/RELEASE.md)

## 絶対に壊してはいけないもの

**一戦の結果は、シードと入力ログだけで完全に再現できる。**
ゴースト・リプレイ・将来のチート検証がこれに乗っている。

- 盤面に効く乱数は `G.rng()` だけ。演出の揺らぎは `vrng()`
- シムは実時間を見ない（`DT = 1/60` の固定タイムステップ）
- シムは DOM を知らない。`src/sim/` から `src/ui/` を import しない
  （決着の通知は `sim/outcome.ts` の `finishGame()`）

`tests/determinism.test.ts` が見張っている。ここが落ちたら手を止めること。

## よくある作業

| やりたいこと | 触る場所 |
|---|---|
| バランス調整 | `src/data/master.json` **だけ**。コードは触らない |
| 戦闘の挙動 | `src/sim/` |
| 見た目（手続き描画） | `src/render/` |
| 兵の絵をPNGにする | `src/assets/units/` に置き、`src/render/unitSprites.ts` に登録 |
| 画面・HUD | `src/ui/` |
| 音 | `src/audio/index.ts` |

### 兵の絵について

「歩む者」だけが時代ごとの PNG スプライトで、残りは手続き描画のまま。
`unitSprites.ts` は **読み込み前と失敗時に手続き描画へ落ちる**ようにしてある。
この落ちしろを外さないこと ── 画像のデコードが間に合わないだけで
盤面が空になると、原因が最も追いにくい種類の不具合になる。

実行用の PNG は `src/assets/units/`（各 60〜80KB）。
`asset/` に置いてある原寸（1MB 超）は素材で、ゲームは読み込まない。

`master.json` を編集したら `npm run validate:master`（`npm run check` に含まれる）。

## 動かして確かめる

型とテストが通っても、**絵が出ているかは別の話**。
見た目に関わる変更をしたら開発サーバで一戦して目視すること。

```bash
npm run dev        # http://127.0.0.1:5173
```

## 落とし穴

- `SAVE_V` を上げると全ユーザーの進行が消える。`loadSave()` に読み替えを足すこと
- `REC_V` を上げると保存済みのゴーストが捨てられる
- `mulberry32` の実装を変えると過去のゴーストが全部無効になる
- `newGame()` に項目を足し忘れると、その値だけ `undefined` のまま一戦が進む
- 時代を1つ増やすときは、時代数ぶんの配列**すべて**を伸ばす（検査が見張っている）
- 版数を上げるときは `package.json` / `src-tauri/tauri.conf.json` / `master.json` の 3 か所
