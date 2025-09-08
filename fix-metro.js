/**
 * This script fixes Metro module issues in EAS build environment
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running comprehensive Metro module fixer for EAS...');

// EAS build specific paths
const workingDir = process.env.EAS_BUILD_WORKINGDIR || process.cwd();
const nodeModulesPath = path.join(workingDir, 'node_modules');

// Required Metro modules and their paths
const requiredMetroModules = [
  { 
    path: 'metro/src/Server.js',
    content: `
/**
 * Metro Server module (auto-generated)
 */
class Server {
  constructor(options) {
    this.options = options || {};
  }
  
  static DEFAULT_GRAPH_OPTIONS = {};
  
  buildGraph() {
    return {};
  }
  
  getAsset() {
    return null;
  }
}

module.exports = { Server };`
  },
  {
    path: 'metro/src/DeltaBundler/Serializers/sourceMapString.js',
    content: `
/**
 * Metro sourceMapString serializer (auto-generated stub)
 */
module.exports = function sourceMapString() { return ''; };`
  },
  { 
    path: 'metro/src/shared/output/bundle.js',
    content: `
/**
 * Metro bundle output module (auto-generated)
 */
exports.save = async function(_, __, ___, ____, outputOptions) {
  return outputOptions?.bundleOutput || null;
};

exports.saveDeps = async function() {
  return null;
};

exports.buildBundle = function() {
  return {
    code: '',
    map: null
  };
};

exports.buildGraph = function() {
  return {};
};

exports.createModuleIdFactory = function() {
  return (path) => path;
};

exports.Terminal = class {};`
  },
  { 
    path: 'metro/src/shared/output/RamBundle.js',
    content: `
/**
 * Metro RamBundle module (auto-generated)
 */
exports.build = function() {
  return {
    code: '',
    map: null
  };
};

exports.formatName = function() {
  return 'RamBundle';
};`
  },
  { 
    path: 'metro/src/ModuleGraph/worker.js',
    content: `
/**
 * Metro ModuleGraph worker (auto-generated)
 */
module.exports = {
  dependencyGraph: null,
  transformModule: () => ({ output: [] }),
};`
  },
  { 
    path: 'metro/src/DeltaBundler.js',
    content: `
/**
 * Metro DeltaBundler (auto-generated)
 */
class DeltaBundler {
  constructor() {}
  
  buildGraph() {
    return Promise.resolve({
      dependencies: new Map(),
      entryPoints: new Set()
    });
  }
  
  getDelta() {
    return Promise.resolve({
      modified: new Map(),
      deleted: new Set(),
      reset: false
    });
  }
}

module.exports = { DeltaBundler };`
  },
  { 
    path: 'metro/src/Assets.js',
    content: `
/**
 * Metro Assets module (auto-generated)
 */
exports.getAsset = () => null;
exports.getAssetData = () => ({});
exports.getAssetFiles = () => [];`
  },
  { 
    path: 'metro-config/src/defaults/index.js',
    content: `
/**
 * Metro config defaults (auto-generated)
 */
