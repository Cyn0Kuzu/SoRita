import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar
} from 'react-native';
import { Text, Card, Button, FAB } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';
import { auth } from '../config/firebase';
import SocialFeed from '../components/SocialFeed';
import { AppStatusBar } from '../components/AppStatusBar';

export default function HomeScreen({ navigation, route }) {
  const [userData, setUserData] = useState(null);
  const [emailVerified, setEmailVerified] = useState(true);

  useEffect(() => {
    console.log('🏠 [HomeScreen] Component mounted');
    
    // Email verification durumunu kontrol et
    if (route?.params?.emailVerified === false) {
      setEmailVerified(false);
      showEmailVerificationAlert();
    }

    // Kullanıcı bilgilerini yükle
    loadUserData();
  }, [route]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        setUserData({
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified
        });
        setEmailVerified(user.emailVerified);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const showEmailVerificationAlert = () => {
    Alert.alert(
      '⚠️ E-posta Doğrulama',
      'E-posta adresiniz henüz doğrulanmadı. Tüm özellikleri kullanmak için e-posta adresinizi doğrulayın.',
      [
        {
          text: 'Daha Sonra',
          style: 'cancel'
        },
        {
          text: 'Profil Ayarları',
          onPress: () => navigation.navigate('Profile')
        }
      ]
    );
  };

  const handleAddContent = () => {
    Alert.alert(
      '📍 İçerik Ekle',
      'Ne paylaşmak istiyorsunuz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Mekan Ekle',
          onPress: () => {
            // TODO: Mekan ekleme sayfasına yönlendir
            Alert.alert('Yakında!', 'Mekan ekleme özelliği yakında gelecek!');
          }
        },
        {
          text: 'Liste Oluştur',
          onPress: () => {
            // TODO: Liste oluşturma sayfasına yönlendir
            Alert.alert('Yakında!', 'Liste oluşturma özelliği yakında gelecek!');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>SoRita</Text>
          <Text style={styles.headerSubtitle}>Sosyal Harita</Text>
        </View>
        
        <View style={styles.headerActions}>
          {!emailVerified && (
            <TouchableOpacity 
              style={styles.warningIcon}
              onPress={showEmailVerificationAlert}
            >
              <MaterialIcons name="warning" size={24} color="#FF9800" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Email Verification Banner */}
      {!emailVerified && (
        <TouchableOpacity 
          style={styles.verificationBanner}
          onPress={showEmailVerificationAlert}
        >
          <MaterialIcons name="info" size={20} color="#FF9800" />
          <Text style={styles.bannerText}>E-posta adresinizi doğrulayın</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FF9800" />
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.content}>
        <SocialFeed />
      </View>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        color={colors.white}
        onPress={handleAddContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 12,
    padding: 4,
  },
  headerAction: {
    padding: 4,
  },
  verificationBanner: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});
