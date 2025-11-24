import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, LogBox, View, Text } from 'react-native';
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
      console.error(' Global Error:', error.message);
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
  console.log(' Firebase loaded successfully');
} catch (error) {
  console.error(' Firebase import failed:', error.message);
}

// Safe component imports with fallbacks
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
  console.log(' Components loaded successfully');
} catch (error) {
  console.error(' Component import failed:', error.message);
  
  // Create safe fallback components
  const FallbackScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2196F3' }}>
      <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', margin: 20 }}>
        SoRita{'\n'}Yükleniyor...
      </Text>
    </View>
  );
  
  AppStatusBar = () => <StatusBar barStyle="light-content" backgroundColor="#2196F3" />;
  LoadingScreen = FallbackScreen;
  WelcomeScreen = FallbackScreen;
  LoginScreen = FallbackScreen;
  RegisterScreen = FallbackScreen;
  EmailVerificationScreen = FallbackScreen;
  MainTabNavigator = FallbackScreen;
  theme = {
    colors: {
      primary: '#2196F3',
      background: '#ffffff'
    }
  };
}

const Stack = createStackNavigator();

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
        console.log(' Android EdgeToEdge enabled');
      }
    } catch (error) {
      console.error('EdgeToEdge setup failed:', error.message);
    }
  }, []);

  // Auth listener with safety checks
  useEffect(() => {
    if (!auth || !onAuthStateChanged) {
      console.warn(' Firebase not available, app will work in offline mode');
      setInitializing(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log(' Auth state:', firebaseUser ? 'Authenticated' : 'Not authenticated');
        setUser(firebaseUser);
        if (initializing) {
          setInitializing(false);
          console.log(' App initialization complete');
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error(' Auth setup failed:', error.message);
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
