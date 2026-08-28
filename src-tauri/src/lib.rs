//! 時代戦線 序戦 ── デスクトップ（Steam）版の殻。
//!
//! ゲーム本体は TypeScript 側にあり、Rust 側は WebView を立ち上げるだけ。
//! ここにゲームロジックを足さないこと。Web 版と挙動が分かれた瞬間、
//! 「Steam 版だけで落ちる」という一番追いにくい不具合が生まれる。
//!
//! Steamworks（実績・クラウドセーブ）を入れるときは、
//! この層に `#[tauri::command]` を足して TS 側から呼ぶ形にする。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("時代戦線の起動に失敗しました");
}
