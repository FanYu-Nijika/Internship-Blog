param(
  [string]$NoteDate = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd'),
  [string]$Branch = "main",
  [string]$Remote = "origin",
  [string]$LogPath = ""
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$archiveScript = Join-Path $scriptDir "archive-daily-note.ps1"

if (-not $LogPath) {
  $logDir = Join-Path $projectRoot "logs"
  $LogPath = Join-Path $logDir "nightly-archive.log"
} else {
  $logDir = Split-Path -Parent $LogPath
}

if ($logDir -and -not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log([string]$Message) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] $Message" | Tee-Object -FilePath $LogPath -Append
}

function Invoke-LoggedCommand([string]$FilePath, [string[]]$Arguments) {
  Write-Log ("RUN: {0} {1}" -f $FilePath, ($Arguments -join " "))
  $output = & $FilePath @Arguments 2>&1
  foreach ($line in $output) {
    Write-Log ($line | Out-String).TrimEnd()
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $FilePath"
  }
}

try {
  Write-Log "=== Nightly update started for $NoteDate ==="

  if (-not (Test-Path $archiveScript)) {
    throw "Archive script not found: $archiveScript"
  }

  Set-Location $projectRoot
  Write-Log "Project root: $projectRoot"

  $archiveOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $archiveScript -NoteDate $NoteDate 2>&1
  $archiveExitCode = $LASTEXITCODE
  foreach ($line in $archiveOutput) {
    Write-Log ($line | Out-String).TrimEnd()
  }
  if ($archiveExitCode -ne 0) {
    throw "Archive script failed with exit code $archiveExitCode"
  }

  Invoke-LoggedCommand "git" @("status", "--short")
  $changes = & git status --porcelain
  if (-not $changes) {
    Write-Log "No git changes after archive; skip commit and push."
    Write-Log "=== Nightly update finished ==="
    exit 0
  }

  Invoke-LoggedCommand "git" @("add", "-A")
  $commitMessage = "Archive daily note $NoteDate"
  Invoke-LoggedCommand "git" @("commit", "-m", $commitMessage)
  Invoke-LoggedCommand "git" @("push", $Remote, $Branch)

  Write-Log "Pushed nightly update to $Remote/$Branch."
  Write-Log "=== Nightly update finished ==="
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  Write-Log "=== Nightly update failed ==="
  exit 1
}
