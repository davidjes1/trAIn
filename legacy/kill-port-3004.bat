@echo off
echo Stopping processes using port 3004...

echo Finding processes on port 3004:
netstat -ano | findstr :3004

echo.
echo Killing processes...
taskkill /PID 11624 /F 2>nul
taskkill /PID 35056 /F 2>nul

echo.
echo Checking if port 3004 is now free:
netstat -ano | findstr :3004

if %ERRORLEVEL% EQU 0 (
    echo Port 3004 is still in use by some processes.
) else (
    echo ✅ Port 3004 is now free!
)

pause