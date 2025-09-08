import React, { useEffect, memo } from 'react';
import { StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ViewProfileScreen from '../screens/ViewProfileScreen';

// Import theme
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator (includes Notifications and ViewProfile)
function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
      <Stack.Screen name="MapScreen" component={MapScreen} />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator (includes ViewProfile)
function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
      <Stack.Screen name="MapScreen" component={MapScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabNavigator() {
  console.log('🧭 [Navigation] MainTabNavigator rendering...');
  
  // Get safe area insets for proper bottom padding
  const insets = useSafeAreaInsets();
  
  // StatusBar'ı MainTabNavigator için ayarla
  useEffect(() => {
    console.log('🧭 [Navigation] MainTabNavigator useEffect - setting up StatusBar');
    StatusBar.setBarStyle('light-content', true);
    StatusBar.setBackgroundColor(colors.primary, true);
  }, []);
  
  // Early return with debug info
  console.log('🧭 [Navigation] About to render Tab.Navigator with Home, Map, Profile tabs');
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        // console.log('🧭 [Navigation] Setting up screen options for route:', route.name);
        
        return {
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Home') {
              return <MaterialCommunityIcons 
                name={focused ? 'home' : 'home-outline'} 
                size={24} 
                color={color} 
              />;
            } else if (route.name === 'Map') {
              return <MaterialCommunityIcons 
                name={focused ? 'map' : 'map-outline'} 
                size={24} 
                color={color} 
              />;
            } else if (route.name === 'Profile') {
              return <MaterialCommunityIcons 
                name={focused ? 'account' : 'account-outline'} 
                size={24} 
                color={color} 
              />;
            }
            return <MaterialCommunityIcons name="help-circle" size={24} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopWidth: 0,
            elevation: 10,
            shadowOffset: {
              width: 0,
              height: -3,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
            paddingLeft: Math.max(insets.left, 0),
            paddingRight: Math.max(insets.right, 0),
            // Sistem navigasyon barının üstünde konumlandır
            marginBottom: Platform.OS === 'android' ? insets.bottom : 0,
            // iOS için safe area padding
            ...(Platform.OS === 'ios' && {
              height: 65 + insets.bottom,
              paddingBottom: insets.bottom + 8,
            }),
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
            marginBottom: 2,
          },
          headerShown: false,
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Ana Sayfa',
        }}
        listeners={{
          tabPress: (e) => {
            console.log('🧭 [Navigation] Home tab pressed');
          },
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Harita',
        }}
        listeners={{
          tabPress: (e) => {
            console.log('🧭 [Navigation] Map tab pressed');
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profil',
        }}
        listeners={{
          tabPress: (e) => {
            console.log('🧭 [Navigation] Profile tab pressed');
          },
        }}
      />
    </Tab.Navigator>
  );
}
