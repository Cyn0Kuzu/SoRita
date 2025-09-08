// This script creates a patch for expo-constants build.gradle to ensure it has required values
const fs = require('fs');
const path = require('path');

const expoConstantsPath = path.join(__dirname, 'node_modules', 'expo-constants', 'android', 'build.gradle');

if (fs.existsSync(expoConstantsPath)) {
  let content = fs.readFileSync(expoConstantsPath, 'utf-8');
  
  // Replace the conditional check to force default values
  const patchedContent = content.replace(
    /if \(!safeExtGet\("expoProvidesDefaultConfig", false\)\) \{[\s\S]*?compileSdkVersion[\s\S]*?\}/,
    `android {
    compileSdkVersion 34
    
    defaultConfig {
      minSdkVersion 23
      targetSdkVersion 34
    }
    
    publishing {
      singleVariant("release") {
        withSourcesJar()
      }
    }
    
    lintOptions {
      abortOnError false
    }
  }`
  );
  
  if (patchedContent !== content) {
    fs.writeFileSync(expoConstantsPath, patchedContent);
    console.log('✅ Patched expo-constants build.gradle with hardcoded SDK versions');
  } else {
    console.log('ℹ️ expo-constants build.gradle already patched or pattern not found');
  }
} else {
  console.log('⚠️ expo-constants build.gradle not found');
}
