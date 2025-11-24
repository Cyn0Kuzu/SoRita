import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Simple screens for Expo Go testing
const WelcomeScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}> SoRita</Text>
    <Text style={styles.subtitle}>Location Sharing App</Text>
    <Text style={styles.version}>v1.0.0 - Expo Go Test</Text>
  </SafeAreaView>
);

const HomeScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}> Home</Text>
    <Text style={styles.text}>Professional SoRita App</Text>
    <Text style={styles.text}> Navigation Working</Text>
    <Text style={styles.text}> Basic Components OK</Text>
  </SafeAreaView>
);

const Stack = createStackNavigator();

export default function App() {
  console.log(' [App] SoRita Expo Go Version Starting...');

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0369a1" />
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
          options={{ title: 'SoRita Welcome' }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'SoRita Home' }}
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
    marginBottom: 20,
  },
  version: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 30,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
    textAlign: 'center',
  },
});
