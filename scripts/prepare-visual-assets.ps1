param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string[]]$UnitFile
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if ($UnitFile.Count -eq 1) { $UnitFile = $UnitFile[0] -split ' ' }

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

# Image generation sometimes returns a light checkerboard baked into an otherwise correct
# character image. Remove only neutral, bright pixels connected to the canvas edge, so white
# fur, bone tools and black outlines inside the silhouette remain intact.
function Convert-Character([string]$Source, [string]$Target, [int]$Size) {
  $src = [System.Drawing.Bitmap]::new($Source)
  try {
    # The final sprites are 256px.  Scanning multi-megapixel generation output in
    # PowerShell is needlessly slow, so reduce it before detecting edge-connected
    # checkerboard pixels.  The working resolution still retains ample detail.
    $maxWorkingSide = 384
    if ($src.Width -gt $maxWorkingSide -or $src.Height -gt $maxWorkingSide) {
      $scale = [Math]::Min($maxWorkingSide / $src.Width, $maxWorkingSide / $src.Height)
      $working = [System.Drawing.Bitmap]::new([int][Math]::Round($src.Width * $scale), [int][Math]::Round($src.Height * $scale), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $g = [System.Drawing.Graphics]::FromImage($working)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($src, [System.Drawing.Rectangle]::new(0, 0, $working.Width, $working.Height))
      } finally { $g.Dispose() }
      $src.Dispose()
      $src = $working
    }
    $w = $src.Width
    $h = $src.Height
    $seen = New-Object 'bool[,]' $w, $h
    $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
    function Is-Checkerboard([System.Drawing.Color]$Color) {
      $hi = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
      $lo = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
      return $hi - $lo -le 18 -and (($Color.R + $Color.G + $Color.B) / 3) -ge 175
    }
    function Add-Background([int]$X, [int]$Y) {
      if ($X -lt 0 -or $Y -lt 0 -or $X -ge $w -or $Y -ge $h -or $seen[$X, $Y]) { return }
      if (!(Is-Checkerboard ($src.GetPixel($X, $Y)))) { return }
      $seen[$X, $Y] = $true
      $queue.Enqueue([System.Drawing.Point]::new($X, $Y))
    }
    for ($x = 0; $x -lt $w; $x++) { Add-Background $x 0; Add-Background $x ($h - 1) }
    for ($y = 1; $y -lt ($h - 1); $y++) { Add-Background 0 $y; Add-Background ($w - 1) $y }
    while ($queue.Count -gt 0) {
      $p = $queue.Dequeue()
      Add-Background ($p.X - 1) $p.Y
      Add-Background ($p.X + 1) $p.Y
      Add-Background $p.X ($p.Y - 1)
      Add-Background $p.X ($p.Y + 1)
    }
    $cutout = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
          if (!$seen[$x, $y]) { $cutout.SetPixel($x, $y, $src.GetPixel($x, $y)) }
        }
      }
      $dst = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $g = [System.Drawing.Graphics]::FromImage($dst)
        try {
          $g.Clear([System.Drawing.Color]::Transparent)
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $pad = [Math]::Max(2, [Math]::Round($Size * 0.035))
          $scale = [Math]::Min(($Size - 2 * $pad) / $cutout.Width, ($Size - 2 * $pad) / $cutout.Height)
          $drawW = $cutout.Width * $scale
          $drawH = $cutout.Height * $scale
          $g.DrawImage($cutout, [System.Drawing.RectangleF]::new(($Size - $drawW) / 2, $Size - $pad - $drawH, $drawW, $drawH))
        } finally { $g.Dispose() }
        Save-Png $dst $Target
      } finally { $dst.Dispose() }
    } finally { $cutout.Dispose() }
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
  @{ Source = "asset/ui"; Target = "src/assets/ui"; Kind = "transparent"; Size = 128 },
  @{ Source = "asset/units"; Target = "src/assets/units"; Kind = "character"; Size = 256 }
)

foreach ($job in $jobs) {
  if ($UnitFile -and $job.Kind -ne "character") { continue }
  $sourceDir = Join-Path $Root $job.Source
  if (!(Test-Path $sourceDir)) { continue }
  foreach ($source in Get-ChildItem $sourceDir -Filter *.png) {
    if ($job.Kind -eq "character" -and $UnitFile -and $source.Name -notin $UnitFile) { continue }
    $target = Join-Path (Join-Path $Root $job.Target) $source.Name
    if ($job.Kind -eq "background") { Convert-Background $source.FullName $target }
    elseif ($job.Kind -eq "character") { Convert-Character $source.FullName $target $job.Size }
    else { Convert-Transparent $source.FullName $target $job.Size }
  }
}

Write-Host "Prepared visual PNG assets."
