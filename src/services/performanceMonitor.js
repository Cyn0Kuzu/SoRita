/**
 * Performance Monitor
 * Real-time performance tracking and optimization for SoRita
 */

import { logger } from '../utils/logger';
import { analyticsService } from './analyticsService';
import { ENV, ENVIRONMENTS } from '../config/environment';
import { Platform } from 'react-native';

const performanceLogger = logger.createServiceLogger('PerformanceMonitor');

class PerformanceMonitor {
  constructor() {
    this.isInitialized = false;
    this.startTime = Date.now(); // Add startTime property for uptime calculation
    this.metrics = new Map();
    this.observers = [];
    this.thresholds = {
      slowRender: 16, // 16ms for 60fps
      memoryWarning: 100 * 1024 * 1024, // 100MB
      largeBundle: 5 * 1024 * 1024, // 5MB
      slowNavigation: 1000, // 1 second
      httpTimeout: 5000, // 5 seconds
    };
  }

  // Initialize performance monitoring
  async initialize() {
    try {
      if (this.isInitialized) return;

      performanceLogger.info('Initializing performance monitor...');

      // Start monitoring different aspects
      this.startNavigationTracking();
      this.startMemoryMonitoring();
      this.startNetworkMonitoring();
      this.startRenderTracking();
      this.startErrorTracking();

      // Monitor app startup performance
      this.trackAppStartup();

      this.isInitialized = true;
      performanceLogger.info('Performance monitor initialized successfully');

    } catch (error) {
      performanceLogger.error('Failed to initialize performance monitor:', error);
    }
  }

  // Track app startup time
  trackAppStartup() {
    const startTime = Date.now();
    
    // Track different startup phases
    this.markStart('app_startup');
    this.markStart('js_bundle_load');
    
    // Monitor when app becomes interactive
    setTimeout(() => {
      this.markEnd('app_startup');
      const startupTime = this.getMetric('app_startup');
      
      performanceLogger.info(`App startup completed in ${startupTime}ms`);
      
      // Track startup performance only in production
      if (ENV !== ENVIRONMENTS.DEVELOPMENT) {
        analyticsService.trackPerformance('app_startup_time', startupTime, {
          is_slow: startupTime > 3000,
          platform: Platform.OS,
        });
      }

      // Report slow startup
      if (startupTime > 5000) {
        this.reportSlowPerformance('app_startup', startupTime);
      }
    }, 100);
  }

  // Start navigation performance tracking
  startNavigationTracking() {
    // This would integrate with React Navigation
    performanceLogger.debug('Navigation tracking started');
  }

  // Start memory monitoring
  startMemoryMonitoring() {
    if (ENV === ENVIRONMENTS.DEVELOPMENT) {
      // Monitor memory usage periodically
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  // Check memory usage
  async checkMemoryUsage() {
    try {
      // On React Native, memory monitoring is limited
      // This would use native modules for accurate memory tracking
      const memoryInfo = this.getMemoryInfo();
      
      if (memoryInfo.used > this.thresholds.memoryWarning) {
        performanceLogger.warn('High memory usage detected:', memoryInfo);
        
        // Track memory warning
        analyticsService.trackEvent('performance_warning', {
          type: 'high_memory',
          memory_used: memoryInfo.used,
          threshold: this.thresholds.memoryWarning,
        });

        // Suggest garbage collection
        this.suggestGarbageCollection();
      }

    } catch (error) {
      performanceLogger.error('Error checking memory usage:', error);
    }
  }

  // Get memory information
  getMemoryInfo() {
    // This is a placeholder - real implementation would use native modules
    return {
      used: 0,
      available: 0,
      total: 0,
    };
  }

  // Start network monitoring
  startNetworkMonitoring() {
    // Monitor network requests
    this.interceptNetworkRequests();
  }

  // Intercept network requests for monitoring
  interceptNetworkRequests() {
    // This would wrap fetch or XMLHttpRequest to monitor network performance
    const originalFetch = global.fetch;
    
    global.fetch = async (url, options) => {
      const startTime = Date.now();
      const requestId = `request_${Date.now()}_${Math.random()}`;
      
      this.markStart(requestId);
      
      try {
        const response = await originalFetch(url, options);
        const duration = Date.now() - startTime;
        
        // Track network performance
        this.trackNetworkRequest(url, duration, response.status, response.ok);
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.trackNetworkRequest(url, duration, 0, false, error);
        throw error;
      } finally {
        this.markEnd(requestId);
      }
    };
  }

  // Track network request performance
  trackNetworkRequest(url, duration, status, success, error = null) {
    const isSlowRequest = duration > this.thresholds.httpTimeout;
    
    // Only warn for actual performance issues (longer requests or real errors)
    // Don't warn for development server logs or expected long-running requests
    const urlString = url?.toString() || '';
    const isDevServerLog = urlString.includes('/logs') || urlString.includes('expo.dev');
    const isExpectedSlowRequest = duration > 3000 && duration < 10000; // 3-10 seconds might be normal for some operations
    
    if ((isSlowRequest && !isDevServerLog && !isExpectedSlowRequest) || (!success && !isDevServerLog)) {
      performanceLogger.warn('Network performance issue:', {
        url: this.sanitizeUrl(url),
        duration,
        status,
        success,
        error: error?.message,
      });
    }

    // Only track significant metrics to reduce noise and check if analytics is enabled
    if ((duration > 1000 || !success) && ENV !== ENVIRONMENTS.DEVELOPMENT) {
      analyticsService.trackPerformance('network_request', duration, {
        url: this.sanitizeUrl(url),
        status,
        success,
        is_slow: isSlowRequest,
        error_type: error?.name,
      });
    }
  }

  // Sanitize URL for privacy
  sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return 'invalid_url';
    }
  }