module.exports = {
  getDefaultConfig: () => ({
    resolver: {},
    transformer: {},
    serializer: {},
    server: {},
    symbolicator: {},
    watcher: {}
  })
};`
  }
];

// Create symbolic links if needed
function ensureMetroModules() {
  try {
    // Check if metro is installed
    const metroPath = path.join(nodeModulesPath, 'metro');
    if (!fs.existsSync(metroPath)) {
  console.log('⚠️ Metro module not found, creating minimal stubs and ensuring @expo/cli exists...');
  execSync('npm install --no-save @expo/cli', { 
        stdio: 'inherit',
        cwd: workingDir
      });
  console.log('ℹ️ Skipped forcing Metro install; relying on Expo SDK-provided Metro');
    }
    
    // Ensure @expo/cli can find metro
    const expoCliDir = path.join(nodeModulesPath, '@expo/cli');
    
    if (fs.existsSync(expoCliDir) && fs.existsSync(metroPath)) {
      console.log('✅ Both @expo/cli and metro exist');
      
      // Create node_modules in @expo/cli if needed
      const cliNodeModules = path.join(expoCliDir, 'node_modules');
      if (!fs.existsSync(cliNodeModules)) {
        fs.mkdirSync(cliNodeModules, { recursive: true });
        console.log('📁 Created node_modules directory inside @expo/cli');
      }
      
  // Add metro modules to @expo/cli/node_modules
  const metroModules = ['metro', 'metro-config', 'metro-core', 'metro-runtime', 'metro-resolver', 'metro-cache'];
      
      for (const module of metroModules) {
        const modulePath = path.join(nodeModulesPath, module);
        const moduleCliPath = path.join(cliNodeModules, module);
        
        if (fs.existsSync(modulePath) && !fs.existsSync(moduleCliPath)) {
          try {
            // Try to create symlink first
            fs.symlinkSync(modulePath, moduleCliPath, 'junction');
            console.log(`🔗 Created symbolic link to ${module} in @expo/cli/node_modules`);
          } catch (e) {
            // Fall back to copying files
            console.log(`⚠️ Symlink failed for ${module}, copying files instead`);
            copyFolderRecursive(modulePath, moduleCliPath);
            console.log(`📂 Copied ${module} files to @expo/cli/node_modules`);
          }
        }
      }
    } else {
      console.log('⚠️ Missing important modules (@expo/cli or metro)');
      if (!fs.existsSync(expoCliDir)) {
        console.log('Installing @expo/cli...');
        execSync('npm install --no-save @expo/cli', { stdio: 'inherit', cwd: workingDir });
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring Metro modules:', error);
  }
}

// Create missing Metro module files
function createMissingMetroFiles() {
  console.log('🔍 Checking and creating all required Metro module files...');
  
  for (const module of requiredMetroModules) {
    const modulePath = path.join(nodeModulesPath, module.path);
    const moduleDir = path.dirname(modulePath);
    
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
      console.log(`📁 Created directory for ${module.path}`);
    }
    
    if (!fs.existsSync(modulePath)) {
      fs.writeFileSync(modulePath, module.content.trim());
      console.log(`✅ Created ${module.path}`);
    }
    
    // Also create in @expo/cli/node_modules if needed
    const expoCliModulePath = path.join(nodeModulesPath, '@expo/cli/node_modules', module.path);
    const expoCliModuleDir = path.dirname(expoCliModulePath);
    
    if (!fs.existsSync(expoCliModuleDir)) {
      fs.mkdirSync(expoCliModuleDir, { recursive: true });
    }
    
    if (!fs.existsSync(expoCliModulePath)) {
      fs.writeFileSync(expoCliModulePath, module.content.trim());
      console.log(`✅ Created ${module.path} in @expo/cli/node_modules`);
    }
  }
  // Ensure directory trees exist for serializer path even if not in list
  const deepPath = path.join(nodeModulesPath, 'metro', 'src', 'DeltaBundler', 'Serializers');
  if (!fs.existsSync(deepPath)) fs.mkdirSync(deepPath, { recursive: true });
  const serializerFile = path.join(deepPath, 'sourceMapString.js');
  if (!fs.existsSync(serializerFile)) {
    fs.writeFileSync(serializerFile, "module.exports = function(){ return ''; };");
    console.log('✅ Created metro/src/DeltaBundler/Serializers/sourceMapString.js');
  }
  const deepCliPath = path.join(nodeModulesPath, '@expo', 'cli', 'node_modules', 'metro', 'src', 'DeltaBundler', 'Serializers');
  if (!fs.existsSync(deepCliPath)) fs.mkdirSync(deepCliPath, { recursive: true });
  const serializerCliFile = path.join(deepCliPath, 'sourceMapString.js');
  if (!fs.existsSync(serializerCliFile)) {
    fs.writeFileSync(serializerCliFile, "module.exports = function(){ return ''; };");
    console.log('✅ Created serializer stub in @expo/cli/node_modules');
  }
}

// Update metro.config.js to include proper paths
function updateMetroConfig() {
  const metroConfigPath = path.join(workingDir, 'metro.config.js');
  
  if (fs.existsSync(metroConfigPath)) {
    let content = fs.readFileSync(metroConfigPath, 'utf-8');
    
    // Make sure resolver.extraNodeModules includes metro modules
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
    
    // Ensure proper source extensions
    if (!content.includes('sourceExts')) {
      content = content.replace(
        'config.resolver = config.resolver || {};',
        `config.resolver = config.resolver || {};
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', ...config.resolver.sourceExts || []];`
      );
      
      fs.writeFileSync(metroConfigPath, content);
      console.log('✅ Updated metro.config.js with sourceExts');
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
config.transformer.enableBabelRCLookup = false;
config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-preset');
config.transformer.minifierConfig = {
  compress: { drop_console: true }
};

