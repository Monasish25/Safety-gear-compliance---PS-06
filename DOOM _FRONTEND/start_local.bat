@echo off
echo ========================================================
echo   SAFEGEAR COMPLIANCE AI - LOCAL RUNNER (ZERO DOCKER)
echo ========================================================
echo.
echo Starting FastAPI Backend on port 8000...
start "SafeGear Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Vite Frontend on port 5173...
start "SafeGear Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening Browser at http://localhost:5173...
start http://localhost:5173

echo.
echo System started successfully!
echo Backend API Docs: http://localhost:8000/docs
echo Frontend UI:      http://localhost:5173
echo.
pause
