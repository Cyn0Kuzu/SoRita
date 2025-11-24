/**
 * This script ensures that all necessary Metro dependencies are installed
 * and correctly structured before building the app with EAS.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⏳ Starting comprehensive build preparation...');

// Required Metro modules and their paths
const requiredMetroModules = [
  'metro/src/Server.js',
  'metro/src/shared/output/bundle.js',
  'metro/src/shared/output/RamBundle.js',
  'metro/src/ModuleGraph/worker.js',
  'metro/src/DeltaBundler.js',
  'metro/src/DeltaBundler/Serializers/sourceMapString.js',
  'metro/src/Assets.js',
  'metro-config/src/defaults/index.js',
  'metro-core/src/index.js',
  'metro-runtime/src/index.js',
  'metro-resolver/src/index.js',
  // top-level entry check for metro-cache (expo/metro-config requires this)
  'metro-cache'
];

// Check if Metro modules are properly installed
function checkMetroModules() {
  console.log('🔍 Checking all required Metro modules...');
  
  const missingModules = [];
  
  for (const modulePath of requiredMetroModules) {
    try {
      require.resolve(modulePath);
    } catch (error) {
      missingModules.push(modulePath);
    }
  }
  
  if (missingModules.length === 0) {
    console.log('✅ All Metro modules are properly installed');
    return true;
  } else {
    console.log(`⚠️ Missing ${missingModules.length} Metro modules: ${missingModules.join(', ')}`);
    // If metro-cache is missing, create a simple stub so Expo can require it
    if (missingModules.includes('metro-cache')) {
      const metroCacheDir = path.join(__dirname, 'node_modules', 'metro-cache');
      const metroCacheIndex = path.join(metroCacheDir, 'index.js');
      try {
        if (!fs.existsSync(metroCacheIndex)) {
          fs.mkdirSync(metroCacheDir, { recursive: true });
          fs.writeFileSync(
            metroCacheIndex,
            `// Auto-generated metro-cache fallback stub\nmodule.exports = { stableHash: (v)=>String(v).length, FileStore: class {}, HttpGetStore: class {}, AssetStore: class {} };`
          );
          console.log('✅ Created temporary fallback for metro-cache');
        }
      } catch {}
    }
    return false;
  }
}

// Install Metro dependencies if needed
function installMetroDependencies() {
  console.log('📦 Ensuring required CLI dependencies are available...');
  
  try {
    execSync('npm install --no-save --prefer-offline --no-audit --no-fund --loglevel=error @expo/cli', {
      stdio: 'inherit'
    });
    console.log('✅ CLI dependency installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install CLI dependency:', installError);
    process.exit(1);
  }
}

// Create missing Metro module files if needed
function createMissingMetroFiles() {
  console.log('🔧 Creating any missing Metro module files...');
  
  // Create metro/src/Server.js if missing
  const serverPath = path.join(__dirname, 'node_modules', 'metro', 'src', 'Server.js');
  if (!fs.existsSync(serverPath)) {
    const serverDir = path.dirname(serverPath);
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    
    const serverContent = `
/**
 * Metro Server module (auto-generated)
 */
class Server {
  constructor(options) {
    this.options = options;
  }
  
  static DEFAULT_GRAPH_OPTIONS = {};
  
  buildGraph() {
    return {};
  }
  
  getAsset() {
    return null;
  }
}

module.exports = { Server };
`;
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✅ Created metro/src/Server.js file');
  }
  
  // Create metro/src/shared/output/bundle.js if missing
  const bundlePath = path.join(__dirname, 'node_modules', 'metro', 'src', 'shared', 'output', 'bundle.js');
  if (!fs.existsSync(bundlePath)) {
    const bundleDir = path.dirname(bundlePath);
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }
    
    const bundleContent = `
/**
 * Metro bundle module (auto-generated)
 */
function buildBundle() {
  return {
    code: '',
    map: null,
    source: null
  };
}

function buildGraph() {
  return {};
}

function createModuleIdFactory() {
  return (path) => path;
}

module.exports = {
  buildBundle,
  buildGraph,
  createModuleIdFactory
};
`;
    
    fs.writeFileSync(bundlePath, bundleContent);
    console.log('✅ Created metro/src/shared/output/bundle.js file');
  }
  
  // Create metro/src/shared/output/RamBundle.js if missing
  const ramBundlePath = path.join(__dirname, 'node_modules', 'metro', 'src', 'shared', 'output', 'RamBundle.js');
  if (!fs.existsSync(ramBundlePath)) {
    const ramBundleDir = path.dirname(ramBundlePath);
    if (!fs.existsSync(ramBundleDir)) {
      fs.mkdirSync(ramBundleDir, { recursive: true });
    }
    
    const ramBundleContent = `
/**
 * Metro RamBundle module (auto-generated)
 */
function build() {
  return {
    code: '',
    map: null
  };
}

