import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors } from '../theme/theme';
import { AppStatusBar } from '../components/AppStatusBar';

export default function GoogleMapsScreen() {
  return (
    <View style={styles.container}>
      <AppStatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Harita</Text>
        <Text style={styles.subtitle}>Development build bekleniyor...</Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🏗️</Text>
        <Text style={styles.placeholderDesc}>
          Native Google Maps{'\n'}
          APK hazır olunca aktif olacak
        </Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>📍 Check-in Hazırla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary || '#FF6B6B',
    borderRadius: 10,
    marginTop: 20,
    padding: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    backgroundColor: colors.background || '#F8F9FA',
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    padding: 40,
  },
  placeholderDesc: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 20,
  },
  subtitle: {
    color: colors.textSecondary || '#666',
    fontSize: 14,
    marginTop: 5,
  },
  title: {
    color: colors.primary || '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
