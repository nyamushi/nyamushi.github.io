# ==========================================================================
#  一键发布作品集到 GitHub Pages
#
#  用法：在【你自己的 PowerShell 窗口】里执行
#        cd C:\Users\30278\Downloads\作品集
#        powershell -ExecutionPolicy Bypass -File tools\publish.ps1
#
#  首次推送会弹出 GitHub 登录窗口（浏览器授权一次即可）。
#
#  注意：本机沙箱环境不允许 git 调用凭据弹窗，所以这一步必须在你自己的
#        终端里跑，不能在对话里代跑。
# ==========================================================================

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

# ---------- 0. 仓库状态 ----------
Step '本地仓库状态'
if (-not (Test-Path (Join-Path $root '.git'))) {
    Write-Host '未找到 .git，需要先初始化，请告诉我。' -ForegroundColor Red
    exit 1
}
Write-Host ('当前提交: ' + (git log --oneline -1))
Write-Host ('远程地址: ' + (git remote get-url origin))

# ---------- 1. 确认敏感文件未被跟踪 ----------
Step '检查简历与原始素材是否被跟踪'
$leak = git ls-files | Where-Object { $_ -match 'resume\.docx|^raw-src/|^_qa/' }
if ($leak) {
    Write-Host '发现不该提交的文件，从索引移除（磁盘文件保留）：' -ForegroundColor Yellow
    $leak | ForEach-Object { Write-Host ('  - ' + $_) }
    git rm -r --cached --quiet resume.docx raw-src _qa 2>$null
    git commit -q -m 'chore: 移除简历与原始素材'
} else {
    Write-Host '通过：resume.docx / raw-src / _qa 均未被跟踪' -ForegroundColor Green
}

# ---------- 2. 清空远程历史（仅在简历仍泄漏时需要） ----------
Step '检查远程是否还残留简历'
$remoteHasResume = $false
try {
    $remoteFiles = git ls-tree -r --name-only origin/main 2>$null
    if ($remoteFiles -match 'resume\.docx') { $remoteHasResume = $true }
} catch { }

if ($remoteHasResume) {
    Write-Host '远程 main 上仍有 resume.docx（含手机号 + 邮箱），需要清除。' -ForegroundColor Yellow
    Write-Host '这一步只改远程分支指针，本地文件完全不受影响。'
    $ans = Read-Host '确认清空远程历史？(y/N)'
    if ($ans -match '^[yY]') {
        $emptyCommit = git commit-tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904 -m 'reset'
        if ($LASTEXITCODE -eq 0) {
            git push --force origin "${emptyCommit}:refs/heads/main"
            Write-Host '远程历史已清空' -ForegroundColor Green
        } else {
            Write-Host '清空失败，跳过（不影响下面的推送）' -ForegroundColor Yellow
        }
    } else {
        Write-Host '已跳过（旧提交会继续留在 GitHub 历史中）' -ForegroundColor Yellow
    }
} else {
    Write-Host '通过：远程 main 上已无 resume.docx，无需清空历史' -ForegroundColor Green
}

# ---------- 3. 推送到远程 ----------
Step '推送'
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n推送失败。常见原因：" -ForegroundColor Red
    Write-Host '  1. 未登录或 Token 无 repo 权限'
    Write-Host '  2. 仓库地址不对（当前: ' + (git remote get-url origin) + '）'
    Write-Host '  3. 网络超时 —— 重试一次通常即可'
    Write-Host '  4. 远程有本地没有的提交 —— 先执行 git pull --rebase origin main'
    exit 1
}

# ---------- 4. 结果 ----------
Step '完成'
$remote = git remote get-url origin
$name = $remote -replace '.*github\.com[:/](.+?)(\.git)?$', '$1'
$user = $name.Split('/')[0]
$repo = $name.Split('/')[1]
if ($repo -ieq "$user.github.io") {
    Write-Host "站点: https://$user.github.io/" -ForegroundColor Green
} else {
    Write-Host "站点: https://$user.github.io/$repo/" -ForegroundColor Green
}
Write-Host "仓库: https://github.com/$name" -ForegroundColor Green
Write-Host ''
Write-Host '站点若没变化，先强制刷新（Ctrl + F5）或换个无痕窗口 —— 多半是浏览器缓存。'
Write-Host '可用 node tools/check-site.js 确认线上是否已是最新版本。'
