# CLAUDE.md

時代戦線 序戦 ── Canvas2D の横画面タワーディフェンス。
TypeScript + Vite。Web（itch.io）と Tauri（Steam）の二方向へ配る。

## 触る前に

- 構成と層の向き： [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 作業の進めかた： [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- ゲームの中身： [docs/GAME.md](docs/GAME.md)

## 絶対に壊してはいけないもの

**一戦の結果は、シードと入力ログだけで完全に再現できる。**
ゴースト・リプレイ・将来のチート検証がこれに乗っている。

- 盤面に効く乱数は `G.rng()` だけ。演出の揺らぎは `vrng()`
- シムは実時間を見ない（`DT = 1/60` の固定タイムステップ）
- シムは DOM を知らない。`src/sim/` から `src/ui/` を import しない
  （決着の通知は `sim/outcome.ts` の `finishGame()`）

`tests/determinism.test.ts` が見張っている。ここが落ちたら手を止めること。

## 変更後は必ず

```bash
npm run check      # 型・lint・マスタ検査・テスト
```

## よくある作業

| やりたいこと | 触る場所                                          |
| ------------ | ------------------------------------------------- |
| バランス調整 | `src/data/master.json` **だけ**。コードは触らない |
| 戦闘の挙動   | `src/sim/`                                        |
| 見た目       | `src/render/`                                     |
| 画面・HUD    | `src/ui/`                                         |
| 音           | `src/audio/index.ts`                              |

`master.json` を編集したら `npm run validate:master`。

## 落とし穴

- `SAVE_V` を上げると全ユーザーの進行が消える。`loadSave()` に読み替えを足すこと
- `REC_V` を上げると保存済みのゴーストが捨てられる
- `mulberry32` の実装を変えると過去のゴーストが全部無効になる
- `newGame()` に項目を足し忘れると、その値だけ `undefined` のまま一戦が進む
- 時代を1つ増やすときは、時代数ぶんの配列**すべて**を伸ばす（検査が見張っている）
