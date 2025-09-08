// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add custom Metro configuration
config.resolver = {
  ...config.resolver,
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'], // Add the extensions you use
  extraNodeModules: {
    // Make sure Metro can find these modules
    'metro': require.resolve('metro'),
    'metro-config': require.resolve('metro-config'),
    'metro-core': require.resolve('metro-core'),
    'metro-runtime': require.resolve('metro-runtime'),
  'metro-resolver': require.resolve('metro-resolver'),
  'metro-cache': require.resolve('metro-cache'),
  }
};

// Set maximum workers to improve performance
config.maxWorkers = 4;

// Improve caching
config.transformer = { ...config.transformer, enableBabelRCLookup: false };

module.exports = config;
