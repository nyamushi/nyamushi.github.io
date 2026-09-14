# ============================================================
#  Portfolio image pipeline (ASCII-only on purpose: Windows
#  PowerShell 5.1 reads .ps1 as ANSI, so no CJK literals here.)
#  Raw assets -> assets/img/<project>/<name>-<width>.jpg
#  Run:  & tools/build-assets.ps1
# ============================================================
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$raw  = Join-Path $root 'raw-src'
$out  = Join-Path $root 'assets\img'

# ---------- classify every raw file once ----------
$classified = @{}
Get-ChildItem -Path $raw -File | ForEach-Object {
    $f = $_
    $key = $null
    if     ($f.Length -eq  258211) { $key = 'seedBoard' }
    elseif ($f.Length -eq  187420) { $key = 'arBoard'   }
    elseif ($f.Length -eq  239085) { $key = 'robotBoard'}
    elseif ($f.Length -eq 1416633) { $key = 'robotHero' }
    elseif ($f.Length -eq 3045933) { $key = 'robotSide' }
    elseif ($f.Length -eq 10064051){ $key = 'cultureLight' }
    elseif ($f.Length -eq  9884802){ $key = 'cultureJade'  }
    elseif ($f.Length -eq 10459573){ $key = 'cultureDing'  }
    # 2026-09 新增课程项目素材
    elseif ($f.Length -eq   202737){ $key = 'massagerHome'    }
    elseif ($f.Length -eq   172111){ $key = 'massagerControl' }
    elseif ($f.Length -eq   174435){ $key = 'massagerData'    }
    elseif ($f.Length -eq   124385){ $key = 'massagerUser'    }
    elseif ($f.Length -eq   331845){ $key = 'massagerViews'   }
    elseif ($f.Length -eq   139279){ $key = 'stationeryProps' }
    # 文具套装展板：原为 webp，GDI+ 无法解码，已用 tools/decode-webp.js 转成 JPEG
    elseif ($f.Length -eq   441545){ $key = 'stationeryBoard' }
    if ($key) { $classified[$key] = $f.FullName }
}

# ---------- output plan ----------
$plan = @(
    @{ key = 'robotBoard';   dir = 'robot';   name = 'board';       widths = @(1800, 1100, 700) },
    @{ key = 'robotHero';    dir = 'robot';   name = 'hero';        widths = @(1400, 900) },
    @{ key = 'robotSide';    dir = 'robot';   name = 'render-side'; widths = @(1800, 1100, 700) },
    @{ key = 'arBoard';      dir = 'ar-cards';name = 'board';       widths = @(1800, 1100, 700) },
    @{ key = 'seedBoard';    dir = 'seed';    name = 'board';       widths = @(1800, 1100, 700) },
    @{ key = 'cultureLight'; dir = 'culture'; name = 'light';       widths = @(1600, 1100, 1000, 700) },
    @{ key = 'cultureJade';  dir = 'culture'; name = 'jade';        widths = @(1600, 1100, 1000, 700) },
    @{ key = 'cultureDing';  dir = 'culture'; name = 'ding';        widths = @(1600, 1100, 1000, 700) }
    # 气动按摩仪：产品三视图做封面，App 界面 4 屏做插图
    @{ key = 'massagerViews';   dir = 'massager'; name = 'views';   widths = @(1800, 1100, 700) },
    @{ key = 'massagerHome';    dir = 'massager'; name = 'ui-home';    widths = @(900, 700) },
    @{ key = 'massagerControl'; dir = 'massager'; name = 'ui-control'; widths = @(900, 700) },
    @{ key = 'massagerData';    dir = 'massager'; name = 'ui-data';    widths = @(900, 700) },
    @{ key = 'massagerUser';    dir = 'massager'; name = 'ui-user';    widths = @(900, 700) },
    # 萌宠吸吸解压文具套装
    @{ key = 'stationeryBoard'; dir = 'stationery'; name = 'board'; widths = @(1800, 1100, 700) },
    @{ key = 'stationeryProps'; dir = 'stationery'; name = 'props'; widths = @(1280, 1100, 900, 700) }
)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]88)

function Resize-Jpeg {
    param([string]$Source, [string]$Dest, [int]$TargetW)
    $src = [System.Drawing.Image]::FromFile($Source)
    try {
        # 不放大小图：目标宽度超过原图时按原图宽度输出
        if ($TargetW -gt $src.Width) { $TargetW = $src.Width }
        $ratio = $TargetW / $src.Width
        $w = [int][Math]::Round($src.Width  * $ratio)
        $h = [int][Math]::Round($src.Height * $ratio)
        $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.Clear([System.Drawing.Color]::White)
                $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)))
            } finally { $g.Dispose() }
            $dir = Split-Path -Parent $Dest
            if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
            $bmp.Save($Dest, $jpegCodec, $encParams)
        } finally { $bmp.Dispose() }
        return @{ W = $w; H = $h }
    } finally { $src.Dispose() }
}

$total = 0; $bytes = 0
foreach ($p in $plan) {
    if (-not $classified.ContainsKey($p.key)) { Write-Warning ("missing raw asset: " + $p.key); continue }
    $source = $classified[$p.key]
    foreach ($w in $p.widths) {
        $dest = Join-Path $out ("$($p.dir)\$($p.name)-$w.jpg")
        $info = Resize-Jpeg -Source $source -Dest $dest -TargetW $w
        $size = (Get-Item $dest).Length
        $total++; $bytes += $size
        Write-Host ("  {0,-40} {1,5}x{2,-5} {3,7:N0} KB" -f "$($p.dir)/$($p.name)-$w.jpg", $info.W, $info.H, ($size / 1KB))
    }
}
Write-Host ""
Write-Host ("DONE: {0} files, {1:N2} MB total" -f $total, ($bytes / 1MB))
