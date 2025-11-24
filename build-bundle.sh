#!/bin/bash
# Alternative build approach using Expo CLI directly

cd "$(dirname "$0")"

echo "🔧 Building React Native bundle directly..."

# Set environment for production build
export NODE_ENV=production
export EXPO_NO_METRO_WATCH=1

# Generate the bundle using expo export
npx expo export --platform android --output-dir ./android-export --clear

# Copy the bundle to Android assets
mkdir -p ./android/app/src/main/assets
cp -r ./android-export/_expo/static/js/* ./android/app/src/main/assets/

echo "✅ Bundle created successfully"
