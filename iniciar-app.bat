@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo node_modules no encontrado. Ejecutando npm install...
  call npm install
  if errorlevel 1 (
    echo Error al instalar dependencias.
    pause
    exit /b 1
  )
)

start "" http://localhost:3000
echo Iniciando app en modo desarrollo...
call npm run dev