  // Start render performance tracking
  startRenderTracking() {
    // This would integrate with React's performance tools
    performanceLogger.debug('Render tracking started');
  }

  // Start error tracking
  startErrorTracking() {
    // Monitor JavaScript errors
    this.setupErrorInterception();
  }

  // Setup error interception
  setupErrorInterception() {
    const originalError = console.error;
    
    console.error = (...args) => {
      // Track errors that might affect performance
      const errorMessage = args[0]?.toString() || '';
      
      if (this.isPerformanceRelatedError(errorMessage)) {
        this.trackPerformanceError(errorMessage, args);
      }
      
      originalError.apply(console, args);
    };
  }

  // Check if error is performance related
  isPerformanceRelatedError(message) {
    const performanceKeywords = [
      'memory',
      'timeout',
      'slow',
      'performance',
      'lag',
      'freeze',
      'ANR',
      'OOM',
    ];
    
    return performanceKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // Track performance related errors
  trackPerformanceError(message, args) {
    performanceLogger.warn('Performance error detected:', message);
    
    // Only track errors in production to avoid noise
    if (ENV !== ENVIRONMENTS.DEVELOPMENT) {
      analyticsService.trackEvent('performance_error', {
        error_message: message,
        error_args: JSON.stringify(args),
      });
    }
  }

  // Mark performance measurement start
  markStart(label) {
    const timestamp = Date.now();
    this.metrics.set(`${label}_start`, timestamp);
    
    // Only log in development and reduce frequency even more
    if (ENV === ENVIRONMENTS.DEVELOPMENT && Math.random() < 0.02) {
      performanceLogger.debug(`Performance mark start: ${label}`);
    }
  }

  // Mark performance measurement end
  markEnd(label) {
    const timestamp = Date.now();
    const startTime = this.metrics.get(`${label}_start`);
    
    if (startTime) {
      const duration = timestamp - startTime;
      this.metrics.set(label, duration);
      
      // Only log slow operations or occasionally in development
      if (ENV === ENVIRONMENTS.DEVELOPMENT && (duration > 2000 || Math.random() < 0.05)) {
        performanceLogger.debug(`Performance mark end: ${label} - ${duration}ms`);
      }
      
      return duration;
    }
    
    return null;
  }

  // Get performance metric
  getMetric(label) {
    return this.metrics.get(label);
  }

  // Get all metrics
  getAllMetrics() {
    const metrics = {};
    for (const [key, value] of this.metrics.entries()) {
      if (!key.endsWith('_start')) {
        metrics[key] = value;
      }
    }
    return metrics;
  }

  // Report slow performance
  reportSlowPerformance(operation, duration) {
    performanceLogger.warn(`Slow performance detected: ${operation} took ${duration}ms`);
    
    analyticsService.trackEvent('slow_performance', {
      operation,
      duration,
      threshold_exceeded: true,
    });
  }

  // Suggest garbage collection
  suggestGarbageCollection() {
    if (global.gc && ENV === ENVIRONMENTS.DEVELOPMENT) {
      performanceLogger.info('Suggesting garbage collection...');
      global.gc();
    }
  }

  // Optimize app performance
  async optimizePerformance() {
    try {
      performanceLogger.info('Running performance optimization...');
      
      // Clear old metrics
      this.clearOldMetrics();
      
      // Suggest garbage collection
      this.suggestGarbageCollection();
      
      // Clear caches if needed
      await this.clearCachesIfNeeded();
      
      performanceLogger.info('Performance optimization completed');

    } catch (error) {
      performanceLogger.error('Error during performance optimization:', error);
    }
  }

  // Clear old metrics
  clearOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, value] of this.metrics.entries()) {
      if (typeof value === 'number' && value < oneHourAgo) {
        this.metrics.delete(key);
      }
    }
  }

  // Clear caches if needed
  async clearCachesIfNeeded() {
    const memoryInfo = this.getMemoryInfo();
    
    if (memoryInfo.used > this.thresholds.memoryWarning * 0.8) {
      // Clear some caches to free memory
      performanceLogger.info('Clearing caches to free memory...');
      
      // This would clear various app caches
      // Implementation depends on your caching strategy
    }
  }

  // Get performance report
  getPerformanceReport() {
    const metrics = this.getAllMetrics();
    const memoryInfo = this.getMemoryInfo();
    
    return {
      metrics,
      memory: memoryInfo,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      isHealthy: this.isPerformanceHealthy(),
    };
  }

  // Check if performance is healthy
  isPerformanceHealthy() {
    const metrics = this.getAllMetrics();
    
    // Check for performance issues
    const hasSlowOperations = Object.values(metrics).some(duration => 
      duration > this.thresholds.slowNavigation
    );
    
    const memoryInfo = this.getMemoryInfo();
    const hasMemoryIssues = memoryInfo.used > this.thresholds.memoryWarning;
    
    return !hasSlowOperations && !hasMemoryIssues;
  }

  // Cleanup
  cleanup() {
    // Restore original functions
    // Clear intervals
    // Remove observers
    
    performanceLogger.debug('Performance monitor cleaned up');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const markStart = (label) => performanceMonitor.markStart(label);
export const markEnd = (label) => performanceMonitor.markEnd(label);
export const getMetric = (label) => performanceMonitor.getMetric(label);
export const optimizePerformance = () => performanceMonitor.optimizePerformance();

export default performanceMonitor;
