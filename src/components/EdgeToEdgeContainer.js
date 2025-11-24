// Professional Edge-to-Edge wrapper component for Android 15+ compatibility
import React from 'react';
import { View, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURE_FLAGS } from '../config/environment';

const EdgeToEdgeContainer = ({ 
  children, 
  style, 
  useStatusBarPadding = true, 
  useBottomPadding = true,
  backgroundColor = 'transparent' 
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: useStatusBarPadding ? insets.top : 0,
      paddingBottom: useBottomPadding ? insets.bottom : 0,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    style
  ];

  if (Platform.OS === 'android' && FEATURE_FLAGS.ENABLE_LOGGING) {
    console.log('[EdgeToEdge] Container rendered with insets:', insets);
  }

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const EdgeToEdgeScreen = ({ 
  children, 
  style, 
  statusBarStyle = 'light-content',
  statusBarBackgroundColor = 'transparent',
  statusBarTranslucent = true
}) => {
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle(statusBarStyle);
      StatusBar.setBackgroundColor(statusBarBackgroundColor);
      StatusBar.setTranslucent(statusBarTranslucent);
    }
  }, [statusBarStyle, statusBarBackgroundColor, statusBarTranslucent]);

  return (
    <View style={[styles.screen, style]}>
      <EdgeToEdgeContainer useStatusBarPadding={true} useBottomPadding={false}>
        {children}
      </EdgeToEdgeContainer>
    </View>
  );
};

// Hook for edge-to-edge dimensions
const useEdgeToEdgeDimensions = () => {
  const insets = useSafeAreaInsets();
  
  return {
    safeAreaInsets: insets,
    statusBarHeight: insets.top,
    bottomSafeAreaHeight: insets.bottom,
    leftSafeAreaWidth: insets.left,
    rightSafeAreaWidth: insets.right,
    isEdgeToEdgeSupported: Platform.OS === 'android' && Platform.Version >= 15
  };
};

// Component for handling large screen layouts
const ResponsiveContainer = ({ children, style }) => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLandscape = width > height;

  const containerStyle = [
    styles.responsiveContainer,
    isTablet && styles.tabletContainer,
    isLandscape && styles.landscapeContainer,
    style
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  responsiveContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabletContainer: {
    paddingHorizontal: 32,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  landscapeContainer: {
    paddingHorizontal: 24,
  },
});

export {
  EdgeToEdgeContainer,
  EdgeToEdgeScreen,
  useEdgeToEdgeDimensions,
  ResponsiveContainer
};

export default EdgeToEdgeContainer;
