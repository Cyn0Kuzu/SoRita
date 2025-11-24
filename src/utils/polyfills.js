/**
 * Global Polyfills for SoRita - Simplified
 * Basic compatibility across all environments
 */

import { Platform } from 'react-native';

// Basic global require polyfill for React Native
if (typeof global.require === 'undefined') {
  try {
    global.require = require;
  } catch (e) {
    console.log('[Polyfills] Require polyfill not needed');
  }
}

// Basic process polyfill
if (typeof global.process === 'undefined') {
  global.process = {
    env: { NODE_ENV: __DEV__ ? 'development' : 'production' },
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// Console enhancements
console.log(' [Polyfills] Basic polyfills loaded for', Platform.OS);
