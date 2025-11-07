/**
 * Utilities Index
 * Central export point for all utility modules in SoRita
 */

import { Platform } from 'react-native';

// Import defaults for re-export
import constantsDefault from './constants';
import dateUtilsDefault from './dateUtils';
import validationUtilsDefault from './validationUtils';
import errorHandlerDefault from './errorHandler';
import performanceUtilsDefault from './performanceUtils';
import storageUtilsDefault from './storageUtils';
import hooksDefault from './hooks';

// Import all utility modules
export * from './constants';
// export * from './dateUtils'; // Removed due to empty export
// export * from './validationUtils'; // Removed due to empty export
export * from './errorHandler';
export * from './performanceUtils';
// export * from './storageUtils'; // Removed due to empty export
export * from './hooks';
export * from './collaboratorColors';
export * from './imagePicker';
// export * from './logger'; // Removed due to empty export

// Utility helper functions
export const formatCurrency = (amount, currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (number, decimals = 0) => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

export const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export const capitalizeWords = (string) => {
  if (!string) return '';
  return string
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ');
};

export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + suffix;
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const isNullOrUndefined = (value) => {
  return value === null || value === undefined;
};

export const isEmptyString = (value) => {
  return typeof value === 'string' && value.trim() === '';
};

export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

export const isEmptyArray = (arr) => {
  return Array.isArray(arr) && arr.length === 0;
};

export const removeEmptyValues = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (!isNullOrUndefined(value) && !isEmptyString(value)) {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    Object.keys(obj).forEach((key) => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
};

export const flattenObject = (obj, prefix = '') => {
  const flattened = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
};

export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (direction === 'desc') {
      return bVal > aVal ? 1 : -1;
    }

    return aVal > bVal ? 1 : -1;
  });
};

export const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const parseQueryString = (queryString) => {
  const params = {};
  const pairs = queryString.slice(1).split('&');

  pairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });

  return params;
};

export const buildQueryString = (params) => {
  const pairs = Object.entries(params)
    .filter(([key, value]) => !isNullOrUndefined(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
};

// Platform detection helpers
export const isPlatform = {
  ios: () => Platform.OS === 'ios',
  android: () => Platform.OS === 'android',
  web: () => Platform.OS === 'web',
  mobile: () => Platform.OS === 'ios' || Platform.OS === 'android',
};

// Responsive helpers
export const isTablet = (dimensions) => {
  const { width, height } = dimensions;
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  return Math.min(width, height) >= 600 && aspectRatio < 1.6;
};

export const getDeviceType = (dimensions) => {
  if (isTablet(dimensions)) return 'tablet';
  if (isPlatform.mobile()) return 'phone';
  return 'desktop';
};

// Color utilities
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const rgbToHex = (r, g, b) => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getColorLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export const isLightColor = (hex) => {
  return getColorLuminance(hex) > 0.5;
};

// Default export with all utilities
export default {
  // Constants
  constants: constantsDefault,

  // Date utilities
  dateUtils: dateUtilsDefault,

  // Validation utilities
  validationUtils: validationUtilsDefault,

  // Error handling
  errorHandler: errorHandlerDefault,

  // Performance utilities
  performanceUtils: performanceUtilsDefault,

  // Storage utilities
  storageUtils: storageUtilsDefault,

  // React hooks
  hooks: hooksDefault,

  // Helper functions
  formatCurrency,
  formatNumber,
  capitalizeFirstLetter,
  capitalizeWords,
  truncateText,
  generateId,
  generateUUID,
  sleep,
  randomBetween,
  clamp,
  isNullOrUndefined,
  isEmptyString,
  isEmptyObject,
  isEmptyArray,
  removeEmptyValues,
  deepClone,
  flattenObject,
  groupBy,
  sortBy,
  uniqueBy,
  chunk,
  parseQueryString,
  buildQueryString,
  isPlatform,
  isTablet,
  getDeviceType,
  hexToRgb,
  rgbToHex,
  getColorLuminance,
  isLightColor,
};
