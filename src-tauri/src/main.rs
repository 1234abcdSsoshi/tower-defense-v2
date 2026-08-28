// Windows のリリースビルドで、裏に黒いコンソールを出さない
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    jidai_sensen_lib::run()
}
