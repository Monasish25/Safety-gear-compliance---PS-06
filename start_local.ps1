Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SAFEGEAR COMPLIANCE AI - LOCAL RUNNER (ZERO DOCKER)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 3

Write-Host "Starting Vite React Frontend on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/DOOM_FRONTEND'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Launching Browser at http://localhost:5173..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "SafeGear Vision AI is running!" -ForegroundColor Cyan
Write-Host "Backend API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "Frontend UI:      http://localhost:5173" -ForegroundColor Gray
