$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'cookbook-migration'

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

Write-Host "Copying cookbook snapshot and raw data into $outDir..."

$publicCookbook = Join-Path $root 'public\cookbook'
$rawData = Join-Path $root 'cookbook\repo\data'

if (Test-Path $publicCookbook) {
  Copy-Item -Path $publicCookbook -Destination (Join-Path $outDir 'public-cookbook') -Recurse -Force
} else {
  Write-Warning "Missing $publicCookbook"
}

if (Test-Path $rawData) {
  Copy-Item -Path $rawData -Destination (Join-Path $outDir 'raw-data') -Recurse -Force
} else {
  Write-Warning "Missing $rawData"
}

Write-Host "Export complete."
