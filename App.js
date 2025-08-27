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
        
        // Run background tasks asynchronously (don't wait for them)
        setTimeout(async () => {
          try {
            console.log('🔄 [App] Running background tasks...');
            
            // Background image maintenance
            ImageMaintenanceService.autoCleanupForCurrentUser().catch(error => {
              console.warn('⚠️ [App] Background image maintenance failed:', error);
            });
            
            // Background activity recording
            ActivityService.recordActivity({
              action: 'user_login',
              data: {
                userId: firebaseUser.uid,
                email: firebaseUser.email,
                isNewUser: result.isNewUser,
                emailVerified: firebaseUser.emailVerified,
                timestamp: new Date().toISOString()
              }
            }).catch(error => {
              console.warn('⚠️ [App] Background activity recording failed:', error);
            });

            // Background onboarding check
            if (!await OnboardingService.hasCompletedOnboarding(firebaseUser.uid)) {
              console.log('🎉 [App] Background: Creating welcome list...');
              OnboardingService.createWelcomeList().catch(error => {
                console.warn('⚠️ [App] Background onboarding failed:', error);
              });
            }
            
            console.log('✅ [App] Background tasks initiated');
          } catch (error) {
            console.warn('⚠️ [App] Background tasks error:', error);
          }
        }, 100); // Start background tasks after 100ms
      }
      
    } catch (error) {
      console.error('❌ [App] Error initializing user data:', error);
    }
  };
  
  // Record app launch
  useEffect(() => {
    const recordAppLaunch = async () => {
      try {
        // Only record if user is authenticated
        if (auth.currentUser) {
          await ActivityService.recordActivity({
            action: 'app_launched',
            data: {
              timestamp: new Date().toISOString(),
              platform: 'mobile'
            }
          });
        } else {
          console.log('ℹ️ [App] Skipping app launch recording - user not authenticated');
        }
      } catch (error) {
        console.warn('⚠️ [App] Could not record app launch:', error);
      }
    };
    
    recordAppLaunch();
  }, []);
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 [App] Initializing authentication...');

        // First, set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('🔐 [App] Auth state changed:', firebaseUser?.email || 'No user');
          
          if (firebaseUser) {
            // User is signed in - Firebase automatically handles session persistence
            console.log('✅ [App] User is authenticated:', firebaseUser.email);
            console.log('📧 [App] Email verified:', firebaseUser.emailVerified);
            
            // Initialize comprehensive user data
            if (!dataInitialized) {
              await initializeUserData(firebaseUser);
            }
            
            // Check if we're in registration flow
            if (getRegistrationInProgress()) {
              console.log('⏸️ [App] Registration in progress, allowing unverified user');
              setUser(firebaseUser);
              setLoading(false);
              return;
            }
            
            // For existing users, check email verification
            if (!firebaseUser.emailVerified) {
              console.log('⚠️ [App] Email not verified but user exists - allowing access with limited features');
              // Don't sign out automatically - let user use the app with verification reminders
            }
            
            setUser(firebaseUser);
            
            // Initialize global state for logged in user
            await GlobalStateService.initialize();
            
            console.log('✅ [App] User session restored successfully');
          } else {
            // User is signed out - check if this is manual logout vs app restart
            console.log('🔐 [App] No active user, checking for saved credentials...');
            
            // Only try auto-login if:
            // 1. We don't have an active user session 
            // 2. There are saved credentials available
            // 3. This isn't immediately after a manual logout
            if (!user) {
              const autoLoginResult = await AuthService.checkAutoLogin();
              
              if (autoLoginResult.hasCredentials) {
                console.log('💾 [App] Found saved credentials, attempting auto-login...');
                try {
                  const loginResult = await AuthService.performAutoLogin();
                  if (loginResult.success) {
                    console.log('✅ [App] Auto-login successful');
                    return; // Let the auth state change handle the rest
                  } else {
                    console.log('⚠️ [App] Auto-login failed:', loginResult.message);
                  }
                } catch (autoLoginError) {
                  console.warn('⚠️ [App] Auto-login error:', autoLoginError.message);
                  // Clear invalid credentials
                  await AuthService.clearSavedCredentials();
                }
              } else {
                console.log('ℹ️ [App] No saved credentials found');
              }
            } else {
              console.log('🚪 [App] User manually logged out, skipping auto-login');
            }
            
            setUser(null);
            setDataInitialized(false);
            
            // Clear global state
            GlobalStateService.clearState();
            
            console.log('🚪 [App] User signed out or no active session');
            
            // Record user logout only if there was a previous user
            if (user) {
              try {
                await ActivityService.recordActivity({
                  action: 'user_logout',
                  data: {
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (error) {
                console.warn('⚠️ [App] Could not record logout:', error);
              }
            }
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
  
  // Push notification setup with data service integration - only after auth and data init
  useEffect(() => {
    let notificationListener;
    let responseListener;
    
    const setupPushNotifications = async () => {
      // Only setup push notifications if user is fully authenticated and data is initialized
      if (!user || !dataInitialized || !auth.currentUser) {
        console.log('⏸️ [App] Skipping push notification setup - waiting for full authentication');
        return;
      }
      
      // Move push notification setup to background to not block navigation
      setTimeout(async () => {
        try {
          console.log('📱 [App] Setting up push notifications...');
          
          // Register for push notifications
          await registerForPushNotifications(user.uid);
          
          // Record push notification setup
          await ActivityService.recordActivity({
            action: 'push_notifications_setup',
            data: {
              userId: user.uid,
              timestamp: new Date().toISOString()
            }
          });
          
          // Add notification received listener
          notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
            try {
              await handleNotificationReceived(notification);
              
              // Record notification received only if user is authenticated
              if (auth.currentUser) {
                await ActivityService.recordActivity({
                  action: 'notification_received',
                  data: {
                    notificationType: notification.request?.content?.data?.type || 'unknown',
                    timestamp: new Date().toISOString()
                  }
                });
              }
            } catch (error) {
              console.error('❌ [App] Error handling notification received:', error);
            }
          });
          
          // Add notification response listener
          responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
            try {
              const navigationInfo = handleNotificationResponse(response);
              
              // Record notification interaction only if user is authenticated
              if (auth.currentUser) {
                await ActivityService.recordActivity({
                  action: 'notification_tapped',
                  data: {
                    notificationType: response.notification?.request?.content?.data?.type || 'unknown',
                    navigationInfo: navigationInfo,
                    timestamp: new Date().toISOString()
                  }
                });
              }
              
              // Here you could add navigation logic if needed
              console.log('📱 [App] Should navigate to:', navigationInfo);
            } catch (error) {
              console.error('❌ [App] Error handling notification response:', error);
            }
          });
          
          console.log('✅ [App] Push notifications setup complete');
        } catch (error) {
          console.warn('⚠️ [App] Push notification setup failed:', error);
        }
      }, 1500); // 1.5 second delay
    };
    
    if (user && dataInitialized) {
      setupPushNotifications();
    }
    
    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, [user, dataInitialized]);
  
  // App lifecycle tracking
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      try {
        console.log('📱 [App] App state changed to:', nextAppState);
        
        if (user && auth.currentUser) {
          await ActivityService.recordActivity({
            action: 'app_state_change',
            data: {
              newState: nextAppState,
              userId: user.uid,
              timestamp: new Date().toISOString()
            }
          });
          
          // Update user last activity when app becomes active
          if (nextAppState === 'active') {
            await UserDataService.updateLastActivity();
          }
          
          // Create backup when app goes to background
          if (nextAppState === 'background') {
            console.log('💾 [App] App backgrounded, creating backup...');
            await ComprehensiveDataService.createCompleteBackup();
          }
        } else {
          console.log('ℹ️ [App] Skipping app state tracking - user not authenticated');
        }
      } catch (error) {
        console.warn('⚠️ [App] Error handling app state change:', error);
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [user]);
  
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
