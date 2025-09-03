import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/theme';
import { AppStatusBar } from './AppStatusBar';

export default function AppHeader({ 
  showSearchButton = false, 
  showNotificationButton = false,
  onSearchPress = () => {},
  onNotificationPress = () => {}
}) {
  return (
    <>
      <AppStatusBar />
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitleSo}>So</Text>
          <Text style={styles.appTitleRita}>Rita</Text>
        </View>
        <View style={styles.headerActions}>
          {showSearchButton && (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={onSearchPress}
            >
              <MaterialIcons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {showNotificationButton && (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={onNotificationPress}
            >
              <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
  },
  appTitleSo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565C0', // Koyu mavi
  },
  appTitleRita: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32', // Koyu yeşil
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
});
