# Frontend Setup Script for Windows
# Run this from the job_applications directory

Write-Host "🚀 Setting up Job Application Workflow Frontend" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check Node.js
Write-Host "`n📦 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navigate to frontend
Set-Location -Path "frontend"

# Install dependencies
Write-Host "`n📥 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ Frontend setup complete!" -ForegroundColor Green
Write-Host "`nTo start the frontend:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "`nThe app will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`n⚠️  Make sure the backend is running first:" -ForegroundColor Yellow
Write-Host "  python -m uvicorn backend.main:app --reload" -ForegroundColor White
