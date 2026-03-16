@echo off
title NEXUS v4 Demo Launcher
echo.
echo  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
echo  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
echo  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
echo  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
echo  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
echo  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
echo.
echo  Broadcast IP Platform v4 — Demo Launcher
echo  ─────────────────────────────────────────
echo.
echo  [1] Open demo locally in browser
echo  [2] Deploy demo to Netlify (get public URL for client)
echo  [3] Exit
echo.
set /p CHOICE="  Choose [1/2/3]: "

if "%CHOICE%"=="2" goto deploy
if "%CHOICE%"=="3" exit /b 0

:local
set "DEMO=%~dp0backend\api\nexus-demo.html"
if not exist "%DEMO%" (
  echo  [ERROR] nexus-demo.html not found. Run: node backend\api\gen-demo.js
  pause & exit /b 1
)
echo.
echo  Opening demo locally...
start "" "%DEMO%"
echo  Done. Press any key to close.
pause >nul
exit /b 0

:deploy
echo.
echo  ── Netlify Deploy ──────────────────────────────────────
echo  Get a free token at:
echo  https://app.netlify.com/user/applications#personal-access-tokens
echo.
set /p TOKEN="  Paste your Netlify token: "
if "%TOKEN%"=="" (
  echo  [ERROR] No token provided.
  pause & exit /b 1
)
set /p SITENAME="  Site name (leave blank for auto): "
echo.
echo  Deploying...
if "%SITENAME%"=="" (
  node "%~dp0scripts\deploy-demo.js" %TOKEN%
) else (
  node "%~dp0scripts\deploy-demo.js" %TOKEN% %SITENAME%
)
echo.
pause
exit /b 0
