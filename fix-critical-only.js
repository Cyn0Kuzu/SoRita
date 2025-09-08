/**
 * Minimal Professional Gradle Fix - Only Critical Issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying minimal critical fixes...\n');

const nodeModulesPath = path.join(process.cwd(), 'node_modules');

// Only fix expo-constants publishing issue
const expoConstantsPath = path.join(nodeModulesPath, 'expo-constants', 'android', 'build.gradle');

if (fs.existsSync(expoConstantsPath)) {
  let content = fs.readFileSync(expoConstantsPath, 'utf-8');
  
  // Remove standalone publishing blocks (keep only conditional ones)
  const lines = content.split('\n');
  const newLines = [];
  let skipNext = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevContext = newLines.slice(-10).join('\n');
    
    // Skip standalone publishing blocks
    if (line.trim().startsWith('publishing {') && 
        !prevContext.includes('if (!safeExtGet("expoProvidesDefaultConfig"')) {
      // Skip this publishing block
      let braceCount = 1;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        braceCount += (nextLine.match(/\{/g) || []).length;
        braceCount -= (nextLine.match(/\}/g) || []).length;
        if (braceCount <= 0) {
          i = j; // Skip to end of block
          break;
        }
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  fs.writeFileSync(expoConstantsPath, newLines.join('\n'));
  console.log('✅ Fixed expo-constants publishing conflict');
} else {
  console.log('❌ expo-constants not found');
}

console.log('✅ Critical fixes applied!\n');
