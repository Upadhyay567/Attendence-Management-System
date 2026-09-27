@echo off
cd /d "%~dp0"
title HS Group Delhi Live Server
echo ====================================================
echo   Starting HS Group Delhi Live Server
echo ====================================================

where node >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting Node.js Express Live Server...
    start "" /min cmd /c "timeout /t 2 /nobreak >nul && start "" http://localhost:8080"
    node server.js
    goto end
)

echo [ERROR] Node.js is not found in your PATH.
echo Please install Node.js 18+ to launch the server.

:end
pause
