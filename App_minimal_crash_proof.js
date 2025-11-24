import React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';

// Minimal crash-proof app
export default function App() {
  console.log(' App starting safely...');
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <View style={styles.content}>
        <Text style={styles.title}>SoRita</Text>
        <Text style={styles.subtitle}>Uygulama Yükleniyor...</Text>
        <Text style={styles.version}>Version 32</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2196F3',
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
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  version: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
});
