# 配布

**itch.io で買った人が、自分の PC へダウンロードして遊ぶ。**
それ以外の配り方はしません。ブラウザ版もモバイル対応もありません。

網につながずに完全に動きます。書体も絵も音もすべて同梱で、
起動しても外へは一切出ません（[tests/package.test.ts](../tests/package.test.ts) が見張っています）。

---

## Smart App Control が有効な PC では作れない

Windows 11 の **Smart App Control** が有効だと、未署名の実行ファイルが
一律で止められます。Rust のビルドスクリプトも、出来上がるゲーム本体も
未署名なので、`cargo build` が `os error 4551` で落ちます。

確かめかた:

```powershell
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' `
  -Name VerifiedAndReputablePolicyState).VerifiedAndReputablePolicyState
# 1 = 有効 / 0 = 無効 / 2 = 評価モード
```

**有効だった場合、GitHub Actions で作るのが現実的です。**

```bash
git tag v2.5.0
git push origin v2.5.0
```

`.github/workflows/release.yml` が Windows のランナーでインストーラを作り、
Release に添えます。タグを押さずに試したいときは、Actions の画面から
「リリース」を手で実行してください（成果物は windows-installer）。

> Smart App Control を切る道もありますが、**一度切ると Windows を
> 入れ直すまで二度と有効にできません。** 開発機の保護を恒久的に下げる
> 判断になるので、まず Actions を試してください。

---

## 一息で済ませる

手で順に追わなくても、これで用意からインストールまで通ります。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

以下は、その script が何をしているかの内訳です。

## 一度だけの用意

実行ファイルを作るには Rust と、Windows のリンカ（MSVC）が要ります。

```powershell
# 1. Rust
winget install --id Rustlang.Rustup --source winget

# 2. MSVC ビルドツール ── 管理者の PowerShell で実行すること
winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget `
  --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

> **2 は管理者権限（UAC の承認）が要ります。**
> 通常の窓で実行すると、途中で終了コード 1602（中止）になって何も入りません。
> 入っていないと `cargo build` が「link: extra operand」で落ちます
> ── MSVC の link.exe が無く、Git Bash の同名コマンドが拾われるためです。

WebView2 は Windows 11 なら最初から入っています。

導入できたか確かめる:

```bash
rustc --version
where link.exe        # MSVC の link.exe が出れば OK
```

---

## 作る

```bash
pnpm desktop:build
```

`pnpm check`（型・lint・マスタ検査・テスト）を通してから、
インストーラを作ります。出来上がりはここ:

```
src-tauri/target/release/bundle/nsis/時代戦線 序戦_2.5.0_x64-setup.exe
```

管理者権限を求めない形（`currentUser`）にしてあります。
買った人が自分の領域へ入れられれば十分で、UAC を出す理由がないためです。

## 入れたあとに何が起きるか

インストーラは次を作ります（Tauri の NSIS が既定で行うので、設定は要りません）。

| 場所             | 中身                         |
| ---------------- | ---------------------------- |
| デスクトップ     | **時代戦線 序戦** のアイコン |
| スタートメニュー | 同上                         |
| アプリと機能     | アンインストール用の登録     |

- 実行ファイルは `JidaiSensen.exe`。**画面に出る名前は「時代戦線 序戦」**です。
  ファイル名だけ ASCII にしてあるのは、配布先や古い道具で日本語名が崩れることがあるため
- アイコンは `src-tauri/icons/icon.ico`。差し替えるときは
  `pnpm tauri icon <元画像>` で一式を作り直します
- デスクトップのアイコンは**新規インストールのときだけ**作られます。
  更新インストールでは、利用者が消したものを勝手に戻さないため作りません

## 買った人の側で止まることがある（重要）

**Smart App Control が有効な PC では、このインストーラは実行できません。**
「アプリケーション制御ポリシーによってブロックされました」で止まります。
署名の無い実行ファイルが一律で弾かれるためで、作り方の問題ではありません。

- Windows 11 をきれいに入れ直した PC では既定で有効です
- 一度切ると Windows を入れ直すまで戻せないため、切ってもらうのは酷な頼み

**有料で配るなら、コード署名証明書を用意するのが本筋です。**
OV で年 2〜4 万円ほど。署名しても最初は評価が溜まるまで警告が出ますが、
Smart App Control に一律で弾かれることは無くなります。

当面は、商品ページに「Smart App Control が有効だと起動できない場合があります」
と添えておくと、返金対応の手間が減ります。

## itch.io へ上げる

1. プロジェクトを **「Downloadable」** で作る（HTML ではない）
2. 価格を設定する
3. 出来上がった `-setup.exe` をアップロードし、**Windows** の印を付ける
4. 「This file will be downloaded」を選ぶ

[itch.io の Butler](https://itch.io/docs/butler/) を使うと、更新のたびに
差分だけ送れます。

```bash
butler push "src-tauri/target/release/bundle/nsis/時代戦線 序戦_2.5.0_x64-setup.exe" \
  ユーザー名/jidai-sensen:windows --userversion 2.5.0
```

## 版数を上げる

4 か所そろえてください。ずれていると
[tests/package.test.ts](../tests/package.test.ts) が落ちます。

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src/data/master.json`（ゲーム内の設定画面に出る）

## 配る前に

```bash
pnpm check
pnpm desktop:build
```

作ったインストーラを**実際に入れて**、

- 窓が開いて一戦できるか
- 字が明朝・ゴシックで出ているか（代替書体に落ちていないか）
- タイトルから拠点・各選択画面・結果ではメニュー曲、戦闘では現在の時代専用曲が再生され、進化時に滑らかに切り替わるか
- BGM OFF／全消音から ON に戻したとき、停止位置の続きから再開するか
- 60fps が出ているか（設定 → FPS 表示）
- **網を切った状態でも同じように動くか**

## 書体について

同梱している書体は、ゲームが使う 1,200 字ほどに絞ってあります
（全部入れると 35MB、絞ると 1MB 未満）。

**画面に新しい字を出したら、焼き直しが要ります。** さもないとその字が豆腐（□）になります。

```bash
pnpm fonts                      # 使う字を集めて、書体を焼き直す
```

原本の TTF は Google Fonts から取ります（SIL Open Font License 1.1、
同梱と再配布が認められています。`src/assets/fonts/OFL.txt` を同梱すること）。
