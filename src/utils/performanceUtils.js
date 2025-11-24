/**
 * Performance Utilities
 * Modern performance monitoring and optimization utilities for SoRita
 */

// Performance timing utility
export class PerformanceTimer {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.marks = {};
  }

  start() {
    this.startTime = performance.now();
    if (__DEV__) {
      console.log(` [${this.name}] Started`);
    }
    return this;
  }

  mark(label) {
    if (!this.startTime) {
      console.warn(`Performance timer ${this.name} not started`);
      return this;
    }
    
    const duration = performance.now() - this.startTime;
    this.marks[label] = duration;
    
    if (__DEV__) {
      console.log(` [${this.name}] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return this;
  }

  end() {
    if (!this.startTime) {
      console.warn(`Performance timer ${this.name} not started`);
      return 0;
    }
    
    const totalDuration = performance.now() - this.startTime;
    
    if (__DEV__) {
      console.log(` [${this.name}] Completed: ${totalDuration.toFixed(2)}ms`);
      if (Object.keys(this.marks).length > 0) {
        console.table(this.marks);
      }
    }
    
    return totalDuration;
  }
}

// Debounce utility
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
};

// Throttle utility
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility
export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return (...args) => {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

// Lazy loading utility
export const createLazyLoader = (loadFunction, options = {}) => {
  const { 
    cache = true, 
    timeout = 30000,
    retries = 3 
  } = options;
  
  let promise = null;
  let cached = null;
  
  return async (...args) => {
    // Return cached result if available
    if (cache && cached) {
      return cached;
    }
    
    // Return existing promise if already loading
    if (promise) {
      return promise;
    }
    
    // Create new loading promise
    promise = new Promise(async (resolve, reject) => {
      let attempts = 0;
      
      while (attempts < retries) {
        try {
          const timeoutPromise = new Promise((_, timeoutReject) => 
            setTimeout(() => timeoutReject(new Error('Timeout')), timeout)
          );
          
          const result = await Promise.race([
            loadFunction(...args),
            timeoutPromise
          ]);
          
          if (cache) {
            cached = result;
          }
          
          resolve(result);
          return;
        } catch (error) {
          attempts++;
          
          if (attempts >= retries) {
            reject(error);
            return;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    });
    
    try {
      const result = await promise;
      return result;
    } finally {
      promise = null;
    }
  };
};

// Memory usage monitor (development helper - browser only)
export const getMemoryUsage = () => {
  if (__DEV__) {
    console.log('Memory usage monitoring is only available in browsers with performance.memory API');
  }
  return null;
};

// Batch processing utility
export const batchProcess = async (items, processor, batchSize = 10, delay = 0) => {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
    
    // Add delay between batches if specified
    if (delay > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};

// Queue processor for managing concurrent operations
export class Queue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
      });
      
      this.tryNext();
    });
  }

  tryNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    Promise.resolve(fn())
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.running--;
        this.tryNext();
      });
  }

  clear() {
    this.queue.length = 0;
  }

  get size() {
    return this.queue.length;
  }

  get pending() {
    return this.running;
  }
}

// Image optimization utilities
export const optimizeImageUri = (uri, options = {}) => {
  const {
    width = 400,
    height = 300,
    quality = 0.8,
    format = 'jpeg'
  } = options;
  
  // For Firebase Storage URLs, you can add transformation parameters
  if (uri.includes('firebasestorage.googleapis.com')) {
    const url = new URL(uri);
    url.searchParams.set('alt', 'media');
    // Add more transformation parameters as needed
    return url.toString();
  }
  
  return uri;
};

// Network optimization
export const createNetworkOptimizer = () => {
  const requestQueue = new Queue(3); // Limit concurrent requests
  const cache = new Map();
  
  return {
    fetch: async (url, options = {}) => {
      const cacheKey = `${url}_${JSON.stringify(options)}`;
      
      // Return cached response if available and not expired
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes
          return cached.data;
        }
        cache.delete(cacheKey);
      }
      
      // Add to queue
      const result = await requestQueue.add(() => fetch(url, options));
      
      // Cache successful responses
      if (result.ok) {
        const data = await result.clone().json().catch(() => null);
        if (data) {
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
      }
      
      return result;
    },
    
    clearCache: () => cache.clear(),
    getCacheSize: () => cache.size,
  };
};

// Component render optimization
export const shouldUpdate = (prevProps, nextProps, keys = []) => {
  if (keys.length === 0) {
    keys = Object.keys(nextProps);
  }
  
  return keys.some(key => prevProps[key] !== nextProps[key]);
};

// FPS monitor (development only)
export const createFPSMonitor = () => {
  if (!__DEV__) return null;
  
  let frames = 0;
  let lastTime = performance.now();
  let fps = 0;
  
  const measure = () => {
    frames++;
    const now = performance.now();
    
    if (now >= lastTime + 1000) {
      fps = Math.round((frames * 1000) / (now - lastTime));
      frames = 0;
      lastTime = now;
      
      if (fps < 50) {
        console.warn(` Low FPS detected: ${fps}`);
      }
    }
    
    requestAnimationFrame(measure);
  };
  
  measure();
  
  return {
    getFPS: () => fps,
    stop: () => frames = -1, // Simple way to stop monitoring
  };
};

// Bundle size analyzer (development helper)
export const analyzeBundleSize = () => {
  if (!__DEV__) return;
  
  // Only available in web environment
  if (typeof document === 'undefined') {
    console.log(' [Performance] Bundle size analysis not available in React Native');
    return;
  }
  
  const scripts = document.getElementsByTagName('script');
  let totalSize = 0;
  
  Array.from(scripts).forEach(script => {
    if (script.src) {
      fetch(script.src)
        .then(response => response.blob())
        .then(blob => {
          totalSize += blob.size;
          console.log(` ${script.src}: ${(blob.size / 1024).toFixed(2)}KB`);
        })
        .catch(() => {}); // Ignore CORS errors
    }
  });
  
  setTimeout(() => {
    console.log(` Total estimated bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
  }, 1000);
};

export default {
  PerformanceTimer,
  debounce,
  throttle,
  memoize,
  createLazyLoader,
  getMemoryUsage,
  batchProcess,
  Queue,
  optimizeImageUri,
  createNetworkOptimizer,
  shouldUpdate,
  createFPSMonitor,
  analyzeBundleSize,
};
