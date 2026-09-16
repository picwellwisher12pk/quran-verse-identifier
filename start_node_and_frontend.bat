@echo off
echo ==================================================
echo  Starting Quran Verse Identifier (Node + Frontend)
echo  Backend (Node):  http://localhost:8001
echo  Frontend (Vite): http://localhost:3000
echo ==================================================
echo.
cd /d "%~dp0"
bun run dev
pause
