/**
 * Application Constants
 * Centralized constants for the SoRita application
 */

// App Configuration
export const APP_CONFIG = {
  NAME: 'SoRita',
  VERSION: '1.0.0',
  BUILD: __DEV__ ? 'development' : 'production',
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// UI Constants
export const UI_CONSTANTS = {
  HEADER_HEIGHT: 56,
  TAB_BAR_HEIGHT: 60,
  SAFE_AREA_PADDING: 20,
  BORDER_RADIUS: {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12,
    EXTRA_LARGE: 16,
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 40,
  },
  FONT_SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 28,
  },
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
};

// Map Configuration
export const MAP_CONSTANTS = {
  DEFAULT_REGION: {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  ZOOM_LEVELS: {
    CITY: 0.1,
    NEIGHBORHOOD: 0.01,
    STREET: 0.001,
  },
  MARKER_TYPES: {
    RESTAURANT: 'restaurant',
    ATTRACTION: 'attraction',
    HOTEL: 'hotel',
    SHOP: 'shop',
    OTHER: 'other',
  },
};

// Validation Constants
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/,
  },
};

// File Upload Constants
export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_QUALITY: 0.8,
  IMAGE_DIMENSIONS: {
    THUMBNAIL: { width: 150, height: 150 },
    MEDIUM: { width: 400, height: 400 },
    LARGE: { width: 800, height: 600 },
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'İnternet bağlantınızı kontrol edin',
  UNAUTHORIZED: 'Bu işlem için yetkiniz bulunmuyor',
  NOT_FOUND: 'Aranan içerik bulunamadı',
  SERVER_ERROR: 'Sunucu hatası oluştu',
  VALIDATION_ERROR: 'Girilen bilgiler geçersiz',
  FILE_TOO_LARGE: 'Dosya boyutu çok büyük',
  INVALID_FILE_TYPE: 'Geçersiz dosya türü',
  LOCATION_PERMISSION: 'Konum izni gerekli',
  CAMERA_PERMISSION: 'Kamera izni gerekli',
  STORAGE_PERMISSION: 'Depolama izni gerekli',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profil başarıyla güncellendi',
  LIST_CREATED: 'Liste başarıyla oluşturuldu',
  PLACE_ADDED: 'Mekan başarıyla eklendi',
  INVITATION_SENT: 'Davet gönderildi',
  FOLLOW_SUCCESS: 'Kullanıcı takip edildi',
  UNFOLLOW_SUCCESS: 'Kullanıcı takipten çıkarıldı',
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_DATA: '@SoRita:userData',
  AUTH_TOKEN: '@SoRita:authToken',
  SETTINGS: '@SoRita:settings',
  CACHE_PREFIX: '@SoRita:cache:',
  ONBOARDING_COMPLETED: '@SoRita:onboardingCompleted',
  LAST_SYNC: '@SoRita:lastSync',
};

// API Endpoints (if using external APIs)
export const API_ENDPOINTS = {
  PLACES: '/api/places',
  USERS: '/api/users',
  LISTS: '/api/lists',
  NOTIFICATIONS: '/api/notifications',
  UPLOAD: '/api/upload',
};

// Client Feature Flags
export const CLIENT_FEATURE_FLAGS = {
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_SOCIAL_SHARING: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ANALYTICS: true,
  ENABLE_DARK_THEME: false,
};

// Notification Types
export const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
  LIKE: 'like',
  COMMENT: 'comment',
  INVITATION: 'invitation',
  LIST_UPDATE: 'list_update',
  PLACE_UPDATE: 'place_update',
};

// Date & Time Constants
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  FULL: 'DD MMMM YYYY HH:mm',
  SHORT: 'DD/MM/YY',
  TIME_ONLY: 'HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
};

export default {
  APP_CONFIG,
  UI_CONSTANTS,
  MAP_CONSTANTS,
  VALIDATION_RULES,
  FILE_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  API_ENDPOINTS,
  CLIENT_FEATURE_FLAGS,
  NOTIFICATION_TYPES,
  DATE_FORMATS,
};
