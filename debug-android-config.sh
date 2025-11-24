#!/bin/bash
# Create a summary of all key Android configuration files for debugging

echo "=== Android Build Configuration Summary ==="
echo ""

echo "=== gradle.properties ==="
cat android/gradle.properties
echo ""

echo "=== build.gradle (root) ==="
cat android/build.gradle  
echo ""

echo "=== app/build.gradle ==="
cat android/app/build.gradle
echo ""

echo "=== settings.gradle ==="
cat android/settings.gradle
echo ""

echo "=== proguard-rules.pro ==="
cat android/app/proguard-rules.pro
echo ""

echo "=== package.json (expo/react-native versions) ==="
grep -E "(expo|react-native)" package.json
echo ""

echo "=== app.json (expo config) ==="
grep -A 20 -B 5 "expo" app.json
echo ""
