# 時代戦線 序戦

原始から現代まで、六つの時代を駆け上がる横画面タワーディフェンス。

石高で兵を出し、文を溜めて進化する。**進化のあいだは無防備** ── いつ踏み切るかが勝負を決める。

- **ブラウザでそのまま遊べる**（GitHub Pages）。**PC へ入れて遊ぶ版**もある。中身は同じコード
- **網につながずに完全に動く。** 書体・絵・音はすべて同梱で、起動しても外へは出ない
- 立ち絵93枚（通常兵70フォーム・時代の主6体・召喚妖6体、ほかに登録待ちが11体）は軽量PNG。読込失敗時は Canvas2D 描画へ自動復帰
- LMMSと実録SoundFontで制作した、メニュー＋6時代専用の和風アドベンチャーBGMを同梱。進化時は編成とテンポが変わり、効果音は軽量なWeb Audio合成
- **決定論固定タイムステップ**。シードと入力ログだけで一戦を完全に再現できる

---

## 遊ぶ

**ブラウザで、入れずにそのまま遊べます。**

<https://1234abcdssoshi.github.io/tower-defense-v2/>

一度開けば二回目からは網が無くても動きます（Service Worker が絵と書体を持つため）。
携帯でも遊べます（縦に持つと横画面に見せます）。

手元に入れて遊ぶ版（Windows のインストーラ）もあります → [Releases](https://github.com/1234abcdSsoshi/tower-defense-v2/releases)

> インストーラは署名していないため、Smart App Control が有効な PC では
> 実行できません。その場合はブラウザ版をお使いください。

---

## clone して遊ぶまで

Windows で、これだけです。

```powershell
git clone https://github.com/1234abcdSsoshi/tower-defense-v2.git
cd tower-defense-v2
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

足りない道具（pnpm / Rust / MSVC ビルドツール）を調べて入れ、インストーラを作り、
それを起動します。終わると**デスクトップとスタートメニューに
「時代戦線 序戦」のアイコン**が出るので、そこから遊べます。

> **MSVC ビルドツールの導入だけ管理者権限が要ります。**
> 「ユーザー アカウント制御」が出たら「はい」を押してください。
> 承認できない場合は、管理者の PowerShell で次を実行してから script をやり直します。
>
> ```powershell
> winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget `
>   --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
> ```

インストーラを作るだけで、入れるのは自分でやりたいときは `-BuildOnly` を付けます。

---

## 開発するとき

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
| `pnpm build`                    | ブラウザ版の `dist/web` を作る（check を含む）        |
| `pnpm build:desktop`            | PC 版の中身 `dist/desktop` を作る                     |
| `pnpm desktop:dev`              | Tauri の窓で起動（Rust が要る、下記）                 |
| `pnpm desktop:build`            | PC 版のインストーラを作る（check を含む）             |
| `pnpm test`                     | テストだけ                                            |
| `pnpm validate:master`          | マスタデータの整合を確かめる                          |
| `pnpm lint:fix` / `pnpm format` | 直せるものを直す                                      |

## 配布

配り先は二つ。同じコードから作り、分けているのは `IS_WEB`（コンパイル時の定数）だけです。

| 版         | 作りかた                  | 配りかた                                             |
| ---------- | ------------------------- | ---------------------------------------------------- |
| ブラウザ版 | `pnpm build` → `dist/web` | `main` へ push すると GitHub Actions が Pages へ公開 |
| PC 版      | `pnpm desktop:build`      | `v*` の tag を打つと Actions がインストーラを作る    |

PC 版を手元で作るには、初回だけ Rust と MSVC ビルドツールの導入が要ります。
**MSVC のほうは管理者権限が要る**ので、手順は [docs/RELEASE.md](docs/RELEASE.md) を見てください。
Smart App Control が有効な PC では手元で作れないので、その場合は Actions に任せます。

**PC 版に外部への通信を足さないでください。** 買った人は網につながずに遊びます。
進行を預かるアカウント機能はブラウザ版だけのもので、`IS_WEB` で囲ってあり
PC 版のバンドルからは丸ごと落ちます（[docs/ACCOUNT.md](docs/ACCOUNT.md)）。

## 中身の地図

```
asset/          生成した原画。**Git で追跡していない**（手元にしか無い）
src/
├─ core/       乱数・定数。どこからでも参照される葉
├─ data/       マスタデータ（master.json）とその型・展開
├─ sim/        戦闘シミュレーション。DOM を一切知らない
├─ render/     PNGスプライトと Canvas2D の描画
├─ assets/     同梱する絵・書体・BGM
├─ audio/      BGM再生と Web Audio 効果音
├─ save/       進行データ・リプレイ・ゴースト
├─ ui/         HUD と各画面
├─ app/        起動・ループ・外部マスタ差し替え
└─ main.ts     起動の順番だけを持つ
scripts/prepare-unit-assets.ps1    キャラクター原画から軽量実行版を再生成
scripts/prepare-visual-assets.ps1  背景・拠点・前景・技・飛び道具・エフェクト・天災・UI原画から軽量実行版を再生成
```

詳しくは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

手を入れる前に **[AGENTS.md](AGENTS.md)** を読んでください
（人・Claude・Codex で共通の決まり。毎回の締めくくりかたもここにあります）。
設計の考えかたは [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)、
音の作りは [docs/AUDIO.md](docs/AUDIO.md)、
素材の発注は [docs/ASSETS.md](docs/ASSETS.md)、
アカウント（ブラウザ版だけ）は [docs/ACCOUNT.md](docs/ACCOUNT.md)。

## 遊びかた

| 操作                          | すること             |
| ----------------------------- | -------------------- |
| `1` 〜 `9` / カードをクリック | 兵を出す             |
| `Space` / 進化ボタン          | 進化する（硬直あり） |
| `Q` `W`                       | 技を使う             |
| カードをドラッグ              | 出撃順を入れ替える   |

携帯では画面を触って同じことをします（縦に持つと横画面に見せます）。

ゲームの中身の詳細は [docs/GAME.md](docs/GAME.md)。
