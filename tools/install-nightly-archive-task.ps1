param(
  [string]$At = "04:00",
  [string]$TaskName = "InternshipBlogDailyArchive",
  [string]$Branch = "main",
  [string]$Remote = "origin"
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nightlyScript = Join-Path $scriptDir "run-nightly-update.ps1"
$projectRoot = Split-Path -Parent $scriptDir

if (-not (Test-Path $nightlyScript)) {
  throw "未找到夜间更新脚本：$nightlyScript"
}

$time = [DateTime]::ParseExact($At, "HH:mm", $null)
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$nightlyScript`" -Branch `"$Branch`" -Remote `"$Remote`"" `
  -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "每天把 Internship Blog 的前一天速记归档到 data/entries.js，并自动提交推送到 GitHub" `
  -Force | Out-Null

Write-Host "已创建/更新 Windows 任务计划：$TaskName"
Write-Host "运行时间：每天 $At"
Write-Host "默认归档：前一天的 data\daily-notes\yyyy-MM-dd.md"
Write-Host "自动上传：git push $Remote $Branch"
Write-Host "日志文件：$projectRoot\logs\nightly-archive.log"
Write-Host "手动测试：powershell -ExecutionPolicy Bypass -File `"$nightlyScript`" -NoteDate 2026-06-19 -Branch `"$Branch`" -Remote `"$Remote`""
