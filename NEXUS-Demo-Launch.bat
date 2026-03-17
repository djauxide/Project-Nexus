@echo off
title NEXUS v6 Demo Launcher
echo.
echo  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
echo  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
echo  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
echo  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
echo  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
echo  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
echo.
echo  Broadcast IP Platform v6 — Demo Launcher
echo  ─────────────────────────────────────────
echo.
echo  [1] Demo only  (port 3000, simulated data)
echo  [2] Full stack (port 3000 UI + port 8080 API backend)
echo  [3] Exit
echo.
set /p CHOICE="  Choose [1/2/3]: "

if "%CHOICE%"=="2" goto fullstack
if "%CHOICE%"=="3" exit /b 0

:demo
echo.
echo  Starting demo server on http://localhost:3000 ...
echo  Password: nexus2024
echo.
start "NEXUS Demo" cmd /k "node backend\api\serve-local.js"
timeout /t 2 >nul
start "" "http://localhost:3000"
echo  Done. Close the NEXUS Demo window to stop.
pause >nul
exit /b 0

:fullstack
echo.
echo  Starting API backend on port 8080...
start "NEXUS API" cmd /k "cd backend\api && npm run dev"
timeout /t 3 >nul
echo  Starting demo UI on port 3000...
start "NEXUS Demo" cmd /k "node backend\api\serve-local.js"
timeout /t 2 >nul
start "" "http://localhost:3000"
echo.
echo  UI:      http://localhost:3000  (password: nexus2024)
echo  API:     http://localhost:8080
echo  WS:      ws://localhost:8080/ws/control
echo.
echo  Status bar shows LIVE when WebSocket connects to backend.
echo  Close both terminal windows to stop.
pause >nul
exit /b 0
