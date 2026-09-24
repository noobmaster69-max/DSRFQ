@echo off
REM Double-clickable entry point. Re-launches itself elevated, because almost
REM every step needs it - installing into Program Files, registering services,
REM writing to ProgramData - and failing three steps in with an access-denied
REM nobody reads is worse than asking up front.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator rights...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Bootstrap.ps1" %*
echo.
pause
