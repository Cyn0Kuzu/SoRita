import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

export default function SoRitaHeader({ 
  rightComponent = null,
  onRightPress = () => {},
  rightIcon = null,
  showBackButton = false,
  onBackPress = () => {},
  // Map screen specific props
  onSearchPress = () => {},
  showMapControls = false
}) {
  return (
    <View style={styles.header}>
      {/* Left side - Back button or SoRita text */}
      {showBackButton ? (
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.titleContainer}>
          <Text style={styles.appTitleSo}>So</Text>
          <Text style={styles.appTitleRita}>Rita</Text>
        </View>
      )}
      
      {/* Right side - Search button or custom component */}
      {showMapControls ? (
        <TouchableOpacity onPress={onSearchPress} style={styles.searchButton}>
          <MaterialIcons name="search" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : rightComponent ? (
        rightComponent
      ) : rightIcon ? (
        <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
          <MaterialIcons name={rightIcon} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  backButton: {
    padding: 8,
  },
  rightButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  searchButton: {
    padding: 8,
  },
});
