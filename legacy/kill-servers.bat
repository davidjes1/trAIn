@echo off
title "Stop FIT Parser Servers"
echo =========================================
echo      Stop FIT Parser Servers
echo =========================================
echo.

echo 🔍 Finding processes using ports 3003 and 3004...
echo.

echo Port 3003 (Frontend):
netstat -ano | findstr :3003

echo.
echo Port 3004 (Backend):
netstat -ano | findstr :3004

echo.
echo 🛑 Stopping all Node.js processes...
taskkill /IM node.exe /F 2>nul
taskkill /IM "npm.cmd" /F 2>nul
taskkill /IM "npm" /F 2>nul

echo.
echo 🔍 Checking if ports are now free...
timeout /t 2 /nobreak > nul

echo.
echo Port 3003 status:
netstat -ano | findstr :3003
if %ERRORLEVEL% NEQ 0 echo ✅ Port 3003 is free!

echo.
echo Port 3004 status:
netstat -ano | findstr :3004
if %ERRORLEVEL% NEQ 0 echo ✅ Port 3004 is free!

echo.
echo ✅ Servers stopped! You can now run start-both.bat
echo.
pause