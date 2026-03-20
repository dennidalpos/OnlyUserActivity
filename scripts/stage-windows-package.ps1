param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$StageRoot = "",
  [switch]$SkipDependencyInstall
)

$ErrorActionPreference = "Stop"

function Copy-ProjectItem {
  param(
    [string]$SourceRoot,
    [string]$RelativePath,
    [string]$DestinationRoot
  )

  $sourcePath = Join-Path $SourceRoot $RelativePath
  if (-not (Test-Path $sourcePath)) {
    throw "Percorso richiesto per lo staging non trovato: '$sourcePath'."
  }

  $destinationPath = Join-Path $DestinationRoot $RelativePath
  $destinationParent = Split-Path -Parent $destinationPath
  if (-not [string]::IsNullOrWhiteSpace($destinationParent)) {
    New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
  }

  Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
}

function Invoke-ExternalTool {
  param(
    [string]$Executable,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Comando fallito ($LASTEXITCODE): $Executable $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

if ([string]::IsNullOrWhiteSpace($StageRoot)) {
  $StageRoot = Join-Path $ProjectRoot "build\windows-msi\stage"
}

$StageRoot = [System.IO.Path]::GetFullPath($StageRoot)
$stageAppRoot = Join-Path $StageRoot "app"

Remove-Item $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stageAppRoot | Out-Null

$projectItems = @(
  ".env.example",
  "LICENSE",
  "README.md",
  "package.json",
  "package-lock.json",
  "public",
  "src"
)

$scriptItems = @(
  "scripts\create-user.js",
  "scripts\install-windows-service.ps1",
  "scripts\remove-windows-service.ps1",
  "scripts\restart-server.js"
)

foreach ($item in ($projectItems + $scriptItems)) {
  Copy-ProjectItem -SourceRoot $ProjectRoot -RelativePath $item -DestinationRoot $stageAppRoot
}

$nssmRoot = Join-Path $ProjectRoot "tools\nssm"
if (-not (Test-Path $nssmRoot)) {
  throw "NSSM non trovato in '$nssmRoot'. Il packaging MSI richiede i binari locali di NSSM."
}

Copy-ProjectItem -SourceRoot $ProjectRoot -RelativePath "tools\nssm" -DestinationRoot $stageAppRoot

if (-not $SkipDependencyInstall) {
  $npmCommand = (Get-Command npm -ErrorAction Stop).Source
  Invoke-ExternalTool -Executable $npmCommand -Arguments @("ci", "--omit=dev", "--ignore-scripts") -WorkingDirectory $stageAppRoot
}

Write-Host "Stage MSI creato in '$stageAppRoot'."
