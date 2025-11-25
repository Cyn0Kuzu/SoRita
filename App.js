import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import AppStatusBar from './src/components/AppStatusBar';
import LoadingScreen from './src/components/LoadingScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { theme, colors } from './src/theme/theme';
import { configureGlobalStatusBar } from './src/utils/statusBarConfig';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import ComprehensiveDataService from './src/services/comprehensiveDataService';
import GlobalStateService from './src/services/globalStateService';
import { registerForPushNotifications } from './src/services/pushNotificationService';

const Stack = createStackNavigator();

LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  'Sending...',
  '[react-native-gesture-handler]',
]);

const App = () => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });

  useEffect(() => {
    configureGlobalStatusBar();
  }, []);

  const hydrateUserData = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      return;
    }

    try {
      await ComprehensiveDataService.initializeUserData(
        {
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ')[1] || '',
          email: firebaseUser.email || '',
          emailVerified: firebaseUser.emailVerified ?? false,
        },
        true
      );

      await GlobalStateService.initialize();
    } catch (error) {
      console.warn('[App] Failed to hydrate user data:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        hydrateUserData(firebaseUser);
        registerForPushNotifications(firebaseUser.uid).catch((error) =>
          console.warn('[App] Push notification registration failed:', error)
        );
      } else {
        setUser(null);
        GlobalStateService.clearState();
      }

      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [hydrateUserData, initializing]);

  useEffect(() => {
    if (fontError) {
      console.warn('[App] Failed to load icon fonts:', fontError);
    }
  }, [fontError]);

  if (initializing || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <LoadingScreen />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

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
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <Stack.Screen name="MainApp" component={MainTabNavigator} />
            ) : (
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen
                  name="EmailVerification"
                  component={EmailVerificationScreen}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;
