# 時代戦線 序戦

原始から現代まで、六つの時代を駆け上がる横画面タワーディフェンス。

石高で兵を出し、文を溜めて進化する。**進化のあいだは無防備** ── いつ踏み切るかが勝負を決める。

- **PC のダウンロード版専用。** 網につながずに完全に動く（書体・絵・音はすべて同梱）
- 通常兵70フォーム・時代の主6体・召喚妖6体は軽量PNGスプライト。読込失敗時は Canvas2D 描画へ自動復帰
- 音声ファイル **0 バイト**。BGM も効果音も Web Audio でその場合成
- **決定論固定タイムステップ**。シードと入力ログだけで一戦を完全に再現できる

---

## 動かす

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173
```

Node.js 20.19 以上と pnpm が要ります。pnpm が無ければ Node に同梱の corepack から：

```bash
corepack enable pnpm
```

`package.json` の `packageManager` に版を書いてあるので、これだけで全員の版が揃います。
**npm は使わないでください** ── `package-lock.json` ができてロックが二重になります。

## よく使うコマンド

| コマンド                        | すること                                              |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                      | 開発サーバ。保存すると即反映される                    |
| `pnpm check`                    | 型・lint・マスタ検査・テストを全部。**push 前にこれ** |
| `pnpm build`                    | Web（itch.io）向けに `dist/web` を作る                |
| `pnpm build:desktop`            | Steam 向けに `dist/desktop` を作る                    |
| `pnpm desktop:dev`              | Tauri の窓で起動（Rust が要る、下記）                 |
| `pnpm desktop:build`            | Steam へ上げる実行ファイルを作る                      |
| `pnpm test`                     | テストだけ                                            |
| `pnpm validate:master`          | マスタデータの整合を確かめる                          |
| `pnpm lint:fix` / `pnpm format` | 直せるものを直す                                      |

## 配布

**itch.io で買った人が、自分の PC へダウンロードして遊ぶ。**
ブラウザ版もモバイル対応もありません。

```bash
pnpm desktop:build     # インストーラができる
```

初回だけ Rust と MSVC ビルドツールの導入が要ります。
**MSVC のほうは管理者権限が要る**ので、手順は [docs/RELEASE.md](docs/RELEASE.md) を見てください。

## 中身の地図

```
asset/          生成した原画（キャラクター・背景・拠点・前景・技・飛び道具・エフェクト・天災・UIのPNG）
src/
├─ core/       乱数・定数。どこからでも参照される葉
├─ data/       マスタデータ（master.json）とその型・展開
├─ sim/        戦闘シミュレーション。DOM を一切知らない
├─ render/     PNGスプライトと Canvas2D の描画
├─ assets/     同梱する絵と書体
├─ audio/      Web Audio の合成
├─ save/       進行データ・リプレイ・ゴースト
├─ ui/         HUD と各画面
├─ app/        起動・ループ・外部マスタ差し替え
└─ main.ts     起動の順番だけを持つ
scripts/prepare-unit-assets.ps1    キャラクター原画から軽量実行版を再生成
scripts/prepare-visual-assets.ps1  背景・拠点・前景・技・飛び道具・エフェクト・天災・UI原画から軽量実行版を再生成
```

詳しくは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

手を入れる前に [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) を読んでください。

## 遊びかた（PC）

| 操作                          | すること             |
| ----------------------------- | -------------------- |
| `1` 〜 `9` / カードをクリック | 兵を出す             |
| `Space` / 進化ボタン          | 進化する（硬直あり） |
| `Q` `W`                       | 技を使う             |
| カードをドラッグ              | 出撃順を入れ替える   |

ゲームの中身の詳細は [docs/GAME.md](docs/GAME.md)。
