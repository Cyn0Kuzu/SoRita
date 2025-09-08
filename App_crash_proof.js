import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

// Minimal error handler
if (!__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('Error caught:', error);
    if (!isFatal) return; // Don't crash on non-fatal errors
    originalHandler(error, isFatal);
  });
}

// Safe component imports
let AppStatusBar, theme, WelcomeScreen, LoginScreen, RegisterScreen, MainTabNavigator;

try {
  AppStatusBar = require('./src/components/AppStatusBar').default;
} catch (e) {
  AppStatusBar = () => <StatusBar barStyle="light-content" backgroundColor="#2196F3" />;
}

try {
  theme = require('./src/theme/theme').theme;
} catch (e) {
  theme = { colors: { primary: '#2196F3' } };
}

try {
  WelcomeScreen = require('./src/screens/WelcomeScreen').default;
  LoginScreen = require('./src/screens/LoginScreen').default;
  RegisterScreen = require('./src/screens/RegisterScreen').default;
  MainTabNavigator = require('./src/navigation/MainTabNavigator').default;
} catch (e) {
  const FallbackScreen = ({ title }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2196F3' }}>
      <Text style={{ color: 'white', fontSize: 20, marginBottom: 10 }}>SoRita</Text>
      <Text style={{ color: 'white', fontSize: 16 }}>{title}</Text>
    </View>
  );
  
  WelcomeScreen = () => <FallbackScreen title="Hoş Geldiniz" />;
  LoginScreen = () => <FallbackScreen title="Giriş Yapın" />;
  RegisterScreen = () => <FallbackScreen title="Kayıt Olun" />;
  MainTabNavigator = () => <FallbackScreen title="Ana Menü" />;
}

// Safe Firebase auth
let auth, onAuthStateChanged;
try {
  const firebaseAuth = require('firebase/auth');
  const firebaseConfig = require('./src/config/firebase');
  auth = firebaseConfig.auth;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
} catch (e) {
  // Dummy auth for offline mode
  auth = null;
  onAuthStateChanged = (auth, callback) => {
    setTimeout(() => callback(null), 100);
    return () => {};
  };
}

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safe auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AppStatusBar />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2196F3' }}>
            <Text style={{ color: 'white', fontSize: 24, marginBottom: 20 }}>SoRita</Text>
            <ActivityIndicator size="large" color="white" />
            <Text style={{ color: 'white', marginTop: 20 }}>Yükleniyor...</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppStatusBar />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <Stack.Screen name="MainApp" component={MainTabNavigator} />
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
