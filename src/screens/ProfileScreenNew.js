import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { AuthService } from '../services/authService';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumu kapatmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(' [ProfileScreen] User initiated logout');
              await AuthService.logout();
              console.log(' [ProfileScreen] Logout successful, resetting navigation');
              // Force navigation reset to Welcome screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error(' [ProfileScreen] Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz! Hesabınız ve tüm verileriniz kalıcı olarak silinecek.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Son Onay',
              'Hesabınızı silmek için "SİL" yazın:',
              [
                {
                  text: 'İptal',
                  style: 'cancel'
                },
                {
                  text: 'Devam Et',
                  style: 'destructive',
                  onPress: confirmDeleteAccount
                }
              ]
            );
          }
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Firestore'dan kullanıcı verisini sil
        await deleteDoc(doc(db, 'users', user.uid));
        
        // Firebase Auth'dan kullanıcıyı sil
        await user.delete();
        
        Alert.alert(
          'Hesap Silindi',
          'Hesabınız başarıyla silindi.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Hata', 'Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>Profil bilgileri bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderAvatar = () => {
    const avatarValue = userData.avatar;
    // Check if it's a valid HTTP/HTTPS URL (not just "https://" text)
    if (avatarValue && typeof avatarValue === 'string' && 
        (avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) &&
        avatarValue.length > 10) { // Ensure it's a full URL, not just "https://"
      return (
        <Image
          source={{ uri: avatarValue }}
          style={styles.avatarImage}
          onError={() => {
            // If image fails to load, fall back to emoji
            console.log('Avatar image failed to load, using fallback');
          }}
        />
      );
    }

    // If avatar is a valid emoji or empty, show it
    return (
      <Text style={styles.avatar}>
        {avatarValue && !avatarValue.startsWith('http') ? avatarValue : '🙂'}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
          
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity 
                onPress={() => setMenuVisible(true)}
                style={styles.menuButton}
              >
                <MaterialIcons name="more-vert" size={24} color={colors.white} />
              </TouchableOpacity>
            }
          >
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
              title="Çıkış Yap"
              leadingIcon="logout"
            />
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                handleDeleteAccount();
              }}
              title="Hesabı Sil"
              leadingIcon="delete"
            />
          </Menu>
        </View>

        {/* Profile Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {renderAvatar()}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {userData.firstName} {userData.lastName}
            </Text>
            <Text style={styles.username}>@{userData.username}</Text>
            
            {userData.bio ? (
              <Text style={styles.bio}>{userData.bio}</Text>
            ) : (
              <Text style={styles.noBio}>Henüz biyografi eklenmemiş</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  menuButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    fontSize: 80,
    textAlign: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  bio: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  noBio: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});
