// Professional API Service Layer
import NetInfo from '@react-native-community/netinfo';

import { API_CONFIG, FEATURE_FLAGS } from '../config/environment';
import { logError, logEvent } from '../utils/errorHandler';

class APIService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;
    this.isOnline = true;

    // Network monitoring
    this.setupNetworkMonitoring();

    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  setupNetworkMonitoring() {
    NetInfo.addEventListener((state) => {
      this.isOnline = state.isConnected;

      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log('[API] Network status:', state.isConnected ? 'Online' : 'Offline');
      }

      logEvent('network_status_changed', { isConnected: state.isConnected });
    });
  }

  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  async executeRequestInterceptors(config) {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      try {
        processedConfig = await interceptor(processedConfig);
      } catch (error) {
        logError(error, 'Request interceptor');
      }
    }

    return processedConfig;
  }

  async executeResponseInterceptors(response) {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      try {
        processedResponse = await interceptor(processedResponse);
      } catch (error) {
        logError(error, 'Response interceptor');
      }
    }

    return processedResponse;
  }

  async request(endpoint, options = {}) {
    if (!this.isOnline) {
      throw new Error('No internet connection');
    }

    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `SoRita/1.0.0`,
        'X-App-Version': '1.0.0',
        'X-Platform': Platform.OS,
      },
      timeout: this.timeout,
    };

    let config = {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers },
    };

    // Execute request interceptors
    config = await this.executeRequestInterceptors(config);

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      try {
        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Execute response interceptors
        const processedResponse = await this.executeResponseInterceptors({
          data,
          status: response.status,
          headers: response.headers,
          config,
        });

        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.log(`[API] ${config.method} ${url} - ${response.status}`);
        }

        logEvent('api_request_success', {
          endpoint,
          method: config.method,
          status: response.status,
        });

        return processedResponse.data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        throw error;
      }
    });
  }

  async executeWithRetry(operation) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.retryAttempts) {
          logError(error, `API request failed after ${this.retryAttempts} attempts`);
          throw error;
        }

        // Don't retry client errors (4xx)
        if (error.message.includes('HTTP 4')) {
          throw error;
        }

        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.warn(`[API] Attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
        }

        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        this.retryDelay *= 1.5; // Exponential backoff
      }
    }

    throw lastError;
  }

  // HTTP Methods
  async get(endpoint, params = {}, options = {}) {
    const queryString = Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    return this.request(endpoint + queryString, {
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Upload file
  async upload(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers,
      },
      ...options,
    });
  }

  // Batch requests
  async batch(requests) {
    const promises = requests.map(({ endpoint, options }) =>
      this.request(endpoint, options).catch((error) => ({ error }))
    );

    return Promise.all(promises);
  }

  // Cancel all requests (if needed)
  cancelAllRequests() {
    // Implementation would depend on how you want to handle request cancellation
    console.log('[API] Cancelling all requests');
  }
}

// Create singleton instance
const apiService = new APIService();

// Add common interceptors
apiService.addRequestInterceptor(async (config) => {
  // Add auth token if available
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiService.addResponseInterceptor(async (response) => {
  // Handle common response processing
  if (response.data && response.data.timestamp) {
    response.data.receivedAt = new Date().toISOString();
  }
  return response;
});

export default apiService;
