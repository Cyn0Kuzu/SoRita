import { StatusBar, Platform } from 'react-native';

export const configureGlobalStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('#0369a1', true);
    StatusBar.setBarStyle('light-content', true);
  } else {
    StatusBar.setBarStyle('light-content', true);
  }
};
