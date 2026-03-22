@echo off
setlocal
cd /d "%~dp0"

echo ===============================
echo OR x OCA - Modo red interna
echo ===============================
echo.

if not exist "node_modules" (
  echo Instalando dependencias...
  npm install
  if errorlevel 1 (
    echo Error instalando dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando app en red local (puerto 3000)...
echo Acceso desde otras PCs: http://IP_DE_ESTA_PC:3000
echo.
npm run dev -w web -- --hostname 0.0.0.0 --port 3000

endlocal
