# Setup and Run Script for Job Application Workflow Backend
# Track 2: Local Web UI - Windows PowerShell

# ============================================================================
# Configuration
# ============================================================================

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = $PSScriptRoot
$VenvPath = Join-Path $ProjectRoot "venv"

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║     Job Application Workflow - Backend Setup                 ║
║     Track 2: Local Web UI                                    ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ============================================================================
# Check Python Virtual Environment
# ============================================================================

Write-Host "📁 Project Root: $ProjectRoot" -ForegroundColor Yellow
Write-Host "📁 Backend Dir: $BackendDir" -ForegroundColor Yellow

if (Test-Path (Join-Path $VenvPath "Scripts\Activate.ps1")) {
    Write-Host "✅ Virtual environment found" -ForegroundColor Green
    
    # Activate venv
    Write-Host "`n🔄 Activating virtual environment..." -ForegroundColor Cyan
    & (Join-Path $VenvPath "Scripts\Activate.ps1")
} else {
    Write-Host "❌ Virtual environment not found at: $VenvPath" -ForegroundColor Red
    Write-Host "   Please create it first: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Install Dependencies
# ============================================================================

Write-Host "`n📦 Checking/Installing FastAPI dependencies..." -ForegroundColor Cyan

# Check if FastAPI is installed
$FastAPIInstalled = pip show fastapi 2>$null
if (-not $FastAPIInstalled) {
    Write-Host "   Installing FastAPI and dependencies..." -ForegroundColor Yellow
    pip install fastapi uvicorn[standard] python-multipart websockets pydantic
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ FastAPI already installed" -ForegroundColor Green
}

# ============================================================================
# Verify Ollama
# ============================================================================

Write-Host "`n🤖 Checking Ollama availability..." -ForegroundColor Cyan

try {
    $OllamaList = ollama list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Ollama is running" -ForegroundColor Green
        Write-Host "   Available models:" -ForegroundColor Gray
        $OllamaList | Select-Object -First 5 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "   ⚠️ Ollama not responding. Start it with: ollama serve" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Ollama not found. Install from: https://ollama.ai" -ForegroundColor Yellow
}

# ============================================================================
# Start Server
# ============================================================================

Write-Host "`n🚀 Starting FastAPI server..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`n   Press Ctrl+C to stop the server.`n" -ForegroundColor Gray

# Change to project root for imports to work
Set-Location $ProjectRoot

# Start the server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
