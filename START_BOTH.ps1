# Start both frontend and backend servers

Write-Host "🚀 Starting DealFlow360 Full Stack Application..." -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Write-Host "📡 Starting Backend Server (http://localhost:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\start.ps1"

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start frontend in new window
Write-Host "🎨 Starting Frontend Server (http://localhost:3000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: rep@dealflow.com" -ForegroundColor Cyan
Write-Host "  Password: password123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers." -ForegroundColor Magenta
