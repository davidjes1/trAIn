@echo off
title "FIT File Parser - Startup"
echo =========================================
echo    FIT File Parser - Server Startup
echo =========================================
echo.

echo 🚀 Starting Google Sheets API Server...
start "Google Sheets API Server" cmd /k "cd /d %~dp0 && echo Starting server... && npm run server && echo Server stopped. Press any key to close. && pause"

echo ⏳ Waiting 5 seconds for server to initialize...
timeout /t 5 /nobreak > nul

echo 🌐 Starting Frontend Development Server...
start "Frontend Dev Server" cmd /k "cd /d %~dp0 && echo Starting frontend... && npm run dev && echo Frontend stopped. Press any key to close. && pause"

echo.
echo ✅ Both servers are starting in separate windows:
echo    📊 Backend (Google Sheets API): http://localhost:3004
echo    🌐 Frontend (Web App): http://localhost:3003
echo.
echo 💡 Instructions:
echo    1. Wait for both servers to fully start
echo    2. Open http://localhost:3003 in your browser
echo    3. Upload a .fit file and test the Google Sheets integration
echo.
echo ⚠️  Keep both command windows open while using the app!
echo    Close this window when you're done (servers will keep running).
echo.
pause