import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
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
        
        {/* Copyright and Powered By */}
        <View style={styles.footer}>
          <Text style={styles.copyright}> SoRita</Text>
          <Text style={styles.poweredBy}>powered by MeMoDe</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  poweredBy: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
});

export default LoadingScreen;
