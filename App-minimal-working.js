import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Text style={styles.title}>SoRita</Text>
      <Text style={styles.subtitle}>Minimum Working Version</Text>
      <Text style={styles.version}>Version: 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 10,
  },
  version: {
    fontSize: 14,
    color: '#999999',
  },
});
