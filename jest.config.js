module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.js'
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/src/**/?(*.)(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/.expo/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|@unimodules|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-firebase)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1'
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/src/__tests__/jestSetup.js'
  ]
};
