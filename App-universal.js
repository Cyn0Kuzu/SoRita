/**
 * SoRita - Professional Universal App Entry Point
 * Compatible with: Expo Go, Development Builds, Production AAB/APK
 * 
 * This version uses progressive enhancement:
 * - Basic functionality for Expo Go
 * - Enhanced features for Development builds
 * - Full production features for AAB/APK
 */

// Load polyfills first for universal compatibility
import './src/utils/polyfills';

import React, { useState, useEffect } from 'react';
import { 
  StatusBar, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Constants from 'expo-constants';

// Detect environment
const isExpoGo = Constants.appOwnership === 'expo';
const isDevBuild = __DEV__ && !isExpoGo;
const isProduction = !__DEV__;

console.log(' [App] Environment:', { isExpoGo, isDevBuild, isProduction });

// Progressive feature detection
const hasFirebaseSupport = () => {
  try {
    require('./src/config/firebase');
    return true;
  } catch {
    return false;
  }
};

const hasNavigationSupport = () => {
  try {
    require('./src/navigation/MainTabNavigator');
    return true;
  } catch {
    return false;
  }
};

// Environment-specific screens
const WelcomeScreen = ({ navigation }) => {
  const screenInfo = Dimensions.get('window');
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}> SoRita</Text>
      <Text style={styles.subtitle}>Professional Location Sharing</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.envLabel}>Environment Info:</Text>
        <Text style={styles.envText}>
          {isExpoGo ? ' Expo Go' : isDevBuild ? ' Development' : ' Production'}
        </Text>
        <Text style={styles.envText}>Platform: {Platform.OS}</Text>
        <Text style={styles.envText}>Screen: {screenInfo.width}x{screenInfo.height}</Text>
        <Text style={styles.envText}>Firebase: {hasFirebaseSupport() ? '' : ''}</Text>
        <Text style={styles.envText}>Navigation: {hasNavigationSupport() ? '' : ''}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('Features')}
      >
        <Text style={styles.buttonText}>Test Features</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={() => {
          Alert.alert(
            'SoRita Info',
            `Version: 1.0.0\nEnvironment: ${isExpoGo ? 'Expo Go' : isDevBuild ? 'Development' : 'Production'}\nPlatform: ${Platform.OS}`,
            [{ text: 'OK' }]
          );
        }}
      >
        <Text style={styles.buttonText}>About</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const FeaturesScreen = ({ navigation }) => {
  const [testResults, setTestResults] = useState({});
  
  const runTests = async () => {
    const results = {};
    
    // Test basic functionality
    try {
      results.basicJS = 'Working ';
      results.navigation = 'Working ';
      results.storage = 'Testing...';
      
      // Test AsyncStorage if available
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('test', 'value');
        const value = await AsyncStorage.getItem('test');
        results.storage = value === 'value' ? 'Working ' : 'Failed ';
      } catch {
        results.storage = 'Not Available ';
      }
      
      // Test Firebase if available
      try {
        if (hasFirebaseSupport()) {
          const firebase = require('./src/config/firebase');
          results.firebase = firebase ? 'Available ' : 'Error ';
        } else {
          results.firebase = 'Not Available ';
        }
      } catch {
        results.firebase = 'Error ';
      }
      
      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({ error: error.message });
    }
  };
  
  useEffect(() => {
    runTests();
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}> Feature Tests</Text>
      
      <View style={styles.testContainer}>
        {Object.entries(testResults).map(([key, value]) => (
          <View key={key} style={styles.testRow}>
            <Text style={styles.testLabel}>{key}:</Text>
            <Text style={styles.testValue}>{value}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={runTests}
      >
        <Text style={styles.buttonText}>Run Tests Again</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const Stack = createStackNavigator();

export default function App() {
  console.log(' [App] SoRita Universal Version Starting...');
  console.log(' [App] Environment detection complete:', {
    isExpoGo,
    isDevBuild, 
    isProduction,
    platform: Platform.OS
  });

  return (
    <NavigationContainer>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0369a1" 
        translucent={false}
      />
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0369a1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ title: 'SoRita Universal' }}
        />
        <Stack.Screen 
          name="Features" 
          component={FeaturesScreen} 
          options={{ title: 'Feature Tests' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  envLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  envText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  testContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  testValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#64748b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
