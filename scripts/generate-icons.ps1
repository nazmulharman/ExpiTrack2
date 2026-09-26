Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $destPath, $width, $height) {
    $resolvedSrc = (Resolve-Path $srcPath).Path
    $destDir = (Resolve-Path (Split-Path $destPath)).Path
    $destFile = Join-Path $destDir (Split-Path $destPath -Leaf)

    $src = [System.Drawing.Image]::FromFile($resolvedSrc)
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $width, $height)

    # Save to temp and move to overwrite without locking
    $tempFile = [System.IO.Path]::GetTempFileName() + ".png"
    $dest.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()

    Move-Item -Path $tempFile -Destination $destFile -Force
    Write-Host "Generated: $destPath ($width x $height)"
}

Resize-Image 'public/logo.jpg' 'public/pwa-192x192.png' 192 192
Resize-Image 'public/logo.jpg' 'public/icon-192x192.png' 192 192
Resize-Image 'public/logo.jpg' 'public/apple-touch-icon.png' 192 192
Resize-Image 'public/logo.jpg' 'public/pwa-512x512.png' 512 512
Resize-Image 'public/logo.jpg' 'public/icon-512x512.png' 512 512
Resize-Image 'public/logo.jpg' 'public/pwa-maskable-512x512.png' 512 512
Resize-Image 'public/logo.jpg' 'public/icon-maskable-512x512.png' 512 512
Resize-Image 'public/logo.jpg' 'public/favicon.ico' 64 64

Write-Host "All PWA and browser icons successfully updated from logo.jpg!"
