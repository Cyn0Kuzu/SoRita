import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, ActivityIndicator, Platform, Alert, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { EdgeToEdge } from 'react-native-edge-to-edge';

// Ignore known warnings
LogBox.ignoreLogs([
  'Warning: ...',
  'Require cycle:',
  'Remote debugger',
  'Setting a timer',
  'VirtualizedLists should never be nested',
  'Animated: `useNativeDriver`'
]);

// Enhanced global error handler
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Global Error:', error);
  console.error('Stack trace:', error.stack);
  
  if (__DEV__) {
    Alert.alert(
      'Uygulama Hatası',
      `Bir hata oluştu: ${error.message}`,
      [{ text: 'Tamam' }]
    );
  }
  
  // Don't call original handler for non-fatal errors in production
  if (isFatal || __DEV__) {
    originalHandler(error, isFatal);
  }
});

// Components
import AppStatusBar from './src/components/AppStatusBar';

// Theme
import { theme, brandColors as colors } from './src/theme/theme';

// Firebase - Safe imports
let auth, onAuthStateChanged;
try {
  const firebaseAuth = require('firebase/auth');
  const firebaseConfig = require('./src/config/firebase');
  auth = firebaseConfig.auth;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
} catch (error) {
  console.error('Firebase import error:', error);
  auth = null;
  onAuthStateChanged = null;
}

// Services - Safe imports
let ComprehensiveDataService, AuthService, GlobalStateService;
try {
  ComprehensiveDataService = require('./src/services/comprehensiveDataService').default;
  AuthService = require('./src/services/authService').AuthService;
  GlobalStateService = require('./src/services/globalStateService').default;
} catch (error) {
  console.error('Services import error:', error);
}

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoadingScreen from './src/components/LoadingScreen';

// Utils
import { configureGlobalStatusBar } from './src/utils/statusBarConfig';
import { setupGlobalErrorHandler, logError } from './src/utils/errorHandler';
import PerformanceMonitor from './src/utils/performanceMonitor';
import { FEATURE_FLAGS } from './src/config/environment';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  
  console.log(' [App] Application starting...');
  
  // Setup global error handling
  setupGlobalErrorHandler();
  
  // Start performance monitoring
  PerformanceMonitor.startTimer('appInit');
  
  // Enable edge-to-edge display for Android 15+ compatibility
  useEffect(() => {
    try {
      if (Platform.OS === 'android') {
        EdgeToEdge.enable();
        
        // Configure StatusBar for edge-to-edge
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
        
        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.log(' [App] Android edge-to-edge enabled with safe areas');
        }
      }
    } catch (error) {
      logError(error, 'Edge-to-edge setup');
    }
  }, []);
  
  // Configure global StatusBar
  configureGlobalStatusBar();

  // Initialize user data after authentication
  const initializeUserData = async (firebaseUser) => {
    try {
      if (!firebaseUser) {
        console.log(' [App] No user authenticated');
        setUser(null);
        return;
      }

      console.log(' [App] User authenticated, initializing data...');
      
      // Safe service calls
      if (ComprehensiveDataService && typeof ComprehensiveDataService.initializeUserData === 'function') {
        await ComprehensiveDataService.initializeUserData(firebaseUser.uid);
      }
      
      if (GlobalStateService && typeof GlobalStateService.setCurrentUser === 'function') {
        GlobalStateService.setCurrentUser(firebaseUser);
      }
      
      setUser(firebaseUser);
      
      if (FEATURE_FLAGS?.ENABLE_LOGGING) {
        console.log(' [App] User data initialized successfully');
      }
    } catch (error) {
      console.error(' [App] Error initializing user data:', error);
      // Don't crash the app, just log the error
      setUser(firebaseUser); // Set user anyway to allow app usage
    }
  };

  useEffect(() => {
    if (!auth || !onAuthStateChanged) {
      console.warn('Firebase auth not available, setting as not authenticated');
      setInitializing(false);
      return;
    }

    console.log(' [App] Setting up auth listener...');
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log(' [App] Auth state changed:', firebaseUser?.email || 'No user');
        
        if (firebaseUser) {
          console.log(' [App] User authenticated:', firebaseUser.email);
          initializeUserData(firebaseUser);
        } else {
          console.log(' [App] User not authenticated');
          setUser(null);
        }
        
        if (initializing) {
          setInitializing(false);
          if (FEATURE_FLAGS?.ENABLE_LOGGING) {
            console.log(' [App] App initialization complete');
          }
          PerformanceMonitor.endTimer('appInit');
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error(' [App] Auth listener setup failed:', error);
      setInitializing(false);
      return () => {};
    }
  }, []);

  // Show loading screen while initializing
  if (initializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: colors.background,
            paddingHorizontal: 20 
          }}>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ 
                color: colors.text, 
                marginTop: 20, 
                fontSize: 16,
                fontWeight: '600' 
              }}>
                SoRita başlatılıyor...
              </Text>
              <Text style={{ 
                color: colors.textSecondary, 
                marginTop: 8, 
                fontSize: 14,
                textAlign: 'center' 
              }}>
                Lütfen bekleyin, uygulama hazırlanıyor
              </Text>
            </View>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  console.log(' [App] Rendering main app - user:', !!user);
  
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppStatusBar />
          <StatusBar 
            barStyle="light-content" 
            backgroundColor="transparent"
            translucent={true}
          />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyleInterpolator: ({ current, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                };
              },
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
            {user ? (
              <Stack.Screen name="MainTab" component={MainTabNavigator} />
            ) : (
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
