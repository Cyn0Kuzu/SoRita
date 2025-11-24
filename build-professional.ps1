# Professional Build Script for SoRita (PowerShell)
Write-Host "🚀 Starting professional build process for SoRita..." -ForegroundColor Green

# Set environment variables
$env:NODE_ENV = "production"
$env:EAS_NO_VCS = "1"

function Write-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠️ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "❌ $message" -ForegroundColor Red
}

try {
    # Check prerequisites
    Write-Success "Checking prerequisites..."
    
    # Check if EAS CLI is installed
    if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
        Write-Warning "EAS CLI not found. Installing..."
        npm install -g @expo/eas-cli
    }

    # Clean previous builds
    Write-Success "Cleaning previous builds..."
    if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
    if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" }
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    
    Write-Success "Fixing dependencies..."
    npx expo install --fix

    # Run tests (if available)
    Write-Success "Running tests..."
    try {
        npm run test 2>$null
    } catch {
        Write-Warning "Tests failed or not configured"
    }

    # Run linting (if available)
    Write-Success "Running linting..."
    try {
        npm run lint 2>$null
    } catch {
        Write-Warning "Linting failed or not configured"
    }

    # Validate app configuration
    Write-Success "Validating app configuration..."
    npx expo config --type public | Out-Null

    # Prebuild
    Write-Success "Running prebuild..."
    npx expo prebuild --clean --platform android

    # Build with EAS
    Write-Success "Starting EAS build for Android..."
    npx eas build --platform android --profile production --non-interactive

    Write-Success "Build process completed! 🎉"
    Write-Host "Check your EAS dashboard for build status: https://expo.dev/accounts/cayan/projects/sorita/builds" -ForegroundColor Cyan

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
}
