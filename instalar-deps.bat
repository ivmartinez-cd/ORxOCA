@echo off
setlocal

cd /d "%~dp0"
echo Instalando dependencias...
npm install

if errorlevel 1 (
  echo.
  echo Error instalando dependencias.
  pause
  exit /b 1
)

echo.
echo Dependencias instaladas correctamente.
pause
