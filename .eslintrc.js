module.exports = {
  extends: ['expo'],
  rules: {
    // Disable some strict rules for development
    'no-console': 'off',
    'no-unused-vars': 'warn',
  },
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  globals: {
    __DEV__: 'readonly',
    document: 'readonly',
    window: 'readonly',
  },
};
