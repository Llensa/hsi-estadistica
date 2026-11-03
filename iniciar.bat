@echo off
setlocal
cd /d "%~dp0"
title Estadisticas medicas
echo ============================================
echo   Estadisticas medicas - HSI
echo ============================================
echo.

if not exist "package.json" (
  echo No se encuentra package.json en esta carpeta.
  echo Descomprimi el zip completo y abri iniciar.bat desde la carpeta descomprimida.
  goto :fin
)

where node >nul 2>nul
if errorlevel 1 (
  echo No esta instalado Node.js.
  echo Instalalo desde https://nodejs.org ^(boton LTS^), reinicia la PC y volve a abrir este archivo.
  goto :fin
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo Node.js %NODEV%

rem Restos de la configuracion vieja de Tailwind v3 rompen la compilacion
if exist "tailwind.config.js" del /q "tailwind.config.js"

set FALTA=0
if not exist "node_modules\@angular\core" set FALTA=1
if not exist "node_modules\@tailwindcss\postcss" set FALTA=1
if not exist "node_modules\xlsx" set FALTA=1

if "%FALTA%"=="1" (
  echo.
  echo Instalando dependencias. La primera vez tarda unos minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo La instalacion fallo. Probando con la version de xlsx publicada en npm...
    call npm install xlsx@0.18.5
    if errorlevel 1 (
      echo.
      echo No se pudo instalar. Copia todo el texto de esta ventana y pasalo para revisarlo.
      goto :fin
    )
  )
)

echo.
echo Iniciando. Cuando termine de compilar se abre http://localhost:4200
echo Para cerrar la app, cerra esta ventana.
echo.
call npm start -- --open

:fin
echo.
pause
