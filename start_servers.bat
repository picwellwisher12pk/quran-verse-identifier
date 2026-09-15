@echo off
echo ====================================
echo Starting Quran Verse Identifier
echo ====================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop both servers
echo ====================================

echo Starting backend server...
cd backend
start "Backend Server" cmd /k "venv\Scripts\activate.bat && python run.py"

timeout /t 3 /nobreak > nul

echo Starting frontend server...
cd ..\frontend
start "Frontend Server" cmd /k "bun start"

echo.
echo Servers are starting in separate windows...
echo Check the new command prompt windows for server status.
echo.

pause