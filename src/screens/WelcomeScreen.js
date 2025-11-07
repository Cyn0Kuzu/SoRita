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
              {termsAccepted && <MaterialIcons name="check" size={16} color={colors.white} />}
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
          <Text style={styles.copyright}>© SoRita 2025</Text>
          <Text style={styles.poweredBy}>Powered by MeMoDe</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 40,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingTop: 0, // StatusBar için yer
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  copyright: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    height: 120,
    marginBottom: 20,
    width: 120,
  },
  poweredBy: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  subtitle: {
    color: colors.primary,
    fontSize: 18,
    marginBottom: 12,
  },
  termsContainer: {
    marginTop: 30,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  termsText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
