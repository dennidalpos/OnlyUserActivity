param(
  [string]$ServiceName = "OnlyUserActivity",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$NodePath = (Get-Command node -ErrorAction Stop).Source,
  [string]$NssmPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "nssm.exe"),
  [string]$LogDir = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $NssmPath)) {
  throw "nssm.exe non trovato in '$NssmPath'. Scaricalo da https://nssm.cc/ e posizionalo nella root del progetto (nssm.exe)."
}

$serverPath = Join-Path $ProjectRoot "src\server.js"
if (-not (Test-Path $serverPath)) {
  throw "Impossibile trovare server.js in '$serverPath'. Verifica il percorso del progetto."
}

if ([string]::IsNullOrWhiteSpace($LogDir)) {
  $LogDir = Join-Path $ProjectRoot "logs"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
  $envExample = Join-Path $ProjectRoot ".env.example"
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile -Force
  }
}

& $NssmPath install $ServiceName $NodePath $serverPath
& $NssmPath set $ServiceName AppDirectory $ProjectRoot
& $NssmPath set $ServiceName AppStdout (Join-Path $LogDir "service-stdout.log")
& $NssmPath set $ServiceName AppStderr (Join-Path $LogDir "service-stderr.log")
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateOnline 1
& $NssmPath set $ServiceName AppRotateBytes 1048576
& $NssmPath set $ServiceName Start SERVICE_AUTO_START

Write-Host "Servizio '$ServiceName' installato. Avvio in corso..."
Start-Service -Name $ServiceName
Get-Service -Name $ServiceName
