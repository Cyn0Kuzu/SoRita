import React from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity
} from 'react-native';
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
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8F9FA',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary || '#FF6B6B'
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary || '#666',
    marginTop: 5
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 20
  },
  placeholderDesc: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24
  },
  button: {
    backgroundColor: colors.primary || '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
