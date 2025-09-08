import { StatusBar, Platform } from 'react-native';

export const configureGlobalStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('transparent', true);
    StatusBar.setBarStyle('light-content', true);
    StatusBar.setTranslucent(true);
  } else {
    StatusBar.setBarStyle('light-content', true);
  }
};
