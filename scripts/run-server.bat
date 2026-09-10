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

set PYTHON_CMD=
if exist "C:\Users\heman\AppData\Local\Programs\Python\Python313\python.exe" (
    set PYTHON_CMD="C:\Users\heman\AppData\Local\Programs\Python\Python313\python.exe"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
    ) else (
        where py >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py
        )
    )
)

if not "%PYTHON_CMD%"=="" (
    echo Starting Python Multi-Threaded HTTP Server...
    start "" /min cmd /c "timeout /t 2 /nobreak >nul && start "" http://localhost:8080"
    %PYTHON_CMD% -u "%~dp0server.py"
    goto end
)

echo Opening index.html directly...
start "" "%~dp0index.html"

:end
pause
