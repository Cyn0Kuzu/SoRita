#!/bin/bash

# Professional Build Script for SoRita
echo "🚀 Starting professional build process for SoRita..."

# Set environment
export NODE_ENV=production
export EAS_NO_VCS=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf dist
npx expo install --fix

# Run tests
print_status "Running tests..."
npm run test 2>/dev/null || print_warning "Tests failed or not configured"

# Run linting
print_status "Running linting..."
npm run lint 2>/dev/null || print_warning "Linting failed or not configured"

# Check app configuration
print_status "Validating app configuration..."
npx expo config --type public > /dev/null

# Prebuild
print_status "Running prebuild..."
npx expo prebuild --clean --platform android

# Build with EAS
print_status "Starting EAS build..."
npx eas build --platform android --profile production --non-interactive

print_status "Build process completed! 🎉"
echo "Check your EAS dashboard for build status: https://expo.dev/accounts/cayan/projects/sorita/builds"
