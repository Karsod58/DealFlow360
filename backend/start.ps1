# Start DealFlow360 Backend Server

Write-Host "🚀 Starting DealFlow360 Backend..." -ForegroundColor Cyan

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Start server
Write-Host "📡 Server starting at http://localhost:8000" -ForegroundColor Green
Write-Host "📚 API Documentation at http://localhost:8000/docs" -ForegroundColor Green
Write-Host "" 
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --reload --port 8000
