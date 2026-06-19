param(
  [string]$At = "04:00",
  [string]$TaskName = "InternshipBlogDailyArchive"
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$archiveScript = Join-Path $scriptDir "archive-daily-note.ps1"

if (-not (Test-Path $archiveScript)) {
  throw "未找到归档脚本：$archiveScript"
}

$time = [DateTime]::ParseExact($At, "HH:mm", $null)
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$archiveScript`""
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
  -Description "每天把 Internship Blog 的 data/daily-notes/前一天.md 归档到 data/entries.js" `
  -Force | Out-Null

Write-Host "已创建/更新 Windows 任务计划：$TaskName"
Write-Host "运行时间：每天 $At"
Write-Host "默认归档：前一天的 data\daily-notes\yyyy-MM-dd.md"
Write-Host "手动测试：powershell -ExecutionPolicy Bypass -File `"$archiveScript`" -NoteDate 2026-06-19"
