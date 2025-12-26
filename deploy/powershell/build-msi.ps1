$wixToolset = $env:WIX
if (-not $wixToolset) { Write-Host "WIX not configured"; exit 1 }
$wxs = "$PSScriptRoot\..\wix\OnlyUserActivity.Agent.wxs"
$light = Join-Path $wixToolset "bin\light.exe"
$candle = Join-Path $wixToolset "bin\candle.exe"
& $candle $wxs
& $light "OnlyUserActivity.Agent.wixobj" -o "OnlyUserActivity.Agent.msi"
