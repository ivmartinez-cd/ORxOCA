@echo off
setlocal

cd /d "%~dp0"
echo Ejecutando build de produccion...
call npm run build

if errorlevel 1 (
  echo.
  echo Build con errores.
  pause
  exit /b 1
)

echo.
echo Build finalizado correctamente.
pause
