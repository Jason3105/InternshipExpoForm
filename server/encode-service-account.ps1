# Script to properly encode service account key for Render deployment
# Run this in PowerShell from the server directory

$jsonPath = "applications-form-testing-5a1cfd770b20.json"

if (Test-Path $jsonPath) {
    # Read the JSON file
    $jsonContent = Get-Content $jsonPath -Raw
    
    # Convert to bytes and then to base64
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # Output the base64 string
    Write-Host "`n=== SERVICE_ACCOUNT_KEY (Base64) ===`n" -ForegroundColor Green
    Write-Host $base64
    Write-Host "`n=== Copy the above text and paste it as SERVICE_ACCOUNT_KEY in Render ===" -ForegroundColor Yellow
    
    # Also save to a file for easy copying
    $base64 | Out-File "service-account-base64.txt" -NoNewline
    Write-Host "`nAlso saved to: service-account-base64.txt" -ForegroundColor Cyan
    
} else {
    Write-Host "Error: $jsonPath not found!" -ForegroundColor Red
    Write-Host "Make sure you run this script from the server directory" -ForegroundColor Red
}
