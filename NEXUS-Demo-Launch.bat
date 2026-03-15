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

set "DEMO=%~dp0backend\api\nexus-demo.html"

if not exist "%DEMO%" (
  echo  [ERROR] nexus-demo.html not found at:
  echo  %DEMO%
  echo.
  pause
  exit /b 1
)

echo  Opening NEXUS v4 demo in your browser...
echo  File: %DEMO%
echo.

start "" "%DEMO%"

echo  Done. The demo should now be open in your browser.
echo  Press any key to close this window.
pause >nul
