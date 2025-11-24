/**
 * This script checks for common crash-causing issues in a React Native app
 * and applies fixes where possible. It also verifies Metro module issues.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting comprehensive app health check...');

// 1. Check for memory leaks and common crash-causing patterns in components
function checkForCommonIssues() {
  console.log('\n📊 Scanning for common crash-causing patterns...');
  
  // Look for App.js files (we have multiple variants)
  const appFiles = [
    'App.js',
    'App_safe.js',
    'App_ultra_safe.js',
    'App_crash_proof.js',
    'App_minimal_crash_proof.js'
  ];
  
  // Check each file
  appFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for common issues
      const issues = [];
      
      // Missing useEffect cleanup
      if (content.includes('useEffect') && 
          !content.includes('return () =>') && 
          (content.includes('addEventListener') || 
           content.includes('setTimeout') ||
           content.includes('setInterval'))) {
        issues.push('- Possible missing cleanup in useEffect for event listeners or timers');
      }
      
      // Infinite render loops
      if (content.includes('useState') && 
          content.includes('setState') && 
          !content.includes('useEffect') &&
          !content.includes('useCallback')) {
        issues.push('- Potential infinite render loop risk detected');
      }
      
      // Direct state mutation
      if (content.includes('state.') && content.includes('=')) {
        issues.push('- Possible direct state mutation detected');
      }
      
      // Render large lists without optimization
      if (content.includes('FlatList') && 
          !content.includes('keyExtractor') || 
          !content.includes('getItemLayout')) {
        issues.push('- FlatList used without performance optimizations');
      }
      
      // Report issues
      if (issues.length > 0) {
        console.log(`\n⚠️ Potential issues in ${file}:`);
        issues.forEach(issue => console.log(issue));
      } else {
        console.log(`\n✅ No common crash-causing issues detected in ${file}`);
      }
    }
  });
}

// 2. Check for excessive re-renders and update App_safe.js
function fixAppSafe() {
  const appSafePath = path.join(__dirname, 'App_safe.js');
  if (fs.existsSync(appSafePath)) {
    let content = fs.readFileSync(appSafePath, 'utf-8');
    
    // Add error boundary if not present
    if (!content.includes('class ErrorBoundary')) {
      const errorBoundaryCode = `
// Error Boundary to prevent app crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('App Error:', error);
    console.log('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            The app encountered an error. Please restart the app.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ padding: 12, backgroundColor: '#0ea5e9', borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
`;
      
      // Add the imports if needed
      if (!content.includes('import React')) {
        content = `import React from 'react';\n${content}`;
      }
      
      if (!content.includes('import { View, Text, TouchableOpacity }')) {
        content = content.replace(
          /import \{([^}]+)\} from 'react-native';/,
          `import { $1, View, Text, TouchableOpacity } from 'react-native';`
        );
      }
      
      // Insert the error boundary before the export
      content = content.replace(
        /export default function App/,
        `${errorBoundaryCode}\nexport default function App`
      );
      
      // Wrap the main component with ErrorBoundary
      content = content.replace(
        /return \(/,
        `return (\n    <ErrorBoundary>`
      );
      
      content = content.replace(
        /\);(\s*)$/,
        `    </ErrorBoundary>\n  );$1`
      );
      
      fs.writeFileSync(appSafePath, content);
      console.log(`✅ Added ErrorBoundary to ${appSafePath}`);
    } else {
      console.log(`✅ ErrorBoundary already present in ${appSafePath}`);
    }
  }
}

// 3. Check for memory leaks or unnecessary component updates
function optimizeApp() {
  const appPath = path.join(__dirname, 'App.js');
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf-8');
    
    // Ensure useCallback and useMemo are used for optimization
    if (!content.includes('useCallback') && content.includes('onPress')) {
      console.log('⚠️ Consider using useCallback for event handlers in App.js');
    }
    
    if (!content.includes('useMemo') && content.includes('map(')) {
      console.log('⚠️ Consider using useMemo for derived data in App.js');
    }
    
    // Add performance monitors in development
    if (!content.includes('LogBox.ignoreLogs')) {
      content = content.replace(
        /import \{([^}]+)\} from 'react-native';/,
        `import { $1, LogBox } from 'react-native';`
      );
      
      content = content.replace(
        /function App/,
        `// Ignore non-critical warnings
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  'Sending...',
  '[react-native-gesture-handler]',
]);

function App`
      );
      
      fs.writeFileSync(appPath, content);
      console.log(`✅ Added LogBox configuration to ${appPath}`);
    }
  }
}

// 4. Verify Metro modules required for EAS builds
function checkMetroModules() {
  console.log('\n🔍 Checking Metro dependencies for EAS builds...');
  
  // Required Metro modules to check
  const requiredModules = [
    'metro/src/Server.js',
    'metro/src/shared/output/bundle.js',
    'metro/src/shared/output/RamBundle.js',
    'metro/src/ModuleGraph/worker.js',
    'metro/src/DeltaBundler.js',
    'metro/src/Assets.js',
    'metro-config/src/defaults/index.js'
  ];
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('⚠️ node_modules directory not found, run npm install first');
    return;
  }
  
  // Check each required module
  const missingModules = [];
  
  for (const modulePath of requiredModules) {
    const fullPath = path.join(nodeModulesPath, modulePath);
    if (!fs.existsSync(fullPath)) {
      missingModules.push(modulePath);
    }
  }
  
  if (missingModules.length > 0) {
    console.log('⚠️ Some Metro modules are missing:');
    missingModules.forEach(module => console.log(`  - ${module}`));
    console.log('\n🔧 You should run the build-fix.js script before building:');
    console.log('  node build-fix.js && node fix-metro.js');
  } else {
    console.log('✅ All required Metro modules are present');
  }
}

// 5. Check package.json for proper dependencies
function checkPackageJson() {
  console.log('\n📦 Checking package.json configuration...');
  
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    // Check for critical dependencies
    const criticalDeps = [
      'metro',
      'metro-config',
      'metro-core',
      'metro-runtime',
      'metro-resolver',
      '@expo/cli',
      'react',
      'react-native',
      'expo'
    ];
    
    const missingDeps = [];
    
    for (const dep of criticalDeps) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      console.log('⚠️ Some critical dependencies are missing from package.json:');
      missingDeps.forEach(dep => console.log(`  - ${dep}`));
    } else {
      console.log('✅ All critical dependencies are in package.json');
    }
    
    // Check for EAS scripts
    const hasEasScripts = Object.keys(packageJson.scripts || {}).some(key => key.includes('eas'));
    
    if (!hasEasScripts) {
      console.log('⚠️ No EAS build scripts found in package.json');
      console.log('  Consider adding these scripts:');
      console.log('  "eas:build:android:production": "npx eas build --platform android --profile production"');
      console.log('  "eas:build:android:apk": "npx eas build --platform android --profile production-apk"');
    } else {
      console.log('✅ EAS build scripts found in package.json');
    }
  } else {
    console.log('❌ package.json not found!');
  }
}

// 6. Check for metro.config.js
function checkMetroConfig() {
  console.log('\n⚙️ Checking Metro configuration...');
  
  const metroConfigPath = path.join(__dirname, 'metro.config.js');
  if (fs.existsSync(metroConfigPath)) {
    const content = fs.readFileSync(metroConfigPath, 'utf-8');
    
    // Check for extraNodeModules configuration
    if (!content.includes('extraNodeModules')) {
      console.log('⚠️ metro.config.js does not have extraNodeModules configuration');
      console.log('  This might cause issues with Metro module resolution');
    } else {
      console.log('✅ metro.config.js has extraNodeModules configuration');
    }
  } else {
    console.log('❌ metro.config.js not found!');
    console.log('  Run build-fix.js to create a proper metro.config.js file');
  }
}

// 7. Check EAS configuration
function checkEasConfig() {
  console.log('\n🛠️ Checking EAS configuration...');
  
  const easConfigPath = path.join(__dirname, 'eas.json');
  if (fs.existsSync(easConfigPath)) {
    const content = fs.readFileSync(easConfigPath, 'utf-8');
    const easConfig = JSON.parse(content);
    
    // Check for production build configuration
    if (easConfig.build && easConfig.build.production) {
      console.log('✅ EAS production build configuration found');
      
      // Check prebuild command
      const prebuildCmd = easConfig.build.production.android?.prebuildCommand;
      if (prebuildCmd) {
        if (prebuildCmd.includes('build-fix.js') && prebuildCmd.includes('fix-metro.js')) {
          console.log('✅ EAS prebuild command includes fix scripts');
        } else {
          console.log('⚠️ EAS prebuild command should include build-fix.js and fix-metro.js');
        }
      } else {
        console.log('❌ No prebuild command found in EAS production configuration');
      }
    } else {
      console.log('❌ No production build configuration found in eas.json');
    }
  } else {
    console.log('❌ eas.json not found!');
    console.log('  Run "npx eas build:configure" to create an eas.json file');
  }
}

// Run all checks and fixes
checkForCommonIssues();
fixAppSafe();
optimizeApp();
checkMetroModules();
checkPackageJson();
checkMetroConfig();
checkEasConfig();

console.log('\n🚀 Comprehensive health check complete!');
console.log('➡️ Use "npx eas build --platform android --profile production" to build an AAB with EAS');
console.log('➡️ Or "npx eas build --platform android --profile production-apk" to build an APK with EAS');
console.log('➡️ For local builds, use "npm run android" or "npx expo run:android" instead');
