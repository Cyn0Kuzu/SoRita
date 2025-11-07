// Professional Analytics and Monitoring Service
import { getAnalytics, logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { getPerformance, trace } from 'firebase/performance';
import DeviceInfo from 'react-native-device-info';

import { FEATURE_FLAGS, APP_CONFIG } from '../config/environment';
import { logError } from '../utils/errorHandler';
import { app } from '../config/firebase';

class AnalyticsService {
  constructor() {
    this.isEnabled = FEATURE_FLAGS.ENABLE_ANALYTICS && !__DEV__;
    this.crashlyticsEnabled = FEATURE_FLAGS.ENABLE_CRASHLYTICS && !__DEV__;
    this.performanceEnabled = FEATURE_FLAGS.ENABLE_CRASHLYTICS && !__DEV__;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.eventQueue = [];
    this.flushInterval = 30000; // 30 seconds

    this.initializeSession();
    this.startEventFlushing();
  }

  async initializeSession() {
    try {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = Date.now();

      const deviceInfo = await DeviceInfo.getDeviceInfo();

      // Set user properties for analytics
      if (this.isEnabled) {
        await analytics().setUserProperties({
          app_version: APP_CONFIG.VERSION,
          build_number: APP_CONFIG.BUILD_NUMBER,
          device_model: deviceInfo.model,
          device_brand: deviceInfo.brand,
          system_version: deviceInfo.systemVersion,
          session_id: this.sessionId,
        });
      }

      // Set crashlytics attributes
      if (this.crashlyticsEnabled) {
        await crashlytics().setAttributes({
          session_id: this.sessionId,
          app_version: APP_CONFIG.VERSION,
          environment: APP_CONFIG.ENVIRONMENT,
        });
      }

      this.logEvent('session_started', {
        session_id: this.sessionId,
        app_version: APP_CONFIG.VERSION,
        environment: APP_CONFIG.ENVIRONMENT,
      });
    } catch (error) {
      logError(error, 'Analytics initialization');
    }
  }

  // Event logging with queuing
  logEvent(eventName, parameters = {}) {
    try {
      const event = {
        name: eventName,
        parameters: {
          ...parameters,
          session_id: this.sessionId,
          timestamp: Date.now(),
          platform: Platform.OS,
          app_version: APP_CONFIG.VERSION,
        },
        timestamp: Date.now(),
      };

      this.eventQueue.push(event);

      if (__DEV__) {
        console.log(`[Analytics] Event: ${eventName}`, event.parameters);
      }

      // Also log to Firebase Analytics immediately for critical events
      if (this.isEnabled && this.isCriticalEvent(eventName)) {
        this.flushEvent(event);
      }
    } catch (error) {
      logError(error, 'Log event');
    }
  }

  isCriticalEvent(eventName) {
    const criticalEvents = [
      'app_crash',
      'login_success',
      'login_failure',
      'purchase_completed',
      'error_occurred',
      'session_started',
      'session_ended',
    ];
    return criticalEvents.includes(eventName);
  }

  async flushEvent(event) {
    if (!this.isEnabled) return;

    try {
      await analytics().logEvent(event.name, event.parameters);
    } catch (error) {
      logError(error, 'Flush event');
    }
  }

  async flushAllEvents() {
    if (!this.isEnabled || this.eventQueue.length === 0) return;

    try {
      const eventsToFlush = [...this.eventQueue];
      this.eventQueue = [];

      for (const event of eventsToFlush) {
        await this.flushEvent(event);

        // Small delay to prevent overwhelming the service
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`[Analytics] Flushed ${eventsToFlush.length} events`);
    } catch (error) {
      logError(error, 'Flush all events');
    }
  }

  startEventFlushing() {
    setInterval(() => {
      this.flushAllEvents();
    }, this.flushInterval);
  }

  // Screen tracking
  logScreenView(screenName, screenClass = null) {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });

    if (this.isEnabled) {
      analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
  }

  // User identification
  async setUserId(userId) {
    try {
      if (this.isEnabled) {
        await analytics().setUserId(userId);
      }

      if (this.crashlyticsEnabled) {
        await crashlytics().setUserId(userId);
      }

      this.logEvent('user_identified', { user_id: userId });
    } catch (error) {
      logError(error, 'Set user ID');
    }
  }

  async setUserProperties(properties) {
    try {
      if (this.isEnabled) {
        await analytics().setUserProperties(properties);
      }

      if (this.crashlyticsEnabled) {
        await crashlytics().setAttributes(properties);
      }

      this.logEvent('user_properties_set', properties);
    } catch (error) {
      logError(error, 'Set user properties');
    }
  }

  // Error and crash reporting
  recordError(error, context = '', isFatal = false) {
    try {
      const errorInfo = {
        message: error.message || 'Unknown error',
        stack: error.stack || '',
        context,
        is_fatal: isFatal,
        session_id: this.sessionId,
        timestamp: Date.now(),
      };

      if (this.crashlyticsEnabled) {
        crashlytics().log(`Error in ${context}: ${error.message}`);
        crashlytics().recordError(error);
      }

      this.logEvent('error_occurred', errorInfo);

      if (__DEV__) {
        console.error(`[Analytics] Error recorded:`, errorInfo);
      }
    } catch (recordingError) {
      console.error('[Analytics] Failed to record error:', recordingError);
    }
  }

  recordCrash(error, context = '') {
    this.recordError(error, context, true);
    this.logEvent('app_crash', {
      error_message: error.message,
      context,
      session_id: this.sessionId,
    });
  }

  // Performance monitoring
  startTrace(traceName) {
    if (!this.performanceEnabled) {
      return {
        stop: () => {},
        putAttribute: () => {},
        putMetric: () => {},
        incrementMetric: () => {},
      };
    }

    try {
      const trace = perf().startTrace(traceName);

      this.logEvent('trace_started', { trace_name: traceName });

      return {
        stop: async () => {
          try {
            await trace.stop();
            this.logEvent('trace_stopped', { trace_name: traceName });
          } catch (error) {
            logError(error, 'Stop trace');
          }
        },
        putAttribute: (attribute, value) => {
          try {
            trace.putAttribute(attribute, value);
          } catch (error) {
            logError(error, 'Put trace attribute');
          }
        },
        putMetric: (metric, value) => {
          try {
            trace.putMetric(metric, value);
          } catch (error) {
            logError(error, 'Put trace metric');
          }
        },
        incrementMetric: (metric, incrementBy = 1) => {
          try {
            trace.incrementMetric(metric, incrementBy);
          } catch (error) {
            logError(error, 'Increment trace metric');
          }
        },
      };
    } catch (error) {
      logError(error, 'Start trace');
      return {
        stop: () => {},
        putAttribute: () => {},
        putMetric: () => {},
        incrementMetric: () => {},
      };
    }
  }

  // Custom metrics
  recordMetric(metricName, value, unit = '') {
    this.logEvent('custom_metric', {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
    });
  }

  // Business events
  recordPurchase(value, currency, items = []) {
    this.logEvent('purchase', {
      value,
      currency,
      items: items.length,
      item_details: JSON.stringify(items),
    });

    if (this.isEnabled) {
      analytics().logPurchase({
        value,
        currency,
        items,
      });
    }
  }

  recordLogin(method = 'email') {
    this.logEvent('login', { method });

    if (this.isEnabled) {
      analytics().logLogin({ method });
    }
  }

  recordSignUp(method = 'email') {
    this.logEvent('sign_up', { method });

    if (this.isEnabled) {
      analytics().logSignUp({ method });
    }
  }

  recordShare(contentType = 'unknown', itemId = null) {
    this.logEvent('share', {
      content_type: contentType,
      item_id: itemId,
    });

    if (this.isEnabled) {
      analytics().logShare({
        content_type: contentType,
        item_id: itemId,
      });
    }
  }

  // Session management
  endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;

    this.logEvent('session_ended', {
      session_id: this.sessionId,
      session_duration: sessionDuration,
      events_logged: this.eventQueue.length,
    });

    // Flush all remaining events
    this.flushAllEvents();
  }

  // A/B Testing support
  recordExperiment(experimentName, variant) {
    this.logEvent('experiment_exposure', {
      experiment_name: experimentName,
      variant,
    });
  }

  // Performance metrics
  measurePerformance(operationName, operation) {
    return new Promise(async (resolve, reject) => {
      const trace = this.startTrace(`performance_${operationName}`);
      const startTime = Date.now();

      try {
        const result = await operation();
        const duration = Date.now() - startTime;

        trace.putMetric('duration_ms', duration);
        trace.putAttribute('status', 'success');
        trace.stop();

        this.recordMetric(`${operationName}_duration`, duration, 'ms');

        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;

        trace.putMetric('duration_ms', duration);
        trace.putAttribute('status', 'error');
        trace.putAttribute('error_message', error.message);
        trace.stop();

        this.recordError(error, `Performance measurement: ${operationName}`);

        reject(error);
      }
    });
  }

  // Get analytics data for debugging
  getAnalyticsInfo() {
    return {
      sessionId: this.sessionId,
      sessionStartTime: this.sessionStartTime,
      queuedEvents: this.eventQueue.length,
      isEnabled: this.isEnabled,
      crashlyticsEnabled: this.crashlyticsEnabled,
      performanceEnabled: this.performanceEnabled,
    };
  }
}

export default new AnalyticsService();
