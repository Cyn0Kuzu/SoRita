import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { AppStatusBar } from '../components/AppStatusBar';

export default function WelcomeScreen({ navigation }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <AppStatusBar />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/So_Rita.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Sosyal Harita</Text>
          <Text style={styles.description}>
            Arkadaşlarınla mekanları keşfet, deneyimlerini paylaş
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, !termsAccepted && styles.disabledButton]}
            onPress={() => navigation.navigate('Login')}
            disabled={!termsAccepted}
          >
            <Text style={styles.buttonText}>Giriş Yap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, !termsAccepted && styles.disabledButton]}
            onPress={() => navigation.navigate('Register')}
            disabled={!termsAccepted}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && (
                <MaterialIcons name="check" size={16} color={colors.white} />
              )}
            </View>
            <Text style={styles.termsText}>
              <Text style={styles.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                Gizlilik Politikası
              </Text>
              <Text> ve </Text>
              <Text style={styles.termsLink} onPress={() => navigation.navigate('TermsOfService')}>
                Kullanım Koşulları
              </Text>
              <Text>'nı kabul ediyorum</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.copyright}> SoRita 2025</Text>
          <Text style={styles.poweredBy}>Powered by MeMoDe</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0, // StatusBar için yer
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    marginTop: 40,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  termsContainer: {
    marginTop: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  copyright: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  poweredBy: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
