import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

// Components
import AppStatusBar from './src/components/AppStatusBar';

// Theme
import { theme, brandColors as colors } from './src/theme/theme';

// Firebase
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';

// Services
import ComprehensiveDataService from './src/services/comprehensiveDataService';
import { AuthService } from './src/services/authService';
import GlobalStateService from './src/services/globalStateService';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoadingScreen from './src/components/LoadingScreen';

// Utils
import { configureGlobalStatusBar } from './src/utils/statusBarConfig';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  
  console.log('🚀 [App] Application starting...');
  
  // Configure global StatusBar
  configureGlobalStatusBar();

  // Initialize user data after authentication
  const initializeUserData = async (firebaseUser) => {
    try {
      console.log('📊 [App] Initializing user data (background)...');
      
      const result = await ComprehensiveDataService.initializeUserData({
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ')[1] || '',
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      }, true);
      
      console.log('✅ [App] User data initialization complete');
    } catch (error) {
      console.error('❌ [App] User data initialization failed:', error);
    }
  };

  useEffect(() => {
    console.log('🔍 [App] Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔐 [App] Auth state changed:', firebaseUser?.email || 'No user');
      
      if (firebaseUser) {
        console.log('✅ [App] User authenticated:', firebaseUser.email);
        setUser(firebaseUser);
        
        // Initialize services in background
        initializeUserData(firebaseUser);
        GlobalStateService.initialize().catch(console.warn);
      } else {
        console.log('🚪 [App] No user');
        setUser(null);
        GlobalStateService.clearState();
      }
      
      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  // Show loading screen while initializing
  if (initializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <Text style={{ color: colors.text, marginBottom: 20 }}>Uygulama başlatılıyor...</Text>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  console.log('🎯 [App] Rendering main app - user:', !!user);
  
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
