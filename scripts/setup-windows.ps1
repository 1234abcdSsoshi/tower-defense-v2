# 時代戦線 序戦 ── clone から「デスクトップのアイコンで遊べる」までを一息で。
#
#   git clone https://github.com/1234abcdSsoshi/tower-defense-v2.git
#   cd tower-defense-v2
#   powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
#
# やること:
#   1. 足りない道具を調べ、無ければ入れる（pnpm / Rust / MSVC）
#   2. 依存を取り、インストーラを作る
#   3. インストーラを起動する（デスクトップとスタートメニューにアイコンが出る）
#
# MSVC の導入だけは管理者権限が要ります。承認を求められたら「はい」を押してください。

[CmdletBinding()]
param(
  # インストーラを作るところで止める（自分では入れない）
  [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   $t" -ForegroundColor Green }
function Warn($t) { Write-Host "   $t" -ForegroundColor Yellow }

Step '道具を調べる'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js がありません。https://nodejs.org から 20.19 以上を入れてください'
}
Ok "Node $(node -v)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Warn 'pnpm を有効にします'
  corepack enable pnpm
}
Ok "pnpm $(pnpm --version)"

# --- Rust。ユーザー領域に入るので昇格は要らない ---
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path $cargoBin) { $env:PATH = $env:PATH + ';' + $cargoBin }
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Warn 'Rust を入れます（数分かかります）'
  winget install --id Rustlang.Rustup --source winget --accept-package-agreements --accept-source-agreements --silent
  $env:PATH = $env:PATH + ';' + $cargoBin
}
Ok "Rust $((rustc --version))"

# --- MSVC のリンカ。これが無いと cargo が最後の最後で落ちる ---
# 入っていないと 'link: extra operand' で失敗する。MSVC の link.exe が
# 見つからず、Git Bash の同名コマンドが拾われるため。
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$msvc = $null
if (Test-Path $vswhere) {
  $msvc = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
}

if (-not $msvc) {
  # ここには二通りの入りかたがある。
  #   A. Build Tools がまるごと無い            -> winget で入れる
  #   B. Build Tools はあるが C++ が入っていない -> vs_installer で足す
  # B のとき winget は「導入済み」と見て何もしない（実測で
  # 0x8A15002B を返して終わる）ため、必ず modify を使うこと。
  $installed = $null
  if (Test-Path $vswhere) {
    $installed = & $vswhere -products * -all -property installationPath | Select-Object -First 1
  }

  $tmp = Join-Path $env:TEMP 'jidai-setup-msvc.cmd'
  if ($installed) {
    Warn 'Build Tools はありますが C++ が入っていません。追加します（管理者の承認が要ります）'
    $vsInstaller = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vs_installer.exe'
    $body = @(
      '@echo off',
      ('"' + $vsInstaller + '" modify --installPath "' + $installed + '"' +
       ' --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart')
    )
  }
  else {
    Warn 'MSVC ビルドツールを入れます（管理者の承認が要ります）'
    # --override の中身は空白を含む。Start-Process へ配列で渡すと途中で
    # 切れて winget が 0x8A150002（引数不正）を返すので、.cmd に書いて渡す
    $body = @(
      '@echo off',
      'winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget' +
      ' --accept-package-agreements --accept-source-agreements --silent' +
      ' --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
    )
  }

  Set-Content -Path $tmp -Value $body -Encoding ASCII
  $proc = Start-Process cmd -Verb RunAs -Wait -PassThru -ArgumentList '/c', $tmp
  Remove-Item $tmp -ErrorAction SilentlyContinue

  # vs_installer は UI のプロセスへ仕事を渡して、自分はすぐ戻る。
  # --wait も --quiet も当てにならない（実測で終了コード 87 が返り、
  # ログ上も quiet:False だった）。だから終了コードではなく、
  # 「VC ツールが現れたか」を見て待つ。
  Write-Host '   導入の完了を待っています（最大 30 分）' -ForegroundColor Gray
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $vswhere) {
      $msvc = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    }
    if ($msvc) { break }
    $busy = Get-Process -Name 'vs_installer', 'setup' -ErrorAction SilentlyContinue
    if (-not $busy -and $i -gt 2) { break }
    Start-Sleep -Seconds 30
  }
  if (-not $msvc) {
    Write-Host ''
    Write-Host "MSVC の C++ ツールを用意できませんでした（終了コード $($proc.ExitCode)）。" -ForegroundColor Red
    Write-Host '管理者の PowerShell で次を実行してから、この script をやり直してください:' -ForegroundColor Yellow
    Write-Host ''
    if ($installed) {
      Write-Host '  # Build Tools はあるので、C++ を足すだけ' -ForegroundColor Gray
      Write-Host ('  & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe" modify ' +
                  '--installPath "' + $installed + '" --add Microsoft.VisualStudio.Workload.VCTools ' +
                  '--includeRecommended --quiet --wait --norestart') -ForegroundColor White
    }
    else {
      Write-Host '  winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"' -ForegroundColor White
    }
    Write-Host ''
    throw 'MSVC の C++ ツールが要ります'
  }
}
Ok "MSVC ビルドツール $msvc"

Step '依存を取る'
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'pnpm install に失敗しました' }

# --- Smart App Control。有効だと未署名の実行ファイルが一律で止まる ---
# Rust のビルドスクリプトも、出来上がるゲーム本体も未署名なので、
# 有効なままではこの先へ進めない（os error 4551 で落ちる）。
$sac = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' `
  -Name VerifiedAndReputablePolicyState -ErrorAction SilentlyContinue).VerifiedAndReputablePolicyState
if ($sac -eq 1) {
  Write-Host ''
  Write-Host 'Smart App Control が有効です。この PC では未署名の実行ファイルを作れません。' -ForegroundColor Red
  Write-Host '（Rust のビルドスクリプトが os error 4551 で止まります）' -ForegroundColor Gray
  Write-Host ''
  Write-Host '道は二つあります:' -ForegroundColor Yellow
  Write-Host '  1. GitHub Actions で作る（おすすめ）' -ForegroundColor White
  Write-Host '     push すると Windows のインストーラが作られます。' -ForegroundColor Gray
  Write-Host '     Actions の実行結果から windows-installer を落としてください。' -ForegroundColor Gray
  Write-Host ''
  Write-Host '  2. Smart App Control を切る' -ForegroundColor White
  Write-Host '     設定 > プライバシーとセキュリティ > Windows セキュリティ >' -ForegroundColor Gray
  Write-Host '     アプリとブラウザーの制御 > スマート アプリ コントロール' -ForegroundColor Gray
  Write-Host '     ※ 一度切ると、Windows を入れ直すまで二度と有効にできません。' -ForegroundColor Red
  Write-Host ''
  throw 'Smart App Control が有効なため、ここでは作れません'
}

Step 'インストーラを作る（初回は 10〜20 分かかります）'
pnpm tauri build
if ($LASTEXITCODE -ne 0) { throw 'ビルドに失敗しました' }

$setup = Get-ChildItem 'src-tauri\target\release\bundle\nsis\*.exe' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $setup) { throw 'インストーラが見つかりません' }
Ok "できました: $($setup.FullName)"

if ($BuildOnly) {
  Write-Host "`n-BuildOnly のため、ここで止めます。上のファイルを実行すると入ります。" -ForegroundColor Cyan
  return
}

Step '入れる'
Write-Host '   インストーラを起動します。終わるとデスクトップとスタートメニューに' -ForegroundColor Gray
Write-Host '   「時代戦線 序戦」のアイコンが出ます。そこから遊べます。' -ForegroundColor Gray
Start-Process $setup.FullName
