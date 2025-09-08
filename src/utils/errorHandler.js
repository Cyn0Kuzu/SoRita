// Global error handler for production
import { ErrorUtils } from 'react-native';

export const setupGlobalErrorHandler = () => {
  // Only set up in production
  if (__DEV__) return;

  const defaultHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Global error caught:', error);
    
    // Log to console in production
    logError(error, { isFatal });

    // Call default handler
    defaultHandler(error, isFatal);
  });

  // Handle unhandled promise rejections
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      logError(new Error(String(reason)), { type: 'unhandledRejection' });
    });
  }
};

export const logError = (error, context = {}) => {
  try {
    console.error('🔥 [Error]', error.message || error, context);
    
    // In production, send to your logging service
    const errorData = {
      message: error.message || String(error),
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
    };
    
    if (!__DEV__) {
      console.error('🔥 [Error Data]', JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error('🔥 [Error Logging Failed]', e);
  }
};

export const logEvent = (eventName, parameters = {}) => {
  console.log(`[Analytics] ${eventName}:`, parameters);
};
