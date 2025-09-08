import React from 'react';
import { View, Text, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Text style={{
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 20
      }}>
        SoRita
      </Text>
      <Text style={{
        fontSize: 16,
        color: '#666666',
        textAlign: 'center'
      }}>
        Production Build Test{'\n'}
        Version: 1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  version: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 5,
  },
  platform: {
    fontSize: 12,
    color: '#999999',
  },
});
