// Jest setup for React Native
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Firebase web SDK
jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  logEvent: jest.fn(),
  setUserProperties: jest.fn(),
  setUserId: jest.fn(),
}));

jest.mock('firebase/performance', () => ({
  getPerformance: jest.fn(),
  trace: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: {
      environment: 'test'
    }
  }
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mocked-hash')),
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
}));

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve(true)),
  getInternetCredentials: jest.fn(() => Promise.resolve({ password: 'test-token' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getSystemVersion: jest.fn(() => '14.0'),
  getModel: jest.fn(() => 'iPhone'),
  getBrand: jest.fn(() => 'Apple'),
  getUniqueId: jest.fn(() => 'test-device-id'),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  isPinOrFingerprintSet: jest.fn(() => Promise.resolve(true)),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }) => children,
}));

// Global test utilities
global.mockFetch = (data) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  );
};

global.mockFetchError = (error) => {
  global.fetch = jest.fn(() => Promise.reject(error));
};

// Console suppression for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
    args[0]?.includes?.('Warning: An invalid form control')
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};
