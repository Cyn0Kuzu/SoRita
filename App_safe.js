import React, { useState, useEffect } from 'react';
import {  StatusBar, Platform, LogBox , View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { EdgeToEdge } from 'react-native-edge-to-edge';

// Ignore warnings that can cause crashes
LogBox.ignoreLogs([
  'Warning: ...',
  'Require cycle:',
  'Remote debugger',
  'Setting a timer',
  'VirtualizedLists should never be nested',
  'Animated: `useNativeDriver`',
  'Firebase Auth',
  'AsyncStorage'
]);

// Global error handler
const setupErrorHandler = () => {
  try {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('🚨 Global Error:', error.message);
      if (__DEV__) {
        console.error('Stack:', error.stack);
      }
      // Only crash on fatal errors in production
      if (isFatal) {
        originalHandler(error, isFatal);
      }
    });
  } catch (e) {
    console.error('Error handler setup failed:', e);
  }
};

setupErrorHandler();

// Safe Firebase imports
let auth = null;
let onAuthStateChanged = null;

try {
  const firebaseAuth = require('firebase/auth');
  const firebaseConfig = require('./src/config/firebase');
  auth = firebaseConfig.auth;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
  console.log('✅ Firebase loaded successfully');
} catch (error) {
  console.error('❌ Firebase import failed:', error.message);
}

// Safe component imports
let AppStatusBar, theme, WelcomeScreen, LoginScreen, RegisterScreen, EmailVerificationScreen, MainTabNavigator, LoadingScreen;

try {
  AppStatusBar = require('./src/components/AppStatusBar').default;
  theme = require('./src/theme/theme').theme;
  WelcomeScreen = require('./src/screens/WelcomeScreen').default;
  LoginScreen = require('./src/screens/LoginScreen').default;
  RegisterScreen = require('./src/screens/RegisterScreen').default;
  EmailVerificationScreen = require('./src/screens/EmailVerificationScreen').default;
  MainTabNavigator = require('./src/navigation/MainTabNavigator').default;
  LoadingScreen = require('./src/components/LoadingScreen').default;
  console.log('✅ Components loaded successfully');
} catch (error) {
  console.error('❌ Component import failed:', error.message);
  // Fallback components
  AppStatusBar = () => <StatusBar barStyle="light-content" backgroundColor="#2196F3" />;
  LoadingScreen = () => null;
  WelcomeScreen = () => null;
  LoginScreen = () => null;
  RegisterScreen = () => null;
  EmailVerificationScreen = () => null;
  MainTabNavigator = () => null;
  theme = {};
}

const Stack = createStackNavigator();


// Error Boundary to prevent app crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('App Error:', error);
    console.log('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
    <ErrorBoundary>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            The app encountered an error. Please restart the app.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ padding: 12, backgroundColor: '#0ea5e9', borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Initialize app safely
  useEffect(() => {
    try {
      if (Platform.OS === 'android') {
        EdgeToEdge.enable();
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
        console.log('✅ Android EdgeToEdge enabled');
      }
    } catch (error) {
      console.error('EdgeToEdge setup failed:', error.message);
    }
  }, []);

  // Auth listener with safety checks
  useEffect(() => {
    if (!auth || !onAuthStateChanged) {
      console.warn('⚠️ Firebase not available, app will work in offline mode');
      setInitializing(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('🔐 Auth state:', firebaseUser ? 'Authenticated' : 'Not authenticated');
        setUser(firebaseUser);
        if (initializing) {
          setInitializing(false);
          console.log('🏁 App initialization complete');
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('❌ Auth setup failed:', error.message);
      setInitializing(false);
      return () => {};
    }
  }, [initializing]);

  // Loading state
  if (initializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AppStatusBar />
          {LoadingScreen && <LoadingScreen />}
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  // Main app
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppStatusBar />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              MainTabNavigator && (
                <Stack.Screen name="MainApp" component={MainTabNavigator} />
              )
            ) : (
              <>
                {WelcomeScreen && (
                  <Stack.Screen name="Welcome" component={WelcomeScreen} />
                )}
                {LoginScreen && (
                  <Stack.Screen name="Login" component={LoginScreen} />
                )}
                {RegisterScreen && (
                  <Stack.Screen name="Register" component={RegisterScreen} />
                )}
                {EmailVerificationScreen && (
                  <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                )}
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
