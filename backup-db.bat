@echo off
setlocal
cd /d "%~dp0"

set "DB_FILE=apps\web\orxoca.sqlite"
set "BACKUP_DIR=backups"

if not exist "%DB_FILE%" (
  echo No se encontro la base: %DB_FILE%
  pause
  exit /b 1
)

if not exist "%BACKUP_DIR%" (
  mkdir "%BACKUP_DIR%"
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "DEST=%BACKUP_DIR%\orxoca-%STAMP%.sqlite"

copy "%DB_FILE%" "%DEST%" >nul
if errorlevel 1 (
  echo Error al crear backup.
  pause
  exit /b 1
)

echo Backup generado: %DEST%
endlocal
