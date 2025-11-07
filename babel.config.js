module.exports = function(api) {
  api.cache(true);

  const presets = ['babel-preset-expo'];
  const plugins = [];

  // Add the console removal plugin only in production
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets,
    plugins,
  };
};
