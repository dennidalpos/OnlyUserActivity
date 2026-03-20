param(
  [string]$ServiceName = "OnlyUserActivity",
  [string]$DisplayName = "OnlyUserActivity",
  [string]$Description = "OnlyUserActivity web service",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$NodePath = (Get-Command node -ErrorAction Stop).Source,
  [string]$NssmPath = "",
  [string]$LogDir = "",
  [ValidateSet("SERVICE_AUTO_START", "SERVICE_DEMAND_START", "SERVICE_DISABLED")]
  [string]$StartupType = "SERVICE_AUTO_START",
  [switch]$NoStart,
  [switch]$SkipRuntimeValidation
)

$ErrorActionPreference = "Stop"

function Resolve-NssmPath {
  param(
    [string]$ProjectRoot,
    [string]$PreferredPath
  )

  if (-not [string]::IsNullOrWhiteSpace($PreferredPath)) {
    if (-not (Test-Path $PreferredPath)) {
      throw "nssm.exe non trovato nel percorso specificato: '$PreferredPath'."
    }
    return (Resolve-Path $PreferredPath).Path
  }

  $candidatePaths = @()
  if ([Environment]::Is64BitOperatingSystem) {
    $candidatePaths += (Join-Path $ProjectRoot "tools\nssm\win64\nssm.exe")
  }
  $candidatePaths += @(
    (Join-Path $ProjectRoot "tools\nssm\win32\nssm.exe"),
    (Join-Path $ProjectRoot "nssm.exe")
  )

  $resolved = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ([string]::IsNullOrWhiteSpace($resolved)) {
    throw "nssm.exe non trovato. Cercato in 'tools\\nssm\\win64\\nssm.exe', 'tools\\nssm\\win32\\nssm.exe' e nella root del progetto."
  }

  return (Resolve-Path $resolved).Path
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-Nssm {
  param(
    [string]$Executable,
    [string[]]$Arguments
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Comando NSSM fallito ($LASTEXITCODE): $Executable $($Arguments -join ' ')"
  }
}

function Get-EnvMap {
  param([string]$EnvPath)

  $values = @{}
  if (-not (Test-Path $EnvPath)) {
    return $values
  }

  foreach ($line in Get-Content $EnvPath) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
      continue
    }

    $match = [regex]::Match($trimmed, '^([A-Z0-9_]+)=(.*)$')
    if ($match.Success) {
      $values[$match.Groups[1].Value] = $match.Groups[2].Value
    }
  }

  return $values
}

function Get-EnvValue {
  param(
    [hashtable]$EnvMap,
    [string]$Key,
    [string]$DefaultValue = ""
  )

  if ($EnvMap.ContainsKey($Key)) {
    return $EnvMap[$Key]
  }

  return $DefaultValue
}

function Resolve-RepoPath {
  param(
    [string]$ProjectRoot,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($Value)) {
    return $Value
  }

  return Join-Path $ProjectRoot $Value
}

function Assert-RuntimeConfiguration {
  param(
    [string]$ProjectRoot,
    [string]$EnvPath
  )

  $envMap = Get-EnvMap -EnvPath $EnvPath
  $nodeEnv = Get-EnvValue -EnvMap $envMap -Key 'NODE_ENV' -DefaultValue 'development'

  if ($nodeEnv -eq 'production') {
    if ((Get-EnvValue -EnvMap $envMap -Key 'JWT_SECRET') -eq 'change-me-in-production') {
      throw "Configurazione non valida per il servizio: JWT_SECRET è ancora il valore di default in ambiente production."
    }
    if ((Get-EnvValue -EnvMap $envMap -Key 'ADMIN_SESSION_SECRET') -eq 'change-me-in-production') {
      throw "Configurazione non valida per il servizio: ADMIN_SESSION_SECRET è ancora il valore di default in ambiente production."
    }
  }

  $httpsEnabled = ((Get-EnvValue -EnvMap $envMap -Key 'HTTPS_ENABLED' -DefaultValue 'false') -eq 'true')
  if ($httpsEnabled) {
    $certPath = Resolve-RepoPath -ProjectRoot $ProjectRoot -Value (Get-EnvValue -EnvMap $envMap -Key 'HTTPS_CERT_PATH' -DefaultValue '.\certs\cert.pem')
    $keyPath = Resolve-RepoPath -ProjectRoot $ProjectRoot -Value (Get-EnvValue -EnvMap $envMap -Key 'HTTPS_KEY_PATH' -DefaultValue '.\certs\key.pem')

    if (-not (Test-Path $certPath)) {
      throw "Configurazione non valida per il servizio: certificato HTTPS non trovato in '$certPath'."
    }
    if (-not (Test-Path $keyPath)) {
      throw "Configurazione non valida per il servizio: chiave HTTPS non trovata in '$keyPath'."
    }
  }
}

$NssmPath = Resolve-NssmPath -ProjectRoot $ProjectRoot -PreferredPath $NssmPath

if (-not (Test-IsAdministrator)) {
  throw "L'installazione o aggiornamento di un servizio Windows richiede una sessione PowerShell avviata come amministratore."
}

if (-not (Test-Path $NodePath)) {
  throw "node.exe non trovato in '$NodePath'."
}
$NodePath = (Resolve-Path $NodePath).Path

$serverPath = Join-Path $ProjectRoot "src\server.js"
if (-not (Test-Path $serverPath)) {
  throw "Impossibile trovare server.js in '$serverPath'. Verifica il percorso del progetto."
}
$serverPath = (Resolve-Path $serverPath).Path

if ([string]::IsNullOrWhiteSpace($LogDir)) {
  $LogDir = Join-Path $ProjectRoot "logs"
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogDir = (Resolve-Path $LogDir).Path

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
  $envExample = Join-Path $ProjectRoot ".env.example"
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile -Force
  }
}

if (-not $SkipRuntimeValidation) {
  Assert-RuntimeConfiguration -ProjectRoot $ProjectRoot -EnvPath $envFile
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $service) {
  Write-Host "Installazione servizio '$ServiceName' tramite NSSM..."
  Invoke-Nssm -Executable $NssmPath -Arguments @('install', $ServiceName, $NodePath, $serverPath)
} else {
  Write-Host "Servizio '$ServiceName' già presente. Aggiorno la configurazione NSSM..."
}

Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'Application', $NodePath)
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppParameters', $serverPath)
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppDirectory', $ProjectRoot)
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppStdout', (Join-Path $LogDir 'service-stdout.log'))
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppStderr', (Join-Path $LogDir 'service-stderr.log'))
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppRotateFiles', '1')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppRotateOnline', '1')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppRotateBytes', '1048576')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppExit', 'Default', 'Restart')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppThrottle', '1500')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'AppRestartDelay', '5000')
Invoke-Nssm -Executable $NssmPath -Arguments @('set', $ServiceName, 'Start', $StartupType)

& sc.exe config $ServiceName DisplayName= "$DisplayName" | Out-Null
& sc.exe description $ServiceName "$Description" | Out-Null

if ($NoStart) {
  Write-Host "Servizio '$ServiceName' installato/configurato. Avvio saltato per richiesta esplicita."
} else {
  Write-Host "Avvio del servizio '$ServiceName'..."
  Start-Service -Name $ServiceName
}

Get-Service -Name $ServiceName | Format-List Name,DisplayName,Status,StartType
