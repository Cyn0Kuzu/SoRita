import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
} from 'react-native';
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
        <ActivityIndicator 
          size="large" 
          color={colors.primary} 
          style={styles.loader}
        />
        
        {/* Loading text */}
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default LoadingScreen;
