# From repo root:  pwsh -File scripts/verify-build.ps1
$ErrorActionPreference = "Stop"
$Root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
Set-Location $Root
Write-Host "==> Hearth OS: lint + build (from $Root)" -ForegroundColor Cyan
npm run lint
npm run build
Write-Host "==> OK. Full stack: start API :3001 + router :4000, then: npm test" -ForegroundColor Green
