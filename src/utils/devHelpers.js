/**
 * Development Helper Utilities
 * Tools to help with development and testing
 */
import { sendPasswordResetEmail } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

import { auth } from '../config/firebase';
import { AuthService } from '../services/authService';

export const DevHelpers = {
  // Test account credentials for development
  TEST_ACCOUNTS: {
    'cayankuzu.0@gmail.com': {
      email: 'cayankuzu.0@gmail.com',
      displayName: 'Cayan Kuzu',
      commonPasswords: ['12345678', '123456789', 'password123', 'cayan123', 'test1234'],
    },
    'finduk513@gmail.com': {
      email: 'finduk513@gmail.com',
      displayName: 'Test User',
      commonPasswords: ['12345678', '123456789', 'password123', 'test1234'],
    },
  },

  // Help user with login issues
  async helpWithLogin(email) {
    if (!__DEV__) {
      console.warn('DevHelpers only available in development mode');
      return { success: false, message: 'Only available in development mode' };
    }

    console.log('🔧 [DevHelpers] Login Help for:', email);

    const testAccount = this.TEST_ACCOUNTS[email.toLowerCase()];
    if (testAccount) {
      console.log('✅ [DevHelpers] This is a known test account');
      console.log('📝 [DevHelpers] Try these common passwords:');
      testAccount.commonPasswords.forEach((pwd, index) => {
        console.log(`   ${index + 1}. "${pwd}"`);
      });
      console.log('🔄 [DevHelpers] If none work, you can reset the password');
      console.log(`💡 [DevHelpers] Run: DevHelpers.resetTestPassword("${email}")`);
    } else {
      console.log('❓ [DevHelpers] This is not a known test account');
      console.log('📋 [DevHelpers] Available test accounts:');
      Object.keys(this.TEST_ACCOUNTS).forEach((testEmail) => {
        console.log(`   • ${testEmail}`);
      });
    }
  },

  // Reset test account password
  async resetTestPassword(email) {
    if (!__DEV__) {
      console.warn('DevHelpers only available in development mode');
      return { success: false, message: 'Only available in development mode' };
    }

    try {
      console.log('🔧 [DevHelpers] Resetting password for test account:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('✅ [DevHelpers] Password reset email sent successfully');
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('❌ [DevHelpers] Password reset failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Show login debug info
  showLoginDebugInfo() {
    if (!__DEV__) {
      console.warn('DevHelpers only available in development mode');
      return { success: false, message: 'Only available in development mode' };
    }

    console.log('🔧 [DevHelpers] ===== LOGIN DEBUG INFO =====');
    console.log('📱 [DevHelpers] Available test accounts:');

    Object.entries(this.TEST_ACCOUNTS).forEach(([email, info]) => {
      console.log(`\n📧 Email: ${email}`);
      console.log(`👤 Name: ${info.displayName}`);
      console.log(`🔑 Common passwords to try:`);
      info.commonPasswords.forEach((pwd, index) => {
        console.log(`   ${index + 1}. "${pwd}"`);
      });
    });

    console.log('\n💡 [DevHelpers] If login fails:');
    console.log('   1. Double-check email spelling');
    console.log('   2. Try the common passwords listed above');
    console.log('   3. Use password reset if needed');
    console.log('   4. Check Firebase Auth console for user status');
    console.log('\n🛠️ [DevHelpers] Helper commands:');
    console.log('   • DevHelpers.helpWithLogin("email@example.com")');
    console.log('   • DevHelpers.resetTestPassword("email@example.com")');
    console.log('   • DevHelpers.testSecureStore() - Test storage functionality');
    console.log('===============================');
  },

  // Quick login with test account
  async quickLogin(email, passwordIndex = 0) {
    if (!__DEV__) {
      console.warn('DevHelpers only available in development mode');
      return { success: false, message: 'Only available in development mode' };
    }

    const testAccount = this.TEST_ACCOUNTS[email.toLowerCase()];
    if (!testAccount) {
      console.error('❌ [DevHelpers] Unknown test account:', email);
      this.showLoginDebugInfo();
      return { success: false, error: 'Unknown test account' };
    }

    const password = testAccount.commonPasswords[passwordIndex];
    if (!password) {
      console.error('❌ [DevHelpers] Invalid password index:', passwordIndex);
      console.log('Available passwords:', testAccount.commonPasswords);
      return { success: false, error: 'Invalid password index' };
    }

    try {
      console.log('🚀 [DevHelpers] Attempting quick login...');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);

      const result = await AuthService.loginUser(email, password);
      console.log('✅ [DevHelpers] Quick login successful!');
      return result;
    } catch (error) {
      console.error('❌ [DevHelpers] Quick login failed:', error.message);
      console.log('💡 [DevHelpers] Trying to help with this error...');

      // If it's a credentials error, try next password
      if (error.message.includes('hatalı') || error.message.includes('invalid')) {
        const nextIndex = passwordIndex + 1;
        if (nextIndex < testAccount.commonPasswords.length) {
          console.log(`🔄 [DevHelpers] Trying next password (index ${nextIndex})...`);
          return this.quickLogin(email, nextIndex);
        } else {
          console.log('🔄 [DevHelpers] All passwords tried. You may need to reset the password.');
          this.helpWithLogin(email);
          return { success: false, error: 'All passwords failed' };
        }
      } else {
        this.helpWithLogin(email);
        return { success: false, error: error.message };
      }
    }
  },

  // Test SecureStore functionality
  async testSecureStore() {
    if (!__DEV__) {
      console.warn('DevHelpers only available in development mode');
      return;
    }

    try {
      console.log('🔧 [DevHelpers] Testing SecureStore functionality...');

      const testKey = `test_key_${Date.now()}`;
      const testValue = `test_value_${Math.random()}`;

      // Test setting
      await SecureStore.setItemAsync(testKey, testValue);
      console.log('✅ [DevHelpers] SecureStore set successful');

      // Test getting
      const retrievedValue = await SecureStore.getItemAsync(testKey);
      if (retrievedValue === testValue) {
        console.log('✅ [DevHelpers] SecureStore get successful');
      } else {
        console.log("❌ [DevHelpers] SecureStore get failed - values don't match");
      }

      // Test deleting
      await SecureStore.deleteItemAsync(testKey);
      console.log('✅ [DevHelpers] SecureStore delete successful');

      const deletedValue = await SecureStore.getItemAsync(testKey);
      if (deletedValue === null) {
        console.log('✅ [DevHelpers] SecureStore verification successful - value was deleted');
      } else {
        console.log('❌ [DevHelpers] SecureStore verification failed - value still exists');
      }

      console.log('🎉 [DevHelpers] SecureStore test completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ [DevHelpers] SecureStore test failed:', error.message);
      console.log('💡 [DevHelpers] This explains why login credentials cannot be saved');
      return { success: false, error: error.message };
    }
  },
};

// Make available globally in development
if (__DEV__ && typeof global !== 'undefined') {
  global.DevHelpers = DevHelpers;
  console.log('🔧 [DevHelpers] Available globally as DevHelpers');
  console.log('💡 [DevHelpers] Try: DevHelpers.showLoginDebugInfo()');
}

export default DevHelpers;
