# 時代戦線 序戦

原始から現代まで、六つの時代を駆け上がる横画面タワーディフェンス。

石高で兵を出し、文を溜めて進化する。**進化のあいだは無防備** ── いつ踏み切るかが勝負を決める。

- 通常兵70フォーム・時代の主6体・召喚妖6体に加え、背景6枚・拠点6種・前景6種・技12種・飛び道具7種・戦闘エフェクト6種・天災6種・資源UI5種を軽量PNG化。読込失敗時は Canvas2D 描画へ自動復帰
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

## 配布先

| 配布先  | 成果物                     | 作りかた             |
| ------- | -------------------------- | -------------------- |
| itch.io | `dist/web`（そのまま zip） | `pnpm build`         |
| Steam   | Tauri の実行ファイル       | `pnpm desktop:build` |

`pnpm desktop:build` には Rust が要ります（初回だけ）。

```bash
# Windows: Rust と、Tauri が使う WebView2 / ビルドツール
winget install Rustlang.Rustup
rustup default stable
```

WebView2 は Windows 11 なら標準で入っています。macOS は Xcode Command Line Tools が要ります。

## 中身の地図

```
asset/          生成した原画（キャラクター・背景・拠点・前景・技・飛び道具・エフェクト・天災・UIのPNG）
src/
├─ core/       乱数・定数。どこからでも参照される葉
├─ data/       マスタデータ（master.json）とその型・展開
├─ sim/        戦闘シミュレーション。DOM を一切知らない
├─ render/     PNGスプライトと Canvas2D の描画
├─ audio/      Web Audio の合成
├─ save/       進行データ・リプレイ・ゴースト
├─ ui/         HUD と各画面
├─ platform/   配布先の違い（Web / デスクトップ）
├─ app/        起動・ループ・外部マスタ差し替え
└─ main.ts     起動の順番だけを持つ
scripts/prepare-unit-assets.ps1    キャラクター原画から軽量実行版を再生成
scripts/prepare-visual-assets.ps1  背景・拠点・前景・技・飛び道具・エフェクト・天災・UI原画から軽量実行版を再生成
```

詳しくは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

アカウント（進行データを端末をまたいで持ち歩く）は [docs/AUTH.md](docs/AUTH.md)。
設定しなければ眠るので、まず遊ぶだけなら何も要りません。
手を入れる前に [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) を読んでください。

## 遊びかた（PC）

| 操作                          | すること             |
| ----------------------------- | -------------------- |
| `1` 〜 `9` / カードをクリック | 兵を出す             |
| `Space` / 進化ボタン          | 進化する（硬直あり） |
| `Q` `W`                       | 技を使う             |
| カードをドラッグ              | 出撃順を入れ替える   |

ゲームの中身の詳細は [docs/GAME.md](docs/GAME.md)。
