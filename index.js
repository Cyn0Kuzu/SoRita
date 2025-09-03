/**
 * SoRita Entry Point - Ultimate Fix for Metro Bundler
 * This bypasses the Metro bundler require issue
 */

// CRITICAL: Fix global require before any imports
if (typeof global.require === 'undefined') {
  // Define require function in global scope
  global.require = function(moduleId) {
    // For minimal core, we don't need complex require resolution
    throw new Error(`Module ${moduleId} not available in minimal core`);
  };
}

// Fix other globals that Metro should provide but doesn't
if (typeof global.process === 'undefined') {
  global.process = {
    env: { NODE_ENV: __DEV__ ? 'development' : 'production' },
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// Now import React Native safely
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './package.json';

console.log('✅ [Index] Global scope fixed, registering SoRita...');

AppRegistry.registerComponent(appName, () => App);

