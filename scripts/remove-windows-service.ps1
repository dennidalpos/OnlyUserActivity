param(
  [string]$ServiceName = "OnlyUserActivity",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$NssmPath = "",
  [string]$LogDir = "",
  [int]$StopTimeoutSeconds = 15,
  [switch]$RemoveLogs
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

$NssmPath = Resolve-NssmPath -ProjectRoot $ProjectRoot -PreferredPath $NssmPath

if (-not (Test-IsAdministrator)) {
  throw "La rimozione di un servizio Windows richiede una sessione PowerShell avviata come amministratore."
}

if ([string]::IsNullOrWhiteSpace($LogDir)) {
  $LogDir = Join-Path $ProjectRoot "logs"
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Host "Servizio '$ServiceName' non trovato. Nessuna rimozione necessaria."
  return
}

if ($service.Status -ne 'Stopped') {
  Write-Host "Arresto del servizio '$ServiceName'..."
  try {
    Stop-Service -Name $ServiceName -ErrorAction Stop
  } catch {
    Write-Warning "Stop-Service ha fallito, provo con NSSM stop."
    try {
      Invoke-Nssm -Executable $NssmPath -Arguments @('stop', $ServiceName)
    } catch {
      Write-Warning "NSSM stop ha fallito: $($_.Exception.Message)"
    }
  }

  try {
    $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds($StopTimeoutSeconds))
  } catch {
    Write-Warning "Il servizio non si è arrestato entro $StopTimeoutSeconds secondi."
  }
}

Write-Host "Rimozione del servizio '$ServiceName'..."
try {
  Invoke-Nssm -Executable $NssmPath -Arguments @('remove', $ServiceName, 'confirm')
} catch {
  Write-Warning "Rimozione via NSSM fallita, provo con sc.exe delete."
  & sc.exe delete $ServiceName | Out-Null
}

if ($RemoveLogs) {
  $stdoutLog = Join-Path $LogDir 'service-stdout.log'
  $stderrLog = Join-Path $LogDir 'service-stderr.log'
  Remove-Item $stdoutLog, $stderrLog -Force -ErrorAction SilentlyContinue
}

Write-Host "Servizio '$ServiceName' rimosso."
