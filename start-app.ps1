# Start the backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\GSheets_Form\tedx-internship-form\server; npm start"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start the frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\GSheets_Form\tedx-internship-form; npm start"

Write-Host "`nBoth servers are starting..." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:5000" -ForegroundColor Yellow
