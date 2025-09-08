// Performance monitoring utilities
import { InteractionManager, Dimensions } from 'react-native';

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.screenDimensions = Dimensions.get('window');
  }

  startTimer(label) {
    this.metrics[label] = {
      startTime: Date.now(),
      endTime: null,
      duration: null
    };
  }

  endTimer(label) {
    if (this.metrics[label]) {
      this.metrics[label].endTime = Date.now();
      this.metrics[label].duration = this.metrics[label].endTime - this.metrics[label].startTime;
      
      if (__DEV__) {
        console.log(`[Performance] ${label}: ${this.metrics[label].duration}ms`);
      }
      
      return this.metrics[label].duration;
    }
    return null;
  }

  measureScreenTransition(screenName) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      InteractionManager.runAfterInteractions(() => {
        const duration = Date.now() - startTime;
        
        if (__DEV__) {
          console.log(`[Performance] Screen transition to ${screenName}: ${duration}ms`);
        }
        
        resolve(duration);
      });
    });
  }

  measureAsyncOperation(label, operation) {
    return new Promise(async (resolve, reject) => {
      this.startTimer(label);
      
      try {
        const result = await operation();
        const duration = this.endTimer(label);
        
        resolve({ result, duration });
      } catch (error) {
        this.endTimer(label);
        reject(error);
      }
    });
  }

  getMemoryInfo() {
    // This would require native modules for detailed memory info
    // For now, return basic screen info
    return {
      screenWidth: this.screenDimensions.width,
      screenHeight: this.screenDimensions.height,
      scale: this.screenDimensions.scale
    };
  }

  logMetrics() {
    if (__DEV__) {
      console.log('[Performance] Metrics Summary:', this.metrics);
      console.log('[Performance] Device Info:', this.getMemoryInfo());
    }
  }
}

export default new PerformanceMonitor();
