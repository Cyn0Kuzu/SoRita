import React, { useState, useEffect } from 'react';
import { StatusBar, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Global error handlers
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out known warnings/errors that are safe to ignore
  const message = args[0]?.toString() || '';
  if (message.includes('VirtualizedList') || 
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount')) {
    return; // Suppress these warnings
  }
  originalConsoleError.apply(console, args);
};

// Handle unhandled promise rejections (React Native compatible)
const handleUnhandledRejection = (reason) => {
  console.log('🚨 [App] Unhandled promise rejection:', reason);
};

// Handle uncaught exceptions (if available)
if (typeof process !== 'undefined' && process.on) {
  process.on('uncaughtException', (error) => {
    console.log('🚨 [App] Uncaught exception:', error.message);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.log('🚨 [App] Unhandled rejection at:', promise, 'reason:', reason);
    handleUnhandledRejection(reason);
  });
}

// Minimal screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import GlobalStateService from './src/services/globalStateService';

import { theme, colors } from './src/theme/theme';
import { auth } from './src/config/firebase';
import { configureGlobalStatusBar, AppStatusBar } from './src/components/AppStatusBar';
import { getRegistrationInProgress, AuthService } from './src/services/authService';
import { 
  registerForPushNotifications, 
  handleNotificationReceived, 
  handleNotificationResponse 
} from './src/services/pushNotificationService';

// Import comprehensive data services
import ComprehensiveDataService from './src/services/comprehensiveDataService';
import { OnboardingService } from './src/services/onboardingService';
import ActivityService from './src/services/activityService';
import UserDataService from './src/services/userDataService';
import ImageMaintenanceService from './src/services/imageMaintenanceService';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  
  // Configure global StatusBar
  configureGlobalStatusBar();
  
  console.log('🚀 [App] Application starting...');
  
  // Initialize user data after authentication
  const initializeUserData = async (firebaseUser) => {
    try {
      console.log('📊 [App] Initializing user data (fast mode)...');
      
      // Fast initialization - minimal required data only
      const result = await ComprehensiveDataService.initializeUserData({
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ')[1] || '',
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      }, true); // Enable fast mode
      
      if (result.success) {
        setDataInitialized(true);
        console.log('✅ [App] Fast user data initialization complete');
      } else {
        console.warn('⚠️ [App] User data initialization failed');
        setDataInitialized(false);
      }
    } catch (error) {
      console.error('❌ [App] Critical error during user data initialization:', error);
      setDataInitialized(false);
    }
  };

  // Register for push notifications after user auth and data initialization
  useEffect(() => {
    if (user && dataInitialized) {
      console.log('📱 [App] Registering for push notifications...');
      registerForPushNotifications().catch(error => {
        console.warn('⚠️ [App] Push notification registration failed:', error);
      });
    }
  }, [user, dataInitialized]);
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 [App] Initializing authentication...');

        // First, set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('🔐 [App] Auth state changed:', firebaseUser?.email || 'No user');
          
          if (firebaseUser) {
            // User is signed in
            console.log('✅ [App] User is authenticated:', firebaseUser.email);
            
            // Initialize comprehensive user data
            if (!dataInitialized) {
              await initializeUserData(firebaseUser);
            }
            
            setUser(firebaseUser);
            
            // Initialize global state for logged in user
            await GlobalStateService.initialize();
            
            console.log('✅ [App] User session restored successfully');
          } else {
            setUser(null);
            setDataInitialized(false);
            
            // Clear global state
            GlobalStateService.clearState();
            
            console.log('🚪 [App] User signed out or no active session');
          }
          
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('❌ [App] Error initializing auth:', error);
        setLoading(false);
      }
    };

    const unsubscribe = initializeAuth();
    return () => {
      unsubscribe?.then(unsub => unsub?.());
    };
  }, []); // Empty dependency array to run only once
  
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppStatusBar />
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={colors.primary} 
            translucent={false} 
          />
          
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              transitionSpec: {
                open: {
                  animation: 'timing',
                  config: {
                    duration: 300,
                  },
                },
                close: {
                  animation: 'timing',
                  config: {
                    duration: 300,
                  },
                },
              },
            }}
          >
            {loading ? (
              // Show loading screen while checking auth state
              <Stack.Screen name="Loading" component={LoadingScreen} />
            ) : user ? (
              // User is logged in, show main app
              <>
                <Stack.Screen name="MainTab" component={MainTabNavigator} />
                <Stack.Screen 
                  name="Notifications" 
                  component={NotificationsScreen}
                  options={{
                    gestureEnabled: false,
                  }}
                />
              </>
            ) : (
              // User is not logged in, show auth screens
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
