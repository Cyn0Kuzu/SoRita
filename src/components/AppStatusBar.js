import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { colors } from '../theme/theme';

// Global StatusBar configuration for all screens
export const configureGlobalStatusBar = () => {
  if (Platform.OS === 'android') {
    RNStatusBar.setBarStyle('light-content', true);
    RNStatusBar.setBackgroundColor(colors.primary, true);
    RNStatusBar.setTranslucent(false);
  }
};

// Component to be used in each screen
export const AppStatusBar = () => {
  useEffect(() => {
    // Force configure StatusBar on every render
    if (Platform.OS === 'android') {
      RNStatusBar.setBarStyle('light-content', true);
      RNStatusBar.setBackgroundColor(colors.primary, true);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <>
      <ExpoStatusBar style="light" backgroundColor={colors.primary} translucent={false} />
      <RNStatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
        animated={true}
      />
    </>
  );
};

export default AppStatusBar;