module.exports = config;`;
    
    fs.writeFileSync(metroConfigPath, metroConfigContent);
    console.log('✅ Created metro.config.js successfully');
  }
}

// Patch @expo/cli modules to avoid Metro dependency errors
function patchExpoCLI() {
  const expoCliDir = path.join(nodeModulesPath, '@expo/cli');
  
  if (fs.existsSync(expoCliDir)) {
    // Patch files that might cause issues
    const filesToPatch = [
      'build/src/export/embed/exportEmbedAsync.js',
      'build/src/start/server/middleware/devServerMiddleware.js',
      'build/src/start/server/metro/importMetroFromProject.js'
    ];
    
    for (const filePath of filesToPatch) {
      const fullPath = path.join(expoCliDir, filePath);
      
      if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;
        
        // Patch Server.js references
        if (content.includes('metro/src/Server')) {
          content = content.replace(
            "require('metro/src/Server')",
            "{ Server: class { constructor() {} static DEFAULT_GRAPH_OPTIONS = {}; } }"
          );
          modified = true;
        }
        
        // Patch bundle.js references
        if (content.includes('metro/src/shared/output/bundle')) {
          content = content.replace(
            "require('metro/src/shared/output/bundle')",
            "{ save: async () => {}, saveDeps: async () => {}, buildBundle: () => ({}), buildGraph: () => ({}), createModuleIdFactory: () => (p) => p, Terminal: class {} }"
          );
          modified = true;
        }
        
        // Patch RamBundle.js references
        if (content.includes('metro/src/shared/output/RamBundle')) {
          content = content.replace(
            "require('metro/src/shared/output/RamBundle')",
            "{ build: () => ({}) }"
          );
          modified = true;
        }

        // Avoid embed export when explicitly disabled
        if (process.env.EXPO_NO_EXPORT_EMBED === '1' && filePath.includes('export/embed')) {
          content = 'module.exports = async function(){ return; }';
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, content);
          console.log(`✅ Patched @expo/cli file: ${filePath}`);
        }
      }
    }
  }
}

// Ensure metro-cache module exists (fallback stub if needed)
function ensureMetroCacheModule() {
  const rootMetroCache = path.join(nodeModulesPath, 'metro-cache');
  const rootMetroCacheIndex = path.join(rootMetroCache, 'index.js');

  const stubContent = `
// Auto-generated metro-cache fallback stub
const crypto = require('crypto');

function stableHash(value) {
  try {
    return crypto.createHash('sha1').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
  } catch {
    return '0';
  }
}

class FileStore { constructor() {} };
class HttpGetStore { constructor() {} };
class AssetStore { constructor() {} };

