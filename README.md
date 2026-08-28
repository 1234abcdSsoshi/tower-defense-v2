# 時代戦線 序戦

原始から現代まで、六つの時代を駆け上がる横画面タワーディフェンス。

石高で兵を出し、文を溜めて進化する。**進化のあいだは無防備** ── いつ踏み切るかが勝負を決める。

- 画像アセット **0 枚**。兵も城も草木も、すべて Canvas2D の手続き描画
- 音声ファイル **0 バイト**。BGM も効果音も Web Audio でその場合成
- **決定論固定タイムステップ**。シードと入力ログだけで一戦を完全に再現できる

---

## 動かす

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

Node.js 20.19 以上が要ります。

## よく使うコマンド

| コマンド                              | すること                                              |
| ------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                         | 開発サーバ。保存すると即反映される                    |
| `npm run check`                       | 型・lint・マスタ検査・テストを全部。**push 前にこれ** |
| `npm run build`                       | Web（itch.io）向けに `dist/web` を作る                |
| `npm run build:desktop`               | Steam 向けに `dist/desktop` を作る                    |
| `npm run desktop:dev`                 | Tauri の窓で起動（Rust が要る、下記）                 |
| `npm run desktop:build`               | Steam へ上げる実行ファイルを作る                      |
| `npm test`                            | テストだけ                                            |
| `npm run validate:master`             | マスタデータの整合を確かめる                          |
| `npm run lint:fix` / `npm run format` | 直せるものを直す                                      |

## 配布先

| 配布先  | 成果物                     | 作りかた                |
| ------- | -------------------------- | ----------------------- |
| itch.io | `dist/web`（そのまま zip） | `npm run build`         |
| Steam   | Tauri の実行ファイル       | `npm run desktop:build` |

`npm run desktop:build` には Rust が要ります（初回だけ）。

```bash
# Windows: Rust と、Tauri が使う WebView2 / ビルドツール
winget install Rustlang.Rustup
rustup default stable
```

WebView2 は Windows 11 なら標準で入っています。macOS は Xcode Command Line Tools が要ります。

## 中身の地図

```
src/
├─ core/       乱数・定数。どこからでも参照される葉
├─ data/       マスタデータ（master.json）とその型・展開
├─ sim/        戦闘シミュレーション。DOM を一切知らない
├─ render/     Canvas2D の手続き描画
├─ audio/      Web Audio の合成
├─ save/       進行データ・リプレイ・ゴースト
├─ ui/         HUD と各画面
├─ platform/   配布先の違い（Web / デスクトップ）
├─ app/        起動・ループ・外部マスタ差し替え
└─ main.ts     起動の順番だけを持つ
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
