@echo off
echo ========================================
echo   THUMBNAIL GENERATOR - LOCAL STARTUP
echo ========================================
echo.

echo Starting MongoDB and Redis with Docker...
docker compose up -d mongodb redis

echo.
echo Waiting for databases to be ready...
timeout /t 10 /nobreak > nul

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "npm run dev:server"

echo.
echo Starting Worker Process...
start "Worker Process" cmd /k "npm run dev:worker"

echo.
echo Starting Frontend...
start "Frontend" cmd /k "npm run dev:frontend"

echo.
echo ========================================
echo   SERVICES STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Frontend: http://localhost:3001
echo Backend API: http://localhost:3000
echo MongoDB: localhost:27017
echo Redis: localhost:6379
echo.
echo Press any key to stop all services...
pause > nul

echo.
echo Stopping services...
taskkill /f /im node.exe > nul 2>&1
docker compose down

echo.
echo All services stopped.
pause