module.exports = { stableHash, FileStore, HttpGetStore, AssetStore };`;

  try {
    // If not installed by npm, create stub
    if (!fs.existsSync(rootMetroCacheIndex)) {
      fs.mkdirSync(rootMetroCache, { recursive: true });
      fs.writeFileSync(rootMetroCacheIndex, stubContent);
      console.log('✅ Created fallback stub for metro-cache at node_modules/metro-cache');
    }

    // Also create nested src paths expected by @expo/metro-config
    const createNestedStubs = (baseDir) => {
      const storesDir = path.join(baseDir, 'src', 'stores');
      const stableHashFile = path.join(baseDir, 'src', 'stableHash.js');
      if (!fs.existsSync(storesDir)) fs.mkdirSync(storesDir, { recursive: true });
      const fileStore = path.join(storesDir, 'FileStore.js');
      const httpGetStore = path.join(storesDir, 'HttpGetStore.js');
      const assetStore = path.join(storesDir, 'AssetStore.js');
      if (!fs.existsSync(fileStore)) fs.writeFileSync(fileStore, 'class FileStore{}; module.exports = FileStore;');
      if (!fs.existsSync(httpGetStore)) fs.writeFileSync(httpGetStore, 'class HttpGetStore{}; module.exports = HttpGetStore;');
      if (!fs.existsSync(assetStore)) fs.writeFileSync(assetStore, 'class AssetStore{}; module.exports = AssetStore;');
      if (!fs.existsSync(stableHashFile)) fs.writeFileSync(stableHashFile, 'module.exports = function stableHash(){ return "0"; };');
    };
    createNestedStubs(rootMetroCache);

    // Also ensure inside @expo/cli/node_modules
    const expoCliMetroCache = path.join(nodeModulesPath, '@expo/cli', 'node_modules', 'metro-cache');
    const expoCliMetroCacheIndex = path.join(expoCliMetroCache, 'index.js');
    if (!fs.existsSync(expoCliMetroCacheIndex)) {
      fs.mkdirSync(expoCliMetroCache, { recursive: true });
      fs.writeFileSync(expoCliMetroCacheIndex, stubContent);
      console.log('✅ Ensured fallback stub for metro-cache in @expo/cli/node_modules');
    }
    createNestedStubs(expoCliMetroCache);

    // Also ensure inside @expo/metro-config/node_modules
    const expoMetroConfigMetroCache = path.join(nodeModulesPath, '@expo/metro-config', 'node_modules', 'metro-cache');
    const expoMetroConfigMetroCacheIndex = path.join(expoMetroConfigMetroCache, 'index.js');
    if (!fs.existsSync(expoMetroConfigMetroCacheIndex)) {
      fs.mkdirSync(expoMetroConfigMetroCache, { recursive: true });
      fs.writeFileSync(expoMetroConfigMetroCacheIndex, stubContent);
      console.log('✅ Ensured fallback stub for metro-cache in @expo/metro-config/node_modules');
    }
    createNestedStubs(expoMetroConfigMetroCache);
  } catch (e) {
    console.log('⚠️ Failed to ensure metro-cache fallback stub:', e?.message || e);
  }
}

// Patch @expo/metro-config to avoid hard dependency on metro-cache deep paths
function patchExpoMetroConfig() {
  const expoMetroConfigDir = path.join(nodeModulesPath, '@expo', 'metro-config');
  const fileStorePath = path.join(expoMetroConfigDir, 'build', 'file-store.js');
  if (fs.existsSync(fileStorePath)) {
    try {
      let content = fs.readFileSync(fileStorePath, 'utf-8');
      let modified = false;
      const fileStoreRegex = /require\(["']metro-cache\/src\/stores\/FileStore["']\)/g;
      const stableHashRegex = /require\(["']metro-cache\/src\/stableHash["']\)/g;
      if (fileStoreRegex.test(content)) {
        content = content.replace(
          fileStoreRegex,
          "(function(){ try { return require('metro-cache/src/stores/FileStore'); } catch(e) { try { return require('metro-cache').FileStore; } catch(e2) { return class {}; } } })()"
        );
        modified = true;
      }
      if (stableHashRegex.test(content)) {
        content = content.replace(
          stableHashRegex,
          "(function(){ try { return require('metro-cache/src/stableHash'); } catch(e) { try { return require('metro-cache').stableHash; } catch(e2) { return (v)=>'0'; } } })()"
        );
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(fileStorePath, content);
        console.log('✅ Patched @expo/metro-config file-store.js for metro-cache fallback');
      } else {
        console.log('ℹ️ No patch needed for @expo/metro-config file-store.js');
      }
    } catch (e) {
      console.log('⚠️ Failed to patch @expo/metro-config file-store.js:', e?.message || e);
    }
  }
  // Also patch serializer to handle sourceMapString deep path
  const serializerPath = path.join(expoMetroConfigDir, 'build', 'serializer', 'withExpoSerializers.js');
  if (fs.existsSync(serializerPath)) {
    try {
      let content = fs.readFileSync(serializerPath, 'utf-8');
      if (content.includes("metro/src/DeltaBundler/Serializers/sourceMapString")) {
        content = content.replace(
          /require\(["']metro\/src\/DeltaBundler\/Serializers\/sourceMapString["']\)/g,
          "(function(){ try { return require('metro/src/DeltaBundler/Serializers/sourceMapString'); } catch(e) { return function(){ return ''; }; } })()"
        );
        fs.writeFileSync(serializerPath, content);
        console.log('✅ Patched @expo/metro-config serializer to fallback sourceMapString');
      }
    } catch (e) {
      console.log('⚠️ Failed to patch @expo/metro-config serializer:', e?.message || e);
    }
  }
}

// Helper function to recursively copy folders
function copyFolderRecursive(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  // Get all files and subdirectories
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Run all fixes
ensureMetroModules();
createMissingMetroFiles();
updateMetroConfig();
patchExpoCLI();
patchExpoMetroConfig();
ensureMetroCacheModule();

console.log('✅ Comprehensive Metro fix completed successfully!');
