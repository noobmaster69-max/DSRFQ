@echo off
rem OneZera Ballooning Model (Bubble-V6, port 5999) - start at logon.
rem
rem Put this file in the Startup folder of the account that stays logged on
rem (Win+R, shell:startup). Bubble-V6 cannot be a Windows service: its licence
rem check needs a real console, which a service does not have - so it starts
rem with the desktop instead. Keep its window open; closing it stops the model.
rem
rem Waits a minute for the desktop and network, and does nothing if something
rem is already listening on 5999, so a second logon does not start a second copy.

set "BUBBLE_DIR=C:\Aizera\Bubble\Bubble-V6"

timeout /t 60 /nobreak >nul

netstat -ano | findstr /r /c:":5999 .*LISTENING" >nul
if %errorlevel%==0 exit /b 0

if not exist "%BUBBLE_DIR%\Bubble.exe" (
    echo Bubble.exe not found in %BUBBLE_DIR%
    timeout /t 30 >nul
    exit /b 1
)

start "OneZera Ballooning Model (5999) - keep this window open" /d "%BUBBLE_DIR%" /min "%BUBBLE_DIR%\Bubble.exe"
exit /b 0
