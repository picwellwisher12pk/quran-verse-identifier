@echo off
echo Starting Quran Verse Identifier Node.js Backend on port 8001...
cd /d "%~dp0backend-node"
where bun >nul 2>nul
if %errorlevel% equ 0 (
    echo Using Bun runtime...
    bun run src/index.js
) else (
    echo Using Node.js runtime...
    node src/index.js
)
pause
