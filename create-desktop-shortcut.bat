@echo off
cd /d "%~dp0"
echo Creating Desktop Shortcut for HS Group Live Server...

set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\HS Group Live Server.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0run-server.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "Launch HS Group Delhi Multi-Threaded Attendance Live Server" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo =========================================================
echo   SUCCESS! "HS Group Live Server" shortcut created on Desktop!
echo =========================================================
pause
