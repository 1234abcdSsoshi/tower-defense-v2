param(
  [int]$Height = 256
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $projectRoot "asset"
$outputDir = Join-Path $projectRoot "src\assets\units"
$assetPattern = "^(walk|throw|swarm|pray|ride|snipe|make|fly|siegeh|rule|guard|pbow|ubow|hors|blade|hex|boss|yokai)-era\d+-.*\.png$"

if (-not (Test-Path -LiteralPath $sourceDir -PathType Container)) {
  throw "Source asset directory was not found: $sourceDir"
}
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Add-Type -AssemblyName System.Drawing
if (-not ("UnitSpriteAlpha" -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class UnitSpriteAlpha
{
    public static Rectangle FindBounds(Bitmap bitmap)
    {
        Rectangle whole = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(whole, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            int stride = Math.Abs(data.Stride);
            byte[] pixels = new byte[stride * bitmap.Height];
            Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
            int left = bitmap.Width, top = bitmap.Height, right = -1, bottom = -1;
            for (int y = 0; y < bitmap.Height; y++)
            {
                int row = y * stride;
                for (int x = 0; x < bitmap.Width; x++)
                {
                    if (pixels[row + x * 4 + 3] <= 3) continue;
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
            if (right < left || bottom < top) return Rectangle.Empty;
            return Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
    }
}
"@
}

$files = Get-ChildItem -LiteralPath $sourceDir -Filter "*.png" |
  Where-Object Name -Match $assetPattern |
  Sort-Object Name

foreach ($file in $files) {
  $decoded = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $argb = [System.Drawing.Bitmap]::new(
      $decoded.Width,
      $decoded.Height,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    try {
      $sourceGraphics = [System.Drawing.Graphics]::FromImage($argb)
      try {
        $sourceGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $sourceGraphics.Clear([System.Drawing.Color]::Transparent)
        $sourceGraphics.DrawImageUnscaled($decoded, 0, 0)
      } finally {
        $sourceGraphics.Dispose()
      }

      $bounds = [UnitSpriteAlpha]::FindBounds($argb)
      if ($bounds.IsEmpty) { throw "No visible pixels: $($file.FullName)" }

      if ($file.Name.StartsWith("walk-era")) {
        # The six original sprites already have hand-tuned anchors in unitSprites.ts.
        $sourceRect = [System.Drawing.Rectangle]::new(0, 0, $argb.Width, $argb.Height)
        $contentHeight = $Height
        $margin = 0
      } else {
        # Normalize every generated sprite to a shared ground line while retaining
        # transparent padding. This removes generator-dependent canvas margins.
        $sourceRect = $bounds
        $margin = 6
        $contentHeight = $Height - $margin * 2
      }

      $scale = $contentHeight / $sourceRect.Height
      $contentWidth = [Math]::Max(1, [Math]::Round($sourceRect.Width * $scale))
      $outputWidth = $contentWidth + $margin * 2
      $output = [System.Drawing.Bitmap]::new(
        $outputWidth,
        $Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
      )
      try {
        $output.SetResolution(96, 96)
        $graphics = [System.Drawing.Graphics]::FromImage($output)
        try {
          $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $destinationRect = [System.Drawing.Rectangle]::new($margin, $margin, $contentWidth, $contentHeight)
          $graphics.DrawImage($argb, $destinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
          $graphics.Dispose()
        }
        $destination = Join-Path $outputDir $file.Name
        $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $output.Dispose()
      }
    } finally {
      $argb.Dispose()
    }
  } finally {
    $decoded.Dispose()
  }
}

Write-Output "Prepared $($files.Count) unit sprites in $outputDir"
