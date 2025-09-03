module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        // Enable JSC runtime for universal compatibility
        jsxRuntime: 'automatic',
      }]
    ],
    plugins: [
      // Only essential plugins that are guaranteed to exist
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
    ],
    env: {
      production: {
        plugins: [
          // Production optimizations - only if packages exist
          // 'transform-remove-console', // Only if installed
        ]
      }
    }
  };
};
