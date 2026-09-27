@echo off
cd /d "%~dp0.."
echo Creating Desktop Shortcut for HS Group Live Server...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$dirs = @('E:\Desktop', [Environment]::GetFolderPath('Desktop'), \"$HOME\OneDrive\Desktop\", \"$HOME\Desktop\"); " ^
  "foreach ($d in $dirs) { " ^
  "  if ($d -and (Test-Path $d)) { " ^
  "    $sc = $WshShell.CreateShortcut(\"$d\HS Group Live Server.lnk\"); " ^
  "    $sc.TargetPath = \"$((Get-Location).Path)\run-server.bat\"; " ^
  "    $sc.WorkingDirectory = \"$((Get-Location).Path)\"; " ^
  "    $sc.Description = \"Launch HS Group Delhi Live Server\"; " ^
  "    if (Test-Path \"$((Get-Location).Path)\favicon.ico\") { $sc.IconLocation = \"$((Get-Location).Path)\favicon.ico\"; } " ^
  "    $sc.Save(); " ^
  "    Write-Host \"Created shortcut in: $d\"; " ^
  "  } " ^
  "}"

echo.
echo =========================================================
echo   SUCCESS! "HS Group Live Server" shortcut created!
echo =========================================================
pause
