/**
 * Environment Configuration
 * Professional environment management for SoRita
 */

import Constants from 'expo-constants';

// Environment types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
};

// Get current environment
export const getCurrentEnvironment = () => {
  if (__DEV__) return ENVIRONMENTS.DEVELOPMENT;

  // You can add more sophisticated logic here
  const releaseChannel = Constants.manifest?.releaseChannel;

  if (releaseChannel === 'staging') return ENVIRONMENTS.STAGING;
  if (releaseChannel === 'production') return ENVIRONMENTS.PRODUCTION;

  return ENVIRONMENTS.DEVELOPMENT;
};

// Environment configuration
const configs = {
  [ENVIRONMENTS.DEVELOPMENT]: {
    API_BASE_URL: 'https://dev-api.sorita.com',
    FIREBASE_CONFIG: {
      // Development Firebase config
    },
    GOOGLE_MAPS_API_KEY: 'dev_google_maps_key',
    ENABLE_FLIPPER: true,
    ENABLE_LOGGING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_CRASH_REPORTING: false,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  },

  [ENVIRONMENTS.STAGING]: {
    API_BASE_URL: 'https://staging-api.sorita.com',
    FIREBASE_CONFIG: {
      // Staging Firebase config
    },
    GOOGLE_MAPS_API_KEY: 'staging_google_maps_key',
    ENABLE_FLIPPER: false,
    ENABLE_LOGGING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_CRASH_REPORTING: true,
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  },

  [ENVIRONMENTS.PRODUCTION]: {
    API_BASE_URL: 'https://api.sorita.com',
    FIREBASE_CONFIG: {
      // Production Firebase config
    },
    GOOGLE_MAPS_API_KEY: 'prod_google_maps_key',
    ENABLE_FLIPPER: false,
    ENABLE_LOGGING: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_CRASH_REPORTING: true,
    CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  },
};

// Get current config
export const getConfig = () => {
  const env = getCurrentEnvironment();
  return configs[env];
};

// Feature flags
export const getFeatureFlags = () => {
  const config = getConfig();
  return {
    ENABLE_DEV_TOOLS: config.ENABLE_FLIPPER,
    ENABLE_PERFORMANCE_MONITORING: config.ENABLE_PERFORMANCE_MONITORING,
    ENABLE_ERROR_REPORTING: config.ENABLE_CRASH_REPORTING,
    ENABLE_ANALYTICS: getCurrentEnvironment() !== ENVIRONMENTS.DEVELOPMENT,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_OFFLINE_MODE: true,
    ENABLE_BETA_FEATURES: getCurrentEnvironment() === ENVIRONMENTS.STAGING,
  };
};

// API Configuration
export const getApiConfig = () => {
  const config = getConfig();
  return {
    baseURL: config.API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-App-Version': Constants.manifest?.version || '1.0.0',
      'X-Platform': 'mobile',
    },
    retryConfig: {
      retries: getCurrentEnvironment() === ENVIRONMENTS.DEVELOPMENT ? 1 : 3,
      retryDelay: 1000,
    },
  };
};

// Database Configuration
export const getDatabaseConfig = () => {
  const config = getConfig();
  return {
    cacheSize:
      getCurrentEnvironment() === ENVIRONMENTS.PRODUCTION ? 100 * 1024 * 1024 : 10 * 1024 * 1024, // 100MB prod, 10MB dev
    persistenceEnabled: true,
    cacheTTL: config.CACHE_TTL,
    offlineSupport: true,
  };
};

// Security Configuration
export const getSecurityConfig = () => {
  return {
    enableBiometrics: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireEmailVerification: getCurrentEnvironment() !== ENVIRONMENTS.DEVELOPMENT,
    enableTwoFactor: getCurrentEnvironment() === ENVIRONMENTS.PRODUCTION,
  };
};

// Export current environment and config
export const ENV = getCurrentEnvironment();
export const CONFIG = getConfig();
export const FEATURE_FLAGS = getFeatureFlags();

export default {
  ENV,
  CONFIG,
  getCurrentEnvironment,
  getConfig,
  getFeatureFlags,
  getApiConfig,
  getDatabaseConfig,
  getSecurityConfig,
};
