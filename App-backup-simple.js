import React from 'react';
import { View, Text, StatusBar, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#2196F3',
          marginBottom: 20,
          textAlign: 'center'
        }}>
          SoRita
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#666666',
          textAlign: 'center',
          lineHeight: 24
        }}>
          Harita tabanlı sosyal uygulama{'\n'}
          Yakında daha fazla özellik...
        </Text>
        <View style={{
          marginTop: 40,
          padding: 15,
          backgroundColor: '#E3F2FD',
          borderRadius: 10,
          width: '100%'
        }}>
          <Text style={{
            fontSize: 14,
            color: '#1976D2',
            textAlign: 'center'
          }}>
            📍 Konum Paylaşımı{'\n'}
            🗺️ Harita Görünümü{'\n'}
            👥 Sosyal Özellikler{'\n'}
            📸 Fotoğraf Paylaşımı
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
