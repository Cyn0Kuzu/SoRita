const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, 'node_modules');

function fixExpoModule(moduleName) {
  try {
    const buildGradlePath = path.join(nodeModulesPath, moduleName, 'android', 'build.gradle');
    
    if (!fs.existsSync(buildGradlePath)) {
      return false;
    }
    
    let content = fs.readFileSync(buildGradlePath, 'utf-8');
    console.log(`🔧 Fixing ${moduleName}...`);
    
    // Fix kotlinVersion function
    content = content.replace(
      /ext\.getKotlinVersion\s*=\s*\{[\s\S]*?\}/g,
      'ext.getKotlinVersion = { "1.9.23" }'
    );
    
    // Remove conditional configuration and force SDK versions
    content = content.replace(
      /if\s*\(\s*!safeExtGet\("expoProvidesDefaultConfig",\s*false\)\s*\)\s*\{([\s\S]*?)\}/g,
      '$1'
    );
    
    // Force SDK versions
    content = content.replace(
      /compileSdkVersion\s+safeExtGet\("compileSdkVersion",\s*\d+\)/g,
      'compileSdkVersion 34'
    );
    
    content = content.replace(
      /minSdkVersion\s+safeExtGet\("minSdkVersion",\s*\d+\)/g,
      'minSdkVersion 23'
    );
    
    content = content.replace(
      /targetSdkVersion\s+safeExtGet\("targetSdkVersion",\s*\d+\)/g,
      'targetSdkVersion 34'
    );
    
    // Remove duplicate publishing blocks
    const publishingBlocks = content.match(/publishing\s*\{[\s\S]*?\}/g);
    if (publishingBlocks && publishingBlocks.length > 1) {
      // Keep only the first publishing block
      content = content.replace(/publishing\s*\{[\s\S]*?\}/g, '');
    }
    
    fs.writeFileSync(buildGradlePath, content);
    console.log(`✅ Fixed ${moduleName}`);
    return true;
  } catch (e) {
    console.log(`⚠️ Failed to fix ${moduleName}:`, e.message);
    return false;
  }
}

// Find all expo modules
const expoModules = [];
if (fs.existsSync(nodeModulesPath)) {
  const modules = fs.readdirSync(nodeModulesPath);
  for (const module of modules) {
    if (module.startsWith('expo-') || module === 'expo') {
      const modulePath = path.join(nodeModulesPath, module);
      const androidPath = path.join(modulePath, 'android');
      if (fs.existsSync(androidPath) && fs.existsSync(path.join(androidPath, 'build.gradle'))) {
        expoModules.push(module);
      }
    }
  }
}

console.log('🔍 Found Expo modules:', expoModules);

let fixedCount = 0;
for (const module of expoModules) {
  if (fixExpoModule(module)) {
    fixedCount++;
  }
}

console.log(`✅ Fixed ${fixedCount} of ${expoModules.length} Expo modules`);
