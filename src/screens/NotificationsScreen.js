import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDoc,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import GlobalStateService from '../services/globalStateService';
import { AppStatusBar } from '../components/AppStatusBar';
import SoRitaHeader from '../components/SoRitaHeader';
import CollaborativeListService from '../services/collaborativeListService';

const NotificationItem = ({ notification, onInvitationResponse, onMarkAsRead }) => {
  const [loading, setLoading] = useState(false);

  const handleInvitationResponse = async (response) => {
    setLoading(true);
    try {
      await onInvitationResponse(notification.id, response);
    } catch (error) {
      console.error('❌ [NotificationItem] Error in invitation response:', error);
      // Ana fonksiyon zaten hata yönetimi yapıyor, burada sadece logluyoruz
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'list_invitation':
        return 'group-add';
      case 'list_shared':
        return 'share';
      case 'follow_request':
        return 'person-add';
      case 'place_added':
        return 'place';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'list_invitation':
        return '#4CAF50';
      case 'list_shared':
        return '#2196F3';
      case 'follow_request':
        return '#FF9800';
      case 'place_added':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const renderInvitationActions = () => {
    if (notification.type !== 'list_invitation' || notification.status !== 'pending') {
      return null;
    }

    return (
      <View style={styles.invitationActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleInvitationResponse('accepted')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Kabul Et</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleInvitationResponse('rejected')}
          disabled={loading}
        >
          <MaterialIcons name="close" size={16} color="#F44336" />
          <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Reddet</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getStatusText = () => {
    if (notification.type === 'list_invitation') {
      switch (notification.status) {
        case 'accepted':
          return 'Kabul edildi';
        case 'rejected':
          return 'Reddedildi';
        case 'pending':
          return 'Bekliyor';
        default:
          return '';
      }
    }
    return '';
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification
      ]}
      onPress={() => onMarkAsRead(notification.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor() }]}>
          <MaterialIcons 
            name={getNotificationIcon()} 
            size={20} 
            color="#FFFFFF" 
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {notification.message}
          </Text>
          
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>
              {formatDate(notification.createdAt)}
            </Text>
            
            {notification.status && (
              <Text style={[
                styles.statusText,
                notification.status === 'accepted' && styles.acceptedStatus,
                notification.status === 'rejected' && styles.rejectedStatus,
                notification.status === 'pending' && styles.pendingStatus
              ]}>
                {getStatusText()}
              </Text>
            )}
          </View>

          {renderInvitationActions()}
        </View>

        {!notification.read && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Kullanıcının unreadNotifications sayısını güncelle
  const updateUnreadNotificationCount = useCallback(async (notifications) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const unreadCount = notifications.filter(n => !n.read).length;
      console.log('🔔 [NotificationsScreen] Updating unread count:', unreadCount);

      const userRef = doc(db, 'users', user.uid);
      
      // Atomic update to prevent race conditions
      await updateDoc(userRef, {
        unreadNotifications: unreadCount,
        lastNotificationUpdate: Timestamp.now()
      });

      console.log('✅ [NotificationsScreen] Unread notification count updated:', unreadCount);
    } catch (error) {
      // Offline durumunda sessizce geç
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log('📱 [NotificationsScreen] Offline mode - skipping count update');
      } else {
        console.error('❌ [NotificationsScreen] Error updating unread count:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    
    // Real-time notifications listener
    const user = auth.currentUser;
    if (user) {
      console.log('🔔 [NotificationsScreen] Setting up real-time listener');
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'notifications'),
          where('toUserId', '==', user.uid),
          orderBy('createdAt', 'desc')
        ),
        (snapshot) => {
          console.log('🔔 [NotificationsScreen] Real-time update received:', snapshot.docs.length, 'notifications');
          const updatedNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setNotifications(updatedNotifications);
          
          // Update global state
          GlobalStateService.updateNotifications(updatedNotifications);
          
          // Bildirim sayısını güncelle
          updateUnreadNotificationCount(updatedNotifications);
        },
        (error) => {
          console.error('❌ [NotificationsScreen] Real-time listener error:', error);
          // Offline durumunda sessizce geç
          if (error.code === 'unavailable' || error.message.includes('offline')) {
            console.log('📱 [NotificationsScreen] Offline mode - using cached data');
          }
        }
      );

      return () => unsubscribe();
    }
  }, [updateUnreadNotificationCount]);

  const loadNotifications = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ [NotificationsScreen] User not authenticated');
        setLoading(false);
        return;
      }

      console.log('🔔 [NotificationsScreen] Loading notifications for user:', user.uid);

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('toUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const loadedNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('✅ [NotificationsScreen] Loaded notifications:', loadedNotifications.length);
      setNotifications(loadedNotifications);

    } catch (error) {
      // Offline durumunda özel mesaj göster
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log('📱 [NotificationsScreen] Loading notifications in offline mode');
        // Offline durumunda boş liste göster veya cached verileri kullan
        setNotifications([]);
      } else {
        console.error('❌ [NotificationsScreen] Error loading notifications:', error);
        Alert.alert('Hata', 'Bildirimler yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleInvitationResponse = async (notificationId, response) => {
    console.log('🚀 [NotificationsScreen] Starting invitation response process...', { notificationId, response });
    
    try {
      console.log('🔔 [NotificationsScreen] Handling invitation response:', response, 'for notification:', notificationId);

      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) {
        throw new Error('Bildirim bulunamadı');
      }

      console.log('📋 [NotificationsScreen] Found notification:', notification.type, notification.listId);

      if (response === 'accepted') {
        console.log('✅ [NotificationsScreen] Processing acceptance...');
        
        // Daveti kabul et - kullanıcı verilerini al
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Kullanıcı oturumu bulunamadı');
        }

        console.log('👤 [NotificationsScreen] Current user found:', currentUser.uid);

        // Kullanıcı profilini al
        let userData;
        try {
          console.log('📖 [NotificationsScreen] Fetching user profile...');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('✅ [NotificationsScreen] User profile loaded from Firestore');
          } else {
            // Firestore'da profil yoksa Firebase Auth'tan temel bilgiler kullan
            userData = {
              firstName: currentUser.displayName?.split(' ')[0] || 'Kullanıcı',
              lastName: currentUser.displayName?.split(' ')[1] || '',
              displayName: currentUser.displayName || 'Kullanıcı',
              avatar: currentUser.photoURL || '👤',
              username: currentUser.email?.split('@')[0] || 'user',
              email: currentUser.email
            };
            console.log('⚠️ [NotificationsScreen] User profile not found, using Firebase Auth data');
          }
        } catch (userError) {
          // Offline durumunda veya hata durumunda Firebase Auth'tan bilgileri kullan
          console.warn('⚠️ [NotificationsScreen] User data fetch failed, using Firebase Auth data:', userError.message);
          userData = {
            firstName: currentUser.displayName?.split(' ')[0] || 'Kullanıcı',
            lastName: currentUser.displayName?.split(' ')[1] || '',
            displayName: currentUser.displayName || 'Kullanıcı',
            avatar: currentUser.photoURL || '👤',
            username: currentUser.email?.split('@')[0] || 'user',
            email: currentUser.email
          };
        }

        console.log('📋 [NotificationsScreen] Calling CollaborativeListService.acceptInvitation...');
        
        // Ana invitation kabul işlemi
        const result = await CollaborativeListService.acceptInvitation(
          notification.listId, 
          currentUser.uid,
          userData
        );

        console.log('✅ [NotificationsScreen] Invitation acceptance result:', result);
        Alert.alert('Başarılı', 'Liste davetini kabul ettiniz!');
      }

      // Bildirim durumunu güncelle (bu başarısız olsa da ana işlem tamamlanmış olsun)
      try {
        console.log('📝 [NotificationsScreen] Updating notification status...');
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
          status: response,
          read: true,
          updatedAt: Timestamp.now()
        });

        console.log('📊 [NotificationsScreen] Updating unread count...');
        // Güncellenmiş bildirim listesini al ve sayacı güncelle
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, read: true, status: response } : n
        );
        await updateUnreadNotificationCount(updatedNotifications);
        
        console.log('✅ [NotificationsScreen] Notification status updated successfully');
      } catch (notificationUpdateError) {
        console.warn('⚠️ [NotificationsScreen] Failed to update notification status:', notificationUpdateError);
        // Bildirim güncelleme başarısız olsa da ana işlem başarılı, devam et
      }

      console.log('🎉 [NotificationsScreen] Invitation response handled successfully');

    } catch (error) {
      console.error('❌ [NotificationsScreen] Error handling invitation response:', error);
      
      // Kullanıcıya hata mesajı göster
      let errorMessage = 'İşlem sırasında bir hata oluştu';
      
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        errorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin';
      } else if (error.message?.includes('permissions')) {
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
      // Hata durumunda da devam etsin, throw etme
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      });

      console.log('✅ [NotificationsScreen] Notification marked as read:', notificationId);

      // Güncellenmiş bildirim listesini al ve sayacı güncelle
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      await updateUnreadNotificationCount(updatedNotifications);

    } catch (error) {
      console.error('❌ [NotificationsScreen] Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, {
          read: true,
          readAt: Timestamp.now()
        });
      });

      await Promise.all(updatePromises);
      
      // Bildirim sayısını hemen güncelle
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      await updateUnreadNotificationCount(updatedNotifications);
      
      Alert.alert('Başarılı', 'Tüm bildirimler okundu olarak işaretlendi');
      console.log('✅ [NotificationsScreen] All notifications marked as read');

    } catch (error) {
      console.error('❌ [NotificationsScreen] Error marking all as read:', error);
      Alert.alert('Hata', 'Bildirimler işaretlenirken bir hata oluştu');
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Bildirimleri Temizle',
      'Tüm bildirimleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = notifications.map(notification => {
                const notificationRef = doc(db, 'notifications', notification.id);
                return deleteDoc(notificationRef);
              });

              await Promise.all(deletePromises);
              setNotifications([]);
              
              // Bildirim sayısını sıfırla
              await updateUnreadNotificationCount([]);
              
              Alert.alert('Başarılı', 'Tüm bildirimler silindi');
              console.log('✅ [NotificationsScreen] All notifications cleared');

            } catch (error) {
              console.error('❌ [NotificationsScreen] Error clearing notifications:', error);
              Alert.alert('Hata', 'Bildirimler silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const renderNotification = ({ item }) => (
    <NotificationItem
      notification={item}
      onInvitationResponse={handleInvitationResponse}
      onMarkAsRead={handleMarkAsRead}
    />
  );

  const renderHeader = () => {
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleMarkAllAsRead}
              >
                <MaterialIcons name="done-all" size={20} color="#007AFF" />
                <Text style={styles.headerButtonText}>Tümünü Oku</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClearAllNotifications}
            >
              <MaterialIcons name="clear-all" size={20} color="#F44336" />
              <Text style={[styles.headerButtonText, { color: '#F44336' }]}>Temizle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={80} color="#E0E0E0" />
      <Text style={styles.emptyStateTitle}>Bildirim Yok</Text>
      <Text style={styles.emptyStateMessage}>
        Henüz hiç bildiriminiz bulunmuyor. Liste davetleri ve diğer bildirimler burada görünecek.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStatusBar />
        <SoRitaHeader 
          showBackButton={true}
          onBackPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <SoRitaHeader 
        showBackButton={true}
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }}
      />

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#F8F9FA',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  acceptedStatus: {
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  rejectedStatus: {
    color: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  pendingStatus: {
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  invitationActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
