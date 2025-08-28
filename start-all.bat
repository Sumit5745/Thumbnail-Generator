@echo off
echo 🚀 Starting Thumbnail Generator Application...
echo ============================================

echo.
echo 1. Starting MongoDB and Redis...
docker compose up -d mongodb redis
timeout /t 3 /nobreak >nul

echo.
echo 2. Starting API Server...
start "API Server" cmd /k "npm run dev:server"
timeout /t 5 /nobreak >nul

echo.
echo 3. Starting Worker...
start "Worker" cmd /k "npm run dev:worker"
timeout /t 3 /nobreak >nul

echo.
echo 4. Starting Frontend...
start "Frontend" cmd /k "npm run dev:frontend"
timeout /t 5 /nobreak >nul

echo.
echo ✅ All services started!
echo.
echo 📱 Frontend: http://localhost:3001
echo 🔧 API Server: http://localhost:3000
echo 🗄️ MongoDB: mongodb://localhost:27017
echo 🔴 Redis: redis://localhost:6379
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo 🛑 Stopping all services...
taskkill /f /im node.exe >nul 2>&1
docker compose down
echo ✅ All services stopped.