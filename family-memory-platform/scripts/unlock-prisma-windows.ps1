# Run in PowerShell when WSL `pnpm api:prisma` fails with EPERM on query_engine-windows.dll.node
# Unlocks Prisma engines on D:\ before regenerating from Ubuntu.

$ErrorActionPreference = "Stop"
$root = "D:\CURSOR\FAMILY TREE\family-memory-platform"

Write-Host "Stopping Node.js processes (Windows)..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Removing Prisma client engines under node_modules..."
Get-ChildItem -Path (Join-Path $root "node_modules") -Recurse -Directory -Filter ".prisma" -ErrorAction SilentlyContinue |
  ForEach-Object {
    $client = Join-Path $_.FullName "client"
    if (Test-Path $client) {
      Remove-Item -Path (Join-Path $client "query_engine*") -Force -ErrorAction SilentlyContinue
      Remove-Item -Path (Join-Path $client "*.tmp*") -Force -ErrorAction SilentlyContinue
    }
  }

Write-Host "OK. Now in Ubuntu/WSL run: cd .../family-memory-platform && pnpm api:prisma"
