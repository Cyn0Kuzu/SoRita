import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>SoRita Test App</Text>
          <Text style={styles.subtitle}>Basit Test Sürümü</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Uygulama Durumu</Text>
            <Text style={styles.cardText}>✅ Uygulama başarıyla çalışıyor!</Text>
            <Text style={styles.cardText}>🚀 Metro bundler aktif</Text>
            <Text style={styles.cardText}>📱 Expo Go ile test edilebilir</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Özellikleri</Text>
            <Text style={styles.cardText}>• React Native temel bileşenler</Text>
            <Text style={styles.cardText}>• Expo StatusBar</Text>
            <Text style={styles.cardText}>• SafeAreaView desteği</Text>
            <Text style={styles.cardText}>• ScrollView desteği</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sonraki Adımlar</Text>
            <Text style={styles.cardText}>1. Basit test başarılı</Text>
            <Text style={styles.cardText}>2. Ana uygulamaya geçiş</Text>
            <Text style={styles.cardText}>3. Özellik ekleme</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>SoRita © 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
