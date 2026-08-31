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
  Warn 'MSVC ビルドツールがありません。管理者の承認を求めます'
  # --override の中身は空白を含む。引数を配列で渡すと途中で切れて
  # winget が 0x8A150002（引数不正）を返すので、.cmd に書いて渡す
  $tmp = Join-Path $env:TEMP 'jidai-install-msvc.cmd'
  $body = @(
    '@echo off',
    'winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget --accept-package-agreements --accept-source-agreements --silent --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
  )
  Set-Content -Path $tmp -Value $body -Encoding ASCII
  $proc = Start-Process cmd -Verb RunAs -Wait -PassThru -ArgumentList '/c', $tmp
  Remove-Item $tmp -ErrorAction SilentlyContinue

  if (Test-Path $vswhere) {
    $msvc = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  }
  if (-not $msvc) {
    Write-Host ''
    Write-Host "MSVC ビルドツールを入れられませんでした（終了コード $($proc.ExitCode)）。" -ForegroundColor Red
    Write-Host '管理者の PowerShell で次の 1 行を実行してから、この script をやり直してください:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget --override "--wait --quiet --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"' -ForegroundColor White
    Write-Host ''
    throw 'MSVC ビルドツールが要ります'
  }
}
Ok "MSVC ビルドツール $msvc"

Step '依存を取る'
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'pnpm install に失敗しました' }

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
