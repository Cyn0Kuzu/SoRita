import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/theme';

const LoadingScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/So_Rita.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Loading indicator */}
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />

        {/* Loading text */}
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  logo: {
    height: 120,
    width: 120,
  },
  logoContainer: {
    marginBottom: 48,
  },
});

export default LoadingScreen;
