import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  console.log('✅ SoRita Starting...');
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <StatusBar style="auto" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 20 }}>
          🏁 SoRita Debug
        </Text>
        <Text style={{ fontSize: 16, color: '#dc2626', marginBottom: 20 }}>
          APK Crash Test Version
        </Text>
        <Text style={{ fontSize: 14, color: '#059669', marginBottom: 5 }}>✅ Basic React Native OK</Text>
        <Text style={{ fontSize: 14, color: '#059669', marginBottom: 5 }}>✅ No Complex Dependencies</Text>
        <Text style={{ fontSize: 14, color: '#059669', marginBottom: 5 }}>✅ No Firebase/Navigation</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
          Bu mesajı görüyorsanız APK çalışıyor!
        </Text>
      </View>
    </SafeAreaView>
  );
}
