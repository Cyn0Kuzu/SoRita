/**
 * Professional Project Health Check
 * Tests core services and imports without full app initialization
 */

console.log('🔍 Starting SoRita project health check...');

try {
  // Test Core React Native imports
  console.log('📱 Testing React Native core...');
  const RN = require('react-native');
  console.log('✅ React Native core imports successful');

  // Test Navigation imports
  console.log('🧭 Testing Navigation imports...');
  const Navigation = require('@react-navigation/native');
  const StackNav = require('@react-navigation/stack');
  console.log('✅ Navigation imports successful');

  // Test Firebase config
  console.log('🔥 Testing Firebase config...');
  const FirebaseConfig = require('./src/config/firebase');
  console.log('✅ Firebase config imports successful');

  // Test Services
  console.log('⚙️ Testing Service imports...');
  const ComprehensiveService = require('./src/services/comprehensiveDataService');
  const AuthService = require('./src/services/authService');
  const GlobalState = require('./src/services/globalStateService');
  console.log('✅ Core services import successful');

  // Test Screens
  console.log('📱 Testing Screen imports...');
  const WelcomeScreen = require('./src/screens/WelcomeScreen');
  const LoginScreen = require('./src/screens/LoginScreen');
  console.log('✅ Screen imports successful');

  // Test Components
  console.log('🧩 Testing Component imports...');
  const LoadingScreen = require('./src/components/LoadingScreen');
  console.log('✅ Component imports successful');

  console.log('🎉 All core imports successful! Project structure is healthy.');
  console.log('📊 Import Summary:');
  console.log('   ✅ React Native core');
  console.log('   ✅ Navigation system');
  console.log('   ✅ Firebase configuration');
  console.log('   ✅ Core services');
  console.log('   ✅ Screen components');
  console.log('   ✅ UI components');
  
} catch (error) {
  console.error('❌ Health check failed:', error.message);
  console.error('📍 Error location:', error.stack?.split('\n')[1]);
}
