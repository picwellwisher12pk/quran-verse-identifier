@echo off
title Quran Verse Identifier - Live Cloudflare Public Tunnel
echo ============================================================
echo   Quran Verse Identifier - Starting Server & Public Tunnel
echo ============================================================
echo.

echo 1. Starting FastAPI & React Application...
start "Quran App Server" /min python run.py

echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

echo 2. Launching Cloudflare Public HTTPS Tunnel...
echo.
.\cloudflared.exe tunnel --url http://localhost:7860
pause