@echo off
title NEXUS v7 Demo Launcher
echo.
echo  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
echo  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
echo  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
echo  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
echo  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
echo  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
echo.
echo  Broadcast Orchestration Platform v7
echo  ─────────────────────────────────────────────
echo.
echo  [1] Local only        (port 3000, demo mode)
echo  [2] Local + Public    (port 3000 + Cloudflare tunnel)
echo  [3] Full stack        (UI + API backend + tunnel)
echo  [4] Exit
echo.
set /p CHOICE="  Choose [1/2/3/4]: "

if "%CHOICE%"=="2" goto tunnel
if "%CHOICE%"=="3" goto fullstack
if "%CHOICE%"=="4" exit /b 0

:local
echo.
echo  Starting NEXUS v7 on http://localhost:3000 ...
echo  Password: nexus2024
echo.
start "NEXUS v7 Local" cmd /k "node backend\api\serve-local.js"
timeout /t 2 >nul
start "" "http://localhost:3000"
echo  Done. Close the NEXUS window to stop.
pause >nul
exit /b 0

:tunnel
echo.
echo  Starting NEXUS v7 with Cloudflare public tunnel...
echo  Password: nexus2024
echo.
start "NEXUS v7 Tunnel" cmd /k "node backend\api\serve-tunnel.js"
echo.
echo  Watch the terminal window for your PUBLIC URL.
echo  Local:  http://localhost:3000
echo  Public: see tunnel window (trycloudflare.com)
echo.
pause >nul
exit /b 0

:fullstack
echo.
echo  Starting full NEXUS v7 stack...
echo.
echo  [1/3] Starting API backend (port 8080)...
start "NEXUS API" cmd /k "cd backend\api && node dist\server.js"
timeout /t 3 >nul
echo  [2/3] Starting UI server with tunnel (port 3000)...
start "NEXUS v7 UI" cmd /k "node backend\api\serve-tunnel.js"
timeout /t 2 >nul
echo  [3/3] Opening browser...
start "" "http://localhost:3000"
echo.
echo  ─────────────────────────────────────────────
echo  UI (local):   http://localhost:3000
echo  API:          http://localhost:8080
echo  WebSocket:    ws://localhost:8080/ws/control
echo  GitHub Pages: https://djauxide.github.io/Project-Nexus/
echo  Password:     nexus2024
echo  ─────────────────────────────────────────────
echo.
echo  In the UI, enter http://localhost:8080 as the API endpoint
echo  to connect to the live backend with real WebSocket data.
echo.
echo  Close terminal windows to stop all services.
pause >nul
exit /b 0
