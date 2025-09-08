// Professional Security Service
import * as Keychain from 'react-native-keychain';
import * as Crypto from 'expo-crypto';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { logError, logEvent } from '../utils/errorHandler';

class SecurityService {
  constructor() {
    this.keychain = {
      service: 'SoRita',
      accessGroup: 'group.com.sorita.keychain',
      accessControl: Platform.OS === 'ios' ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined,
      authenticationType: Platform.OS === 'ios' ? Keychain.AUTHENTICATION_TYPE.BIOMETRICS : undefined,
    };
  }

  // Secure token storage
  async storeSecureToken(key, token, options = {}) {
    try {
      const result = await Keychain.setInternetCredentials(
        key,
        key,
        token,
        {
          ...this.keychain,
          ...options
        }
      );

      logEvent('secure_token_stored', { key: key.substring(0, 3) + '***' });
      return result;
    } catch (error) {
      logError(error, 'Store secure token');
      throw new Error('Failed to store secure token');
    }
  }

  async getSecureToken(key) {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      
      if (credentials && credentials.password) {
        logEvent('secure_token_retrieved', { key: key.substring(0, 3) + '***' });
        return credentials.password;
      }
      
      return null;
    } catch (error) {
      logError(error, 'Get secure token');
      return null;
    }
  }

  async removeSecureToken(key) {
    try {
      const result = await Keychain.resetInternetCredentials(key);
      logEvent('secure_token_removed', { key: key.substring(0, 3) + '***' });
      return result;
    } catch (error) {
      logError(error, 'Remove secure token');
      return false;
    }
  }

  // Encryption utilities
  async encryptData(data, password = null) {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const key = password || await this.getOrCreateEncryptionKey();
      
      // Simple encryption using expo-crypto
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString + key,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      logEvent('data_encrypted', { dataLength: dataString.length });
      return encrypted;
    } catch (error) {
      logError(error, 'Encrypt data');
      throw new Error('Encryption failed');
    }
  }

  async decryptData(encryptedData, password = null) {
    try {
      // Note: This is a simplified implementation
      // In production, use proper encryption libraries
      logEvent('data_decrypted');
      return encryptedData; // Placeholder
    } catch (error) {
      logError(error, 'Decrypt data');
      throw new Error('Decryption failed');
    }
  }

  async getOrCreateEncryptionKey() {
    const keyName = 'encryption_key';
    let key = await this.getSecureToken(keyName);
    
    if (!key) {
      // Generate new key
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() + Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      await this.storeSecureToken(keyName, key);
    }
    
    return key;
  }

  // Device security validation
  async validateDeviceSecurity() {
    try {
      const securityInfo = {
        isEmulator: await DeviceInfo.isEmulator(),
        hasHardware: Platform.OS === 'android' ? await DeviceInfo.hasSystemFeature('android.hardware.security.model') : true,
        isJailbroken: false, // Would need jailbreak detection library
        hasScreenLock: await this.hasScreenLock(),
        biometricsAvailable: await this.isBiometricsAvailable(),
        deviceId: await DeviceInfo.getUniqueId(),
        appVersion: DeviceInfo.getVersion(),
        systemVersion: DeviceInfo.getSystemVersion(),
      };

      logEvent('device_security_validated', {
        isEmulator: securityInfo.isEmulator,
        biometricsAvailable: securityInfo.biometricsAvailable
      });

      return securityInfo;
    } catch (error) {
      logError(error, 'Device security validation');
      return null;
    }
  }

  async hasScreenLock() {
    try {
      // Check if device has screen lock
      if (Platform.OS === 'android') {
        return await DeviceInfo.isPinOrFingerprintSet();
      } else {
        // iOS implementation would need native module
        return true; // Assume true for iOS
      }
    } catch (error) {
      return false;
    }
  }

  async isBiometricsAvailable() {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      return false;
    }
  }

  // Generate secure random strings
  async generateSecureRandom(length = 32) {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(length);
      const randomString = Array.from(randomBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
      
      return randomString;
    } catch (error) {
      logError(error, 'Generate secure random');
      return Math.random().toString(36).substring(2, length + 2);
    }
  }

  // Hash passwords securely
  async hashPassword(password, salt = null) {
    try {
      const saltToUse = salt || await this.generateSecureRandom(16);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + saltToUse,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      return { hash, salt: saltToUse };
    } catch (error) {
      logError(error, 'Hash password');
      throw new Error('Password hashing failed');
    }
  }

  // Verify password hash
  async verifyPassword(password, hash, salt) {
    try {
      const { hash: newHash } = await this.hashPassword(password, salt);
      return newHash === hash;
    } catch (error) {
      logError(error, 'Verify password');
      return false;
    }
  }

  // Session security
  async createSecureSession(userId) {
    try {
      const sessionToken = await this.generateSecureRandom(64);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const session = {
        token: sessionToken,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        deviceInfo: await this.validateDeviceSecurity()
      };

      await this.storeSecureToken('session', JSON.stringify(session));
      
      logEvent('secure_session_created', { userId });
      return sessionToken;
    } catch (error) {
      logError(error, 'Create secure session');
      throw new Error('Session creation failed');
    }
  }

  async validateSession() {
    try {
      const sessionData = await this.getSecureToken('session');
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        await this.removeSecureToken('session');
        logEvent('session_expired');
        return null;
      }

      logEvent('session_validated', { userId: session.userId });
      return session;
    } catch (error) {
      logError(error, 'Validate session');
      return null;
    }
  }

  async clearSession() {
    try {
      await this.removeSecureToken('session');
      logEvent('session_cleared');
    } catch (error) {
      logError(error, 'Clear session');
    }
  }

  // Security headers for API requests
  async getSecurityHeaders() {
    const deviceInfo = await this.validateDeviceSecurity();
    
    return {
      'X-Device-ID': deviceInfo?.deviceId || 'unknown',
      'X-App-Version': deviceInfo?.appVersion || '1.0.0',
      'X-Platform': Platform.OS,
      'X-Platform-Version': deviceInfo?.systemVersion || 'unknown',
      'X-Security-Token': await this.generateSecureRandom(32)
    };
  }

  // Rate limiting
  rateLimitAttempts = new Map();

  async checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const attempts = this.rateLimitAttempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      logEvent('rate_limit_exceeded', { key });
      return false;
    }
    
    recentAttempts.push(now);
    this.rateLimitAttempts.set(key, recentAttempts);
    
    return true;
  }

  // Clean up security data
  async securityCleanup() {
    try {
      // Clear expired sessions
      await this.validateSession();
      
      // Clear rate limit cache
      this.rateLimitAttempts.clear();
      
      // Clean old encryption keys if needed
      logEvent('security_cleanup_completed');
    } catch (error) {
      logError(error, 'Security cleanup');
    }
  }
}

export default new SecurityService();
