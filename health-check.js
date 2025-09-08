/**
 * Professional Project Health Check
 * Tests core services and imports without full app initialization
 */

/**
 * SoRita Health Check Script
 * Checks for common issues and provides solutions
 */

const fs = require('fs');
const path = require('path');

class HealthChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warn: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addIssue(message) {
    this.issues.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warn');
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(message, 'info');
  }

  checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.addPassed(`${description} exists`);
      return true;
    } else {
      this.addIssue(`${description} is missing: ${filePath}`);
      return false;
    }
  }

  checkPackageJson() {
    this.log('Checking package.json...', 'info');
    
    if (!this.checkFile('package.json', 'package.json')) return;

    try {
      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check required fields
      const requiredFields = ['name', 'version', 'dependencies'];
      requiredFields.forEach(field => {
        if (packageData[field]) {
          this.addPassed(`package.json has ${field}`);
        } else {
          this.addIssue(`package.json missing ${field}`);
        }
      });

      // Check for security issues
      if (packageData.dependencies) {
        const deps = Object.keys(packageData.dependencies);
        if (deps.length > 50) {
          this.addWarning(`Large number of dependencies (${deps.length})`);
        }
      }

    } catch (error) {
      this.addIssue(`Invalid package.json: ${error.message}`);
    }
  }

  checkAppJson() {
    this.log('Checking app.json...', 'info');
    
    if (!this.checkFile('app.json', 'app.json')) return;

    try {
      const appData = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      
      if (appData.expo) {
        this.addPassed('Valid Expo configuration');
        
        // Check required Expo fields
        const required = ['name', 'slug', 'version'];
        required.forEach(field => {
          if (appData.expo[field]) {
            this.addPassed(`app.json has expo.${field}`);
          } else {
            this.addIssue(`app.json missing expo.${field}`);
          }
        });

        // Check assets
        if (appData.expo.icon && !fs.existsSync(appData.expo.icon)) {
          this.addWarning(`Icon file missing: ${appData.expo.icon}`);
        }
        
        if (appData.expo.splash?.image && !fs.existsSync(appData.expo.splash.image)) {
          this.addWarning(`Splash image missing: ${appData.expo.splash.image}`);
        }

      } else {
        this.addIssue('app.json missing expo configuration');
      }

    } catch (error) {
      this.addIssue(`Invalid app.json: ${error.message}`);
    }
  }

  checkAppJs() {
    this.log('Checking App.js...', 'info');
    
    if (!this.checkFile('App.js', 'App.js')) return;

    try {
      const appContent = fs.readFileSync('App.js', 'utf8');
      
      // Check for common issues
      if (appContent.includes('export default')) {
        this.addPassed('App.js has default export');
      } else {
        this.addIssue('App.js missing default export');
      }

      if (appContent.includes('import React')) {
        this.addPassed('App.js imports React');
      } else {
        this.addIssue('App.js missing React import');
      }

      // Check for duplicate exports
      const exportMatches = appContent.match(/export default/g);
      if (exportMatches && exportMatches.length > 1) {
        this.addIssue('App.js has multiple default exports');
      }

      // Check for error boundaries
      if (appContent.includes('ErrorBoundary') || appContent.includes('componentDidCatch')) {
        this.addPassed('App.js has error handling');
      } else {
        this.addWarning('App.js lacks error boundary protection');
      }

    } catch (error) {
      this.addIssue(`Cannot read App.js: ${error.message}`);
    }
  }

  checkNodeModules() {
    this.log('Checking node_modules...', 'info');
    
    if (fs.existsSync('node_modules')) {
      this.addPassed('node_modules directory exists');
      
      // Check common packages
      const criticalPackages = ['expo', 'react', 'react-native'];
      criticalPackages.forEach(pkg => {
        if (fs.existsSync(`node_modules/${pkg}`)) {
          this.addPassed(`${pkg} is installed`);
        } else {
          this.addIssue(`${pkg} is missing`);
        }
      });
    } else {
      this.addIssue('node_modules directory missing - run npm install');
    }
  }

  checkAssets() {
    this.log('Checking assets...', 'info');
    
    if (fs.existsSync('assets')) {
      this.addPassed('Assets directory exists');
      
      const assetFiles = fs.readdirSync('assets');
      if (assetFiles.length === 0) {
        this.addWarning('Assets directory is empty');
      } else {
        this.addPassed(`Found ${assetFiles.length} asset files`);
      }
    } else {
      this.addWarning('Assets directory missing');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('           SORITA HEALTH CHECK REPORT');
    console.log('='.repeat(50));

    console.log(`\n✅ Passed: ${this.passed.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Issues: ${this.issues.length}`);

    if (this.issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      this.issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n🟡 WARNINGS:');
      this.warnings.forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('🎉 All critical checks passed!');
      return true;
    } else {
      console.log(`❌ ${this.issues.length} critical issue(s) need attention.`);
      return false;
    }
  }

  run() {
    console.log('🔍 Starting SoRita Health Check...\n');

    this.checkPackageJson();
    this.checkAppJson();
    this.checkAppJs();
    this.checkNodeModules();
    this.checkAssets();

    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  const success = checker.run();
  process.exit(success ? 0 : 1);
}

module.exports = HealthChecker;

try {
  // Test Core React Native imports
  console.log('📱 Testing React Native core...');
  const RN = require('react-native');
  console.log('✅ React Native core imports successful');

  // Test Navigation imports
  console.log('🧭 Testing Navigation imports...');
  const Navigation = require('@react-navigation/native');
  const StackNav = require('@react-navigation/stack');
  console.log('✅ Navigation imports successful');

  // Test Firebase config
  console.log('🔥 Testing Firebase config...');
  const FirebaseConfig = require('./src/config/firebase');
  console.log('✅ Firebase config imports successful');

  // Test Services
  console.log('⚙️ Testing Service imports...');
  const ComprehensiveService = require('./src/services/comprehensiveDataService');
  const AuthService = require('./src/services/authService');
  const GlobalState = require('./src/services/globalStateService');
  console.log('✅ Core services import successful');

  // Test Screens
  console.log('📱 Testing Screen imports...');
  const WelcomeScreen = require('./src/screens/WelcomeScreen');
  const LoginScreen = require('./src/screens/LoginScreen');
  console.log('✅ Screen imports successful');

  // Test Components
  console.log('🧩 Testing Component imports...');
  const LoadingScreen = require('./src/components/LoadingScreen');
  console.log('✅ Component imports successful');

  console.log('🎉 All core imports successful! Project structure is healthy.');
  console.log('📊 Import Summary:');
  console.log('   ✅ React Native core');
  console.log('   ✅ Navigation system');
  console.log('   ✅ Firebase configuration');
  console.log('   ✅ Core services');
  console.log('   ✅ Screen components');
  console.log('   ✅ UI components');
  
} catch (error) {
  console.error('❌ Health check failed:', error.message);
  console.error('📍 Error location:', error.stack?.split('\n')[1]);
}
