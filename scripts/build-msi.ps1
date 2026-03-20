param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BuildRoot = "",
  [string]$OutputRoot = "",
  [string]$ServiceName = "OnlyUserActivity",
  [switch]$SkipStage
)

$ErrorActionPreference = "Stop"

function Invoke-ExternalTool {
  param(
    [string]$Executable,
    [string[]]$Arguments,
    [string]$WorkingDirectory = $ProjectRoot
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

function Resolve-WixTool {
  param(
    [string]$FileName
  )

  $candidates = @(
    (Join-Path $ProjectRoot "tools\wix314-binaries\$FileName")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return (Resolve-Path $candidate).Path
    }
  }

  $command = Get-Command $FileName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Tool WiX '$FileName' non trovato. Aggiungi i binari in 'tools\\wix314-binaries' oppure nel PATH."
}

function Get-MsiVersion {
  param(
    [string]$PackageVersion
  )

  $parts = $PackageVersion.Split('-')[0].Split('.')
  while ($parts.Count -lt 3) {
    $parts += '0'
  }

  return ($parts[0..2] -join '.')
}

$packageJsonPath = Join-Path $ProjectRoot "package.json"
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$productName = $package.name
$productVersion = Get-MsiVersion -PackageVersion $package.version

if ([string]::IsNullOrWhiteSpace($BuildRoot)) {
  $BuildRoot = Join-Path $ProjectRoot "build\windows-msi"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $ProjectRoot "dist"
}

$BuildRoot = [System.IO.Path]::GetFullPath($BuildRoot)
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$StageRoot = Join-Path $BuildRoot "stage"
$ObjRoot = Join-Path $BuildRoot "obj"
$harvestFile = Join-Path $ObjRoot "AppFiles.wxs"
$templateFile = Join-Path $ProjectRoot "tools\msi\OnlyUserActivity.wxs"
$msiFile = Join-Path $OutputRoot "$productName-$productVersion-x64.msi"

New-Item -ItemType Directory -Force -Path $BuildRoot, $ObjRoot, $OutputRoot | Out-Null

if (-not $SkipStage) {
  $stageScript = Join-Path $ProjectRoot "scripts\stage-windows-package.ps1"
  Invoke-ExternalTool -Executable "powershell.exe" -Arguments @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $stageScript,
    "-ProjectRoot", $ProjectRoot,
    "-StageRoot", $StageRoot
  )
}

$stageAppRoot = Join-Path $StageRoot "app"
if (-not (Test-Path $stageAppRoot)) {
  throw "Stage applicativo non trovato in '$stageAppRoot'."
}
if (-not (Test-Path $templateFile)) {
  throw "Template WiX non trovato in '$templateFile'."
}

$heatExe = Resolve-WixTool -FileName "heat.exe"
$candleExe = Resolve-WixTool -FileName "candle.exe"
$lightExe = Resolve-WixTool -FileName "light.exe"

Invoke-ExternalTool -Executable $heatExe -Arguments @(
  "dir", $stageAppRoot,
  "-nologo",
  "-cg", "AppFiles",
  "-dr", "INSTALLFOLDER",
  "-srd",
  "-sfrag",
  "-sreg",
  "-scom",
  "-gg",
  "-var", "var.StageDir",
  "-out", $harvestFile
)

Invoke-ExternalTool -Executable $candleExe -Arguments @(
  "-nologo",
  "-arch", "x64",
  "-ext", "WixUtilExtension",
  "-dStageDir=$stageAppRoot",
  "-dProductName=$productName",
  "-dProductVersion=$productVersion",
  "-dServiceName=$ServiceName",
  "-out", (Join-Path $ObjRoot ""),
  $templateFile,
  $harvestFile
)

$mainObject = Join-Path $ObjRoot "OnlyUserActivity.wixobj"
$harvestObject = Join-Path $ObjRoot "AppFiles.wixobj"

Invoke-ExternalTool -Executable $lightExe -Arguments @(
  "-nologo",
  "-ext", "WixUtilExtension",
  "-out", $msiFile,
  $mainObject,
  $harvestObject
)

Write-Host "MSI creato in '$msiFile'."