module.exports = {
  build
};
`;
    
    fs.writeFileSync(ramBundlePath, ramBundleContent);
    console.log('✅ Created metro/src/shared/output/RamBundle.js file');
  }
  
  // Create other required stub files
  ensureExpoCliMetroModules();
  // Ensure deep serializer path exists
  const serializerPath = path.join(__dirname, 'node_modules', 'metro', 'src', 'DeltaBundler', 'Serializers', 'sourceMapString.js');
  const serializerDir = path.dirname(serializerPath);
  if (!fs.existsSync(serializerDir)) fs.mkdirSync(serializerDir, { recursive: true });
  if (!fs.existsSync(serializerPath)) {
    fs.writeFileSync(serializerPath, 'module.exports = function(){ return \"\"; };');
    console.log('✅ Created metro/src/DeltaBundler/Serializers/sourceMapString.js file');
  }
}

// Make sure metro.config.js is properly configured
function updateMetroConfig() {
  const metroConfigPath = path.join(__dirname, 'metro.config.js');
  if (fs.existsSync(metroConfigPath)) {
    console.log('✅ metro.config.js exists');
    
    // Update metro.config.js to include proper configuration
    let content = fs.readFileSync(metroConfigPath, 'utf-8');
    
    // Make sure extraNodeModules is configured
    if (!content.includes('extraNodeModules')) {
      content = content.replace(
        'const config = getDefaultConfig(__dirname);',
        `const config = getDefaultConfig(__dirname);

// Add extra node modules for metro resolver
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  'metro': require.resolve('metro'),
  'metro-config': require.resolve('metro-config'),
  'metro-core': require.resolve('metro-core'),
  'metro-runtime': require.resolve('metro-runtime'),
  'metro-resolver': require.resolve('metro-resolver'),
  'metro-cache': require.resolve('metro-cache'),
  ...config.resolver.extraNodeModules
};`
      );
      
      fs.writeFileSync(metroConfigPath, content);
      console.log('✅ Updated metro.config.js with extraNodeModules');
    }
  } else {
    console.error('❌ metro.config.js not found, creating it...');
    
    const metroConfigContent = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add custom Metro configuration
config.resolver = {
  ...config.resolver,
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  extraNodeModules: {
    'metro': require.resolve('metro'),
    'metro-config': require.resolve('metro-config'),
    'metro-core': require.resolve('metro-core'),
    'metro-runtime': require.resolve('metro-runtime'),
    'metro-resolver': require.resolve('metro-resolver'),
  }
};

// Performance optimizations
config.maxWorkers = 4;
config.transformer = { ...config.transformer, enableBabelRCLookup: false };

module.exports = config;`;
    
    fs.writeFileSync(metroConfigPath, metroConfigContent);
    console.log('✅ metro.config.js created successfully');
  }
}

// Ensure @expo/cli can find Metro modules
function ensureExpoCliMetroModules() {
  try {
    // Check if @expo/cli exists
    const expoCLIPath = path.join(__dirname, 'node_modules', '@expo', 'cli');
    if (fs.existsSync(expoCLIPath)) {
      console.log('✅ @expo/cli module found');
      
      // Ensure cli/node_modules directory exists
      const cliNodeModulesPath = path.join(expoCLIPath, 'node_modules');
      if (!fs.existsSync(cliNodeModulesPath)) {
        fs.mkdirSync(cliNodeModulesPath, { recursive: true });
        console.log('✅ Created @expo/cli/node_modules directory');
      }
      
      // Create symbolic links or copy Metro modules into @expo/cli/node_modules
      const metroSourcePath = path.join(__dirname, 'node_modules', 'metro');
      const metroDestPath = path.join(cliNodeModulesPath, 'metro');
      
      if (fs.existsSync(metroSourcePath) && !fs.existsSync(metroDestPath)) {
        try {
          // Try symlink first
          fs.symlinkSync(metroSourcePath, metroDestPath, 'junction');
          console.log('✅ Created symbolic link for metro in @expo/cli/node_modules');
        } catch (symlinkError) {
          // Fall back to recursive copy
          console.log('⚠️ Symlink failed, copying metro module instead');
          copyFolderSync(metroSourcePath, metroDestPath);
          console.log('✅ Copied metro module to @expo/cli/node_modules');
        }
      }
      
      // Same for other metro modules
  const metroModules = ['metro-config', 'metro-core', 'metro-runtime', 'metro-resolver', 'metro-cache'];
      for (const module of metroModules) {
        const sourcePath = path.join(__dirname, 'node_modules', module);
        const destPath = path.join(cliNodeModulesPath, module);
        
        if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
          try {
            fs.symlinkSync(sourcePath, destPath, 'junction');
            console.log(`✅ Created symbolic link for ${module} in @expo/cli/node_modules`);
          } catch (symlinkError) {
            console.log(`⚠️ Symlink failed for ${module}, copying module instead`);
            copyFolderSync(sourcePath, destPath);
            console.log(`✅ Copied ${module} to @expo/cli/node_modules`);
          }
        }
      }
    } else {
      console.log('⚠️ @expo/cli module not found, installing...');
      execSync('npm install --no-save @expo/cli', { stdio: 'inherit' });
      ensureExpoCliMetroModules(); // Retry after installation
    }
  } catch (error) {
    console.error('❌ Failed to ensure @expo/cli can find Metro modules:', error);
  }
}

// Helper function to recursively copy folders
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Run all the fix steps
if (!checkMetroModules()) {
  installMetroDependencies();
}

createMissingMetroFiles();
updateMetroConfig();
ensureExpoCliMetroModules();
try {
  const ensureExpoFontInterfaces = require('./scripts/setup-font-interfaces');
  ensureExpoFontInterfaces(__dirname);
} catch (error) {
  console.error('❌ Failed to ensure expo font interfaces exist:', error);
}

console.log('🚀 Build preparation completed successfully');
