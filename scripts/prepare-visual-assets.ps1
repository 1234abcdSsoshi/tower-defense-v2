param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Save-Png([System.Drawing.Bitmap]$Bitmap, [string]$Path) {
  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force $parent | Out-Null
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Convert-Background([string]$Source, [string]$Target) {
  $src = [System.Drawing.Bitmap]::new($Source)
  try {
    $dst = [System.Drawing.Bitmap]::new(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $g = [System.Drawing.Graphics]::FromImage($dst)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $scale = [Math]::Max(1280 / $src.Width, 720 / $src.Height)
        $sw = 1280 / $scale
        $sh = 720 / $scale
        $sx = ($src.Width - $sw) / 2
        # Preserve slightly more sky while keeping the clear battlefield lane.
        $sy = [Math]::Max(0, ($src.Height - $sh) * 0.43)
        $g.DrawImage($src, [System.Drawing.RectangleF]::new(0, 0, 1280, 720), [System.Drawing.RectangleF]::new($sx, $sy, $sw, $sh), [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $g.Dispose() }
      Save-Png $dst $Target
    } finally { $dst.Dispose() }
  } finally { $src.Dispose() }
}

function Convert-Transparent([string]$Source, [string]$Target, [int]$Size) {
  $src = [System.Drawing.Bitmap]::new($Source)
  try {
    $dst = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $g = [System.Drawing.Graphics]::FromImage($dst)
      try {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $pad = [Math]::Max(2, [Math]::Round($Size * 0.035))
        $scale = [Math]::Min(($Size - 2 * $pad) / $src.Width, ($Size - 2 * $pad) / $src.Height)
        $w = $src.Width * $scale
        $h = $src.Height * $scale
        $x = ($Size - $w) / 2
        $y = $Size - $pad - $h
        $g.DrawImage($src, [System.Drawing.RectangleF]::new($x, $y, $w, $h))
      } finally { $g.Dispose() }
      Save-Png $dst $Target
    } finally { $dst.Dispose() }
  } finally { $src.Dispose() }
}

$jobs = @(
  @{ Source = "asset/backgrounds"; Target = "src/assets/backgrounds"; Kind = "background"; Size = 0 },
  @{ Source = "asset/castles"; Target = "src/assets/castles"; Kind = "transparent"; Size = 512 },
  @{ Source = "asset/foregrounds"; Target = "src/assets/foregrounds"; Kind = "transparent"; Size = 512 },
  @{ Source = "asset/projectiles"; Target = "src/assets/projectiles"; Kind = "transparent"; Size = 256 },
  @{ Source = "asset/effects"; Target = "src/assets/effects"; Kind = "transparent"; Size = 256 },
  @{ Source = "asset/disasters"; Target = "src/assets/disasters"; Kind = "transparent"; Size = 512 },
  @{ Source = "asset/skills"; Target = "src/assets/skills"; Kind = "transparent"; Size = 192 },
  @{ Source = "asset/ui"; Target = "src/assets/ui"; Kind = "transparent"; Size = 128 }
)

foreach ($job in $jobs) {
  $sourceDir = Join-Path $Root $job.Source
  if (!(Test-Path $sourceDir)) { continue }
  foreach ($source in Get-ChildItem $sourceDir -Filter *.png) {
    $target = Join-Path (Join-Path $Root $job.Target) $source.Name
    if ($job.Kind -eq "background") { Convert-Background $source.FullName $target }
    else { Convert-Transparent $source.FullName $target $job.Size }
  }
}

Write-Host "Prepared visual PNG assets."
