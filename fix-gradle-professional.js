/**
 * Professional Gradle Fix Script for SoRita Android Build
 * Fixes all Maven publication, SDK version, and Kotlin issues systematically
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Professional Android Build Fix...\n');

const workingDir = process.cwd();
const nodeModulesPath = path.join(workingDir, 'node_modules');

// Fix function for expo-constants
function fixExpoConstants() {
  console.log('🔧 Fixing expo-constants...');
  
  const expoConstantsPath = path.join(nodeModulesPath, 'expo-constants', 'android', 'build.gradle');
  
  if (!fs.existsSync(expoConstantsPath)) {
    console.log('❌ expo-constants not found');
    return false;
  }

  let content = fs.readFileSync(expoConstantsPath, 'utf-8');
  
  // Fix getKotlinVersion function
  content = content.replace(
    /ext\.getKotlinVersion\s*=\s*\{[\s\S]*?\}/g,
    'ext.getKotlinVersion = { "1.9.23" }'
  );
  
  // Fix SDK versions
  content = content.replace(
    /compileSdkVersion safeExtGet\("compileSdkVersion", 34\)/g,
    'compileSdkVersion 34'
  ).replace(
    /minSdkVersion safeExtGet\("minSdkVersion", 23\)/g,
    'minSdkVersion 23'
  ).replace(
    /targetSdkVersion safeExtGet\("targetSdkVersion", 34\)/g,
    'targetSdkVersion 34'
  );
  
  // Remove duplicate publishing blocks - keep only the conditional one
  const lines = content.split('\n');
  const newLines = [];
  let inPublishingBlock = false;
  let braceCount = 0;
  let skipPublishing = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect publishing block start
    if (line.trim().startsWith('publishing {') && !line.includes('singleVariant')) {
      // If we're not in a conditional block, skip this publishing
      const prevLines = newLines.slice(-5).join('\n');
      if (!prevLines.includes('if (!safeExtGet("expoProvidesDefaultConfig"')) {
        skipPublishing = true;
        inPublishingBlock = true;
        braceCount = 1;
        continue;
      }
    }
    
    if (inPublishingBlock && skipPublishing) {
      // Count braces to know when publishing block ends
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      if (braceCount <= 0) {
        inPublishingBlock = false;
        skipPublishing = false;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  
  fs.writeFileSync(expoConstantsPath, content);
  console.log('✅ expo-constants fixed');
  return true;
}

// Fix function for expo-modules-core
function fixExpoModulesCore() {
  console.log('🔧 Fixing expo-modules-core...');
  
  const expoModulesCorePluginPath = path.join(nodeModulesPath, 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle');
  
  if (!fs.existsSync(expoModulesCorePluginPath)) {
    console.log('❌ expo-modules-core plugin not found');
    return false;
  }

  let content = fs.readFileSync(expoModulesCorePluginPath, 'utf-8');
  
  // Fix SoftwareComponent issue
  content = content.replace(
    /from components\.release/g,
    'from components.findByName("release") ?: components.findByName("default")'
  );
  
  fs.writeFileSync(expoModulesCorePluginPath, content);
  console.log('✅ expo-modules-core fixed');
  return true;
}

// Fix function for other expo modules with similar issues
function fixOtherExpoModules() {
  console.log('🔧 Scanning and fixing other expo modules...');
  
  const expoModules = [
    'expo-file-system',
    'expo-asset',
    'expo-font',
    'expo-image',
    'expo-secure-store',
    'expo-location'
  ];
  
  let fixedCount = 0;
  
  expoModules.forEach(moduleName => {
    const modulePath = path.join(nodeModulesPath, moduleName, 'android', 'build.gradle');
    
    if (fs.existsSync(modulePath)) {
      let content = fs.readFileSync(modulePath, 'utf-8');
      let modified = false;
      
      // Fix SDK versions
      if (content.includes('safeExtGet("compileSdkVersion"')) {
        content = content.replace(
          /compileSdkVersion safeExtGet\("compileSdkVersion", 34\)/g,
          'compileSdkVersion 34'
        ).replace(
          /minSdkVersion safeExtGet\("minSdkVersion", 23\)/g,
          'minSdkVersion 23'
        ).replace(
          /targetSdkVersion safeExtGet\("targetSdkVersion", 34\)/g,
          'targetSdkVersion 34'
        );
        modified = true;
      }
      
      // Fix getKotlinVersion if exists
      if (content.includes('getKotlinVersion')) {
        content = content.replace(
          /ext\.getKotlinVersion\s*=\s*\{[\s\S]*?\}/g,
          'ext.getKotlinVersion = { "1.9.23" }'
        );
        modified = true;
      }
      
      // Fix kotlinVersion() calls
      if (content.includes('kotlinVersion()')) {
        content = content.replace(/kotlinVersion\(\)/g, 'getKotlinVersion()');
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(modulePath, content);
        console.log(`✅ Fixed ${moduleName}`);
        fixedCount++;
      }
    }
  });
  
  console.log(`✅ Fixed ${fixedCount} additional expo modules`);
  return fixedCount > 0;
}

// Main execution
async function main() {
  try {
    console.log('📋 Professional Android Build Issue Resolution\n');
    
    // 1. Fix expo-constants
    const constantsFixed = fixExpoConstants();
    
    // 2. Fix expo-modules-core
    const coreFixed = fixExpoModulesCore();
    
    // 3. Fix other expo modules
    const othersFixed = fixOtherExpoModules();
    
    console.log('\n📊 Summary:');
    console.log(`expo-constants: ${constantsFixed ? '✅ Fixed' : '❌ Failed'}`);
    console.log(`expo-modules-core: ${coreFixed ? '✅ Fixed' : '❌ Failed'}`);
    console.log(`Other modules: ${othersFixed ? '✅ Fixed' : '➖ No issues'}`);
    
    console.log('\n🎯 Ready for build! Run: cd android && .\\gradlew bundleRelease');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    process.exit(1);
  }
}

main();
