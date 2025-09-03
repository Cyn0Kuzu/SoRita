/**
 * Test App for SoRita - Basic functionality check
 * This version tests core imports and basic rendering
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';

// Test basic functionality
const TestApp = () => {
  console.log('App starting...');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0369a1" 
      />
      <View style={styles.content}>
        <Text style={styles.title}>SoRita Test Build</Text>
        <Text style={styles.subtitle}>Basic functionality check</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.info}>Platform: {Platform.OS}</Text>
          <Text style={styles.info}>React Native Version: 0.79.5</Text>
          <Text style={styles.info}>Test Status: ✅ Basic components working</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0ea5e9',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 10,
    width: '100%',
  },
  info: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default TestApp;
