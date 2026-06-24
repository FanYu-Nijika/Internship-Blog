param(
  [string]$NoteDate = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$notePath = Join-Path $projectRoot "data\daily-notes\$NoteDate.md"
$entriesPath = Join-Path $projectRoot "data\entries.js"
$backupDir = Join-Path $projectRoot "data\backups"

function Read-TextUtf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-TextUtf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Get-MetaValue([string]$Text, [string]$Key) {
  $escapedKey = [regex]::Escape($Key)
  $match = [regex]::Match($Text, "(?m)^\s*(?:[-*+]\s*)?$escapedKey\s*[：:]\s*(.+?)\s*$")
  if ($match.Success) { return $match.Groups[1].Value.Trim() }
  return ""
}

function Get-Title([string]$Text) {
  $metaTitle = Get-MetaValue $Text "标题"
  if ($metaTitle) { return $metaTitle }
  $match = [regex]::Match($Text, "(?m)^#\s+(.+?)\s*$")
  if ($match.Success) { return $match.Groups[1].Value.Trim() }
  return "$NoteDate 实习日报"
}

function Get-SectionItems([string]$Text, [string]$Heading) {
  $escapedHeading = [regex]::Escape($Heading)
  $pattern = "(?ms)^##\s*$escapedHeading\s*\r?\n(.*?)(?=^##\s+|\z)"
  $match = [regex]::Match($Text, $pattern)
  if (-not $match.Success) { return @() }

  $body = $match.Groups[1].Value.Trim()
  if (-not $body) { return @() }

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($body -split "\r?\n")) {
    $value = $line.Trim()
    if (-not $value) { continue }
    $value = [regex]::Replace($value, "^\s*(?:[-*+]\s+|\d{1,2}[、，,.．)）]\s*)", "")
    if (-not $value -or $value -eq "-") { continue }
    if ($value) { $items.Add($value) }
  }
  return @($items)
}

function Split-Tags([string]$RawTags) {
  if (-not $RawTags) { return @("实习记录") }
  $tags = $RawTags -split "[，,、\s]+" | Where-Object { $_.Trim() } | ForEach-Object { $_.Trim() }
  if (-not $tags -or $tags.Count -eq 0) { return @("实习记录") }
  return @($tags)
}

function Build-Summary([string]$Text, [array]$DoneItems) {
  $summary = Get-MetaValue $Text "摘要"
  if ($summary) { return $summary }
  if ($DoneItems.Count -gt 0) {
    return ($DoneItems | Select-Object -First 2) -join "；"
  }
  return "整理 $NoteDate 的实习速记，沉淀为可复盘、可面试表达的正式记录。"
}

if (-not (Test-Path $notePath)) {
  Write-Host "未找到速记文件：$notePath"
  Write-Host "请先复制 data\daily-notes\TEMPLATE.md，改名为 $NoteDate.md，并把当天速记填进去。"
  exit 0
}

if (-not (Test-Path $entriesPath)) {
  throw "未找到 data\entries.js：$entriesPath"
}

$noteText = Read-TextUtf8 $notePath
$title = Get-Title $noteText
$type = Get-MetaValue $noteText "类型"
if (-not $type) { $type = "实习日报" }
$project = Get-MetaValue $noteText "项目"
if (-not $project) { $project = "实习记录" }
$result = Get-MetaValue $noteText "结果"
if (-not $result) { $result = "已整理为正式复盘记录" }
$tags = Split-Tags (Get-MetaValue $noteText "标签")

$sectionNames = @("今天做了什么", "遇到的问题", "解决过程", "结果证据", "面试可讲", "下一步")
$sections = New-Object System.Collections.Generic.List[object]
$doneItems = @()
foreach ($name in $sectionNames) {
  $items = @(Get-SectionItems $noteText $name)
  if ($name -eq "今天做了什么") { $doneItems = $items }
  if ($items.Count -gt 0) {
    $sections.Add([ordered]@{
      heading = $name
      items = $items
    })
  }
}

if ($sections.Count -eq 0) {
  Write-Host "速记文件存在，但没有识别到二级标题。请使用 TEMPLATE.md 里的 ## 今天做了什么 等标题。"
  exit 0
}

$numericId = [int]($NoteDate -replace "-", "")
$summary = Build-Summary $noteText $doneItems
$entry = [ordered]@{
  id = $numericId
  date = $NoteDate
  type = $type
  title = $title
  summary = $summary
  tags = $tags
  project = $project
  result = $result
  source = "local-daily-note"
  sections = @($sections.ToArray())
}

$entryJson = $entry | ConvertTo-Json -Depth 20
$block = "  // LOCAL-DAILY-NOTE:$NoteDate START`r`n  $($entryJson -replace "`r?`n", "`r`n  "),`r`n  // LOCAL-DAILY-NOTE:$NoteDate END`r`n"

$milestoneDate = $NoteDate
try {
  $milestoneDate = ([DateTime]::ParseExact($NoteDate, "yyyy-MM-dd", $null)).ToString("MM/dd")
} catch {
  $milestoneDate = $NoteDate
}
$milestone = [ordered]@{
  id = "daily-$NoteDate"
  date = $milestoneDate
  title = $title
  detail = $summary
}
$milestoneJson = $milestone | ConvertTo-Json -Depth 10
$milestoneBlock = "  // LOCAL-DAILY-MILESTONE:$NoteDate START`r`n  $($milestoneJson -replace "`r?`n", "`r`n  "),`r`n  // LOCAL-DAILY-MILESTONE:$NoteDate END`r`n"

$entriesText = Read-TextUtf8 $entriesPath
$existingPattern = "(?ms)\s*// LOCAL-DAILY-NOTE:$([regex]::Escape($NoteDate)) START.*?// LOCAL-DAILY-NOTE:$([regex]::Escape($NoteDate)) END\r?\n?"
$entriesText = [regex]::Replace($entriesText, $existingPattern, "")
$existingMilestonePattern = "(?ms)\s*// LOCAL-DAILY-MILESTONE:$([regex]::Escape($NoteDate)) START.*?// LOCAL-DAILY-MILESTONE:$([regex]::Escape($NoteDate)) END\r?\n?"
$entriesText = [regex]::Replace($entriesText, $existingMilestonePattern, "")

if ($entriesText -notmatch "window\.INTERNSHIP_ENTRIES\s*=\s*\[") {
  throw "data\entries.js 中没有找到 window.INTERNSHIP_ENTRIES = ["
}

if ($entriesText -notmatch "window\.INTERNSHIP_MILESTONES\s*=\s*\[") {
  throw "data\entries.js 中没有找到 window.INTERNSHIP_MILESTONES = ["
}

if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$backupPath = Join-Path $backupDir ("entries-$((Get-Date).ToString('yyyyMMdd-HHmmss')).js")
Write-TextUtf8NoBom $backupPath $entriesText

$entriesText = [regex]::Replace($entriesText, "window\.INTERNSHIP_ENTRIES\s*=\s*\[\s*", { param($m) $m.Value + "`r`n" + $block }, 1)
$entriesText = [regex]::Replace($entriesText, "window\.INTERNSHIP_MILESTONES\s*=\s*\[\s*", { param($m) $m.Value + "`r`n" + $milestoneBlock }, 1)
Write-TextUtf8NoBom $entriesPath $entriesText

Write-Host "已归档 $NoteDate 到 data\entries.js"
Write-Host "已同步 $NoteDate 到成长时间线"
Write-Host "备份文件：$backupPath"
