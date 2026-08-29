# 配布

## itch.io（ブラウザ）

```bash
pnpm build          # dist/web ができる
```

`dist/web` の中身をそのまま zip にして、itch.io の「HTML」プロジェクトへ上げます。

- 「This file will be played in the browser」にチェック
- Viewport は横長（例 1280 × 720）、Fullscreen button を有効に
- `sw.js` により、二度目以降はオフラインでも遊べます

### 更新したのに古いまま、を防ぐ

`pnpm build` は毎回 Service Worker のキャッシュ世代を打ち直します
（`scripts/stamp-sw.mjs`）。手で `sw.js` を編集しないでください。

## Steam（デスクトップ）

初回だけ Rust が要ります。

```bash
winget install Rustlang.Rustup     # Windows
rustup default stable
```

```bash
pnpm desktop:build              # src-tauri/target/release/bundle/ に出る
```

Steam へ上げるのは、**インストーラではなく実行ファイルと同梱物**です。
`src-tauri/target/release/` の `時代戦線 序戦.exe` と、隣の同梱リソースを
depot に入れてください（NSIS インストーラは Steam では使いません）。

### Steam 側の設定

- 起動オプション：実行ファイルを直接指定
- Steam Input：キーボード（`1`〜`9` / `Space` / `Q` `W`）とマウス
- クラウドセーブ：現在の進行データは **ブラウザの localStorage** に入ります。
  Tauri の WebView も同じ仕組みを使うため、Steam Cloud に載せるには
  保存先をファイルへ移す作業が別途要ります（未着手）

### Steamworks（実績・クラウド）を足すとき

`src-tauri/src/lib.rs` に `#[tauri::command]` を足し、TS 側から呼ぶ形にします。
**ゲームロジックを Rust 側へ移さないでください。**
Web 版と挙動が分かれた瞬間、「Steam 版だけで落ちる」という
一番追いにくい不具合が生まれます。

## 版数

`package.json` の `version` が正です。上げたら合わせて：

- `src-tauri/tauri.conf.json` の `version`
- `src/data/master.json` の `version`（ゲーム内の設定画面に出る）

## 配布前の確認

```bash
pnpm check
pnpm build && pnpm preview    # dist/web を実際に開いて一戦
pnpm desktop:build               # 窓が開いて一戦できるか
```

- 進化の硬直中に敵が攻めてくる緊張が残っているか
- 音（BGM が時代ごとに変わるか、効果音が割れないか）
- 60fps が出ているか（設定 → FPS 表示）
