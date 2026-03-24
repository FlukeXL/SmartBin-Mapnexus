@echo off
title MapNexus - START
color 0b

echo ======================================================
echo    MapNexus - Smart City (2-Window Mode)
echo ======================================================

echo [1/3] STOPPING PREVIOUS...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1

echo [2/3] CHECKING TOOL...
if not exist "cloudflared.exe" (
    echo [!] Downloading cloudflared...
    powershell -Command "Invoke-WebRequest https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe"
)

echo [3/3] STARTING EVERYTHING...
echo ------------------------------------------------------
echo 1. Launching Server in NEW window...
start "MapNexus Server" cmd /c "npm start"

echo 2. Launching Public Link in THIS window...
echo ------------------------------------------------------
echo Look for the link ending in ".trycloudflare.com" below:
echo.

cloudflared.exe tunnel --url http://localhost:3000

echo.
echo ------------------------------------------------------
echo SERVER STOPPED.
pause