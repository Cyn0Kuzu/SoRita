/**
 * SoRita - Zero-Dependency Entry Point
 * Direct Expo registration without complex bundling
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert 
} from 'react-native';

// Single screen app for testing
export default function SoRita() {
  const [count, setCount] = React.useState(0);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0369a1" />
      
      <View style={styles.content}>
        <Text style={styles.title}> SoRita</Text>
        <Text style={styles.subtitle}>Zero-Dependency Test</Text>
        
        <View style={styles.testCard}>
          <Text style={styles.cardTitle}>Core Test Results</Text>
          <Text style={styles.testItem}> React Native Core</Text>
          <Text style={styles.testItem}> State Management</Text>
          <Text style={styles.testItem}> Touch Events</Text>
          <Text style={styles.testItem}> Styling System</Text>
          <Text style={styles.testItem}>Counter: {count}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setCount(count + 1)}
        >
          <Text style={styles.buttonText}>Test Counter (+)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => {
            Alert.alert(
              'SoRita Core Test',
              `Successfully running!\nCounter: ${count}\nZero external dependencies`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.buttonText}>Show Alert</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.resetButton]} 
          onPress={() => setCount(0)}
        >
          <Text style={styles.buttonText}>Reset Counter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  testCard: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  testItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#059669',
  },
  resetButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
