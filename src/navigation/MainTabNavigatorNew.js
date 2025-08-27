import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

// Profile Stack Navigator (includes ViewProfile)
function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
    </Stack.Navigator>
  );
}

// Notifications Stack Navigator (includes ViewProfile)
function NotificationsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsMain" component={NotificationsScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabNavigator() {
  console.log('🧭 [Navigation] MainTabNavigator rendering...');
  
  // StatusBar'ı MainTabNavigator için ayarla
  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    StatusBar.setBackgroundColor(colors.primary, true);
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        console.log('🧭 [Navigation] Setting up screen options for route:', route.name);
        
        return {
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Home') {
              return <MaterialCommunityIcons 
                name={focused ? 'home' : 'home-outline'} 
                size={size} 
                color={color} 
              />;
            } else if (route.name === 'Map') {
              return <MaterialCommunityIcons 
                name={focused ? 'map' : 'map-outline'} 
                size={size} 
                color={color} 
              />;
            } else if (route.name === 'Notifications') {
              return <MaterialCommunityIcons 
                name={focused ? 'bell' : 'bell-outline'} 
                size={size} 
                color={color} 
              />;
            } else if (route.name === 'Profile') {
              return <MaterialCommunityIcons 
                name={focused ? 'account' : 'account-outline'} 
                size={size} 
                color={color} 
              />;
            }
            return <MaterialCommunityIcons name="help-circle" size={size} color={color} />;
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
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
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
        name="Notifications"
        component={NotificationsStackNavigator}
        options={{
          tabBarLabel: 'Bildirimler',
        }}
        listeners={{
          tabPress: (e) => {
            console.log('🧭 [Navigation] Notifications tab pressed');
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
