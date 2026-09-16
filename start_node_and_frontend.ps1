param(
    [switch]$Split
)

$rootDir = $PSScriptRoot

if ($Split) {
    Write-Host "Starting Node backend and Frontend in separate windows..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; bun run backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; bun run frontend"
} else {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " Starting Quran Verse Identifier (Node + Frontend)" -ForegroundColor Green
    Write-Host " Backend (Node):  http://localhost:8001" -ForegroundColor Magenta
    Write-Host " Frontend (Vite): http://localhost:3000" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan
    Set-Location $rootDir
    bun run dev
}
