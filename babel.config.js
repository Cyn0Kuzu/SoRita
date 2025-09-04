module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo'
    ],
    plugins: [
      // Essential plugins for React Native
    ],
    env: {
      production: {
        plugins: [
          // Production optimizations
        ]
      }
    }
  };
};
