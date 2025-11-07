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
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  Timestamp,
} from 'firebase/firestore';

import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import { EdgeToEdgeScreen } from '../components/EdgeToEdgeContainer';
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
      style={[styles.notificationItem, !notification.read && styles.unreadNotification]}
      onPress={() => onMarkAsRead(notification.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor() }]}>
          <MaterialIcons name={getNotificationIcon()} size={20} color="#FFFFFF" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={3}>
            {notification.message}
          </Text>

          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>{formatDate(notification.createdAt)}</Text>

            {notification.status && (
              <Text
                style={[
                  styles.statusText,
                  notification.status === 'accepted' && styles.acceptedStatus,
                  notification.status === 'rejected' && styles.rejectedStatus,
                  notification.status === 'pending' && styles.pendingStatus,
                ]}
              >
                {getStatusText()}
              </Text>
            )}
          </View>

          {renderInvitationActions()}
        </View>

        {!notification.read && <View style={styles.unreadIndicator} />}
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

      const unreadCount = notifications.filter((n) => !n.read).length;
      console.log('🔔 [NotificationsScreen] Updating unread count:', unreadCount);

      const userRef = doc(db, 'users', user.uid);

      // Atomic update to prevent race conditions
      await updateDoc(userRef, {
        unreadNotifications: unreadCount,
        lastNotificationUpdate: Timestamp.now(),
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
          console.log(
            '🔔 [NotificationsScreen] Real-time update received:',
            snapshot.docs.length,
            'notifications'
          );
          const updatedNotifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
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
      const loadedNotifications = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
    console.log('🚀 [NotificationsScreen] Starting invitation response process...', {
      notificationId,
      response,
    });

    try {
      console.log(
        '🔔 [NotificationsScreen] Handling invitation response:',
        response,
        'for notification:',
        notificationId
      );

      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification) {
        throw new Error('Bildirim bulunamadı');
      }

      console.log(
        '📋 [NotificationsScreen] Found notification:',
        notification.type,
        notification.listId
      );

      if (response === 'accepted') {
        console.log('✅ [NotificationsScreen] Processing acceptance...');

        // Daveti kabul et - kullanıcı verilerini al
        const { currentUser } = auth;
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
              email: currentUser.email,
            };
            console.log(
              '⚠️ [NotificationsScreen] User profile not found, using Firebase Auth data'
            );
          }
        } catch (userError) {
          // Offline durumunda veya hata durumunda Firebase Auth'tan bilgileri kullan
          console.warn(
            '⚠️ [NotificationsScreen] User data fetch failed, using Firebase Auth data:',
            userError.message
          );
          userData = {
            firstName: currentUser.displayName?.split(' ')[0] || 'Kullanıcı',
            lastName: currentUser.displayName?.split(' ')[1] || '',
            displayName: currentUser.displayName || 'Kullanıcı',
            avatar: currentUser.photoURL || '👤',
            username: currentUser.email?.split('@')[0] || 'user',
            email: currentUser.email,
          };
        }

        console.log(
          '📋 [NotificationsScreen] Calling CollaborativeListService.acceptInvitation...'
        );

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
          updatedAt: Timestamp.now(),
        });

        console.log('📊 [NotificationsScreen] Updating unread count...');
        // Güncellenmiş bildirim listesini al ve sayacı güncelle
        const updatedNotifications = notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true, status: response } : n
        );
        await updateUnreadNotificationCount(updatedNotifications);

        console.log('✅ [NotificationsScreen] Notification status updated successfully');
      } catch (notificationUpdateError) {
        console.warn(
          '⚠️ [NotificationsScreen] Failed to update notification status:',
          notificationUpdateError
        );
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
        readAt: Timestamp.now(),
      });

      console.log('✅ [NotificationsScreen] Notification marked as read:', notificationId);

      // Güncellenmiş bildirim listesini al ve sayacı güncelle
      const updatedNotifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      await updateUnreadNotificationCount(updatedNotifications);
    } catch (error) {
      console.error('❌ [NotificationsScreen] Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

      const updatePromises = unreadNotifications.map((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, {
          read: true,
          readAt: Timestamp.now(),
        });
      });

      await Promise.all(updatePromises);

      // Bildirim sayısını hemen güncelle
      const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
      await updateUnreadNotificationCount(updatedNotifications);

      Alert.alert('Başarılı', 'Tüm bildirimler okundu olarak işaretlendi');
      console.log('✅ [NotificationsScreen] All notifications marked as read');
    } catch (error) {
      console.error('❌ [NotificationsScreen] Error marking all as read:', error);
      Alert.alert('Hata', 'Bildirimler işaretlenirken bir hata oluştu');
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert('Bildirimleri Temizle', 'Tüm bildirimleri silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const deletePromises = notifications.map((notification) => {
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
        },
      },
    ]);
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
    const unreadCount = notifications.filter((n) => !n.read).length;

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
              <TouchableOpacity style={styles.headerButton} onPress={handleMarkAllAsRead}>
                <MaterialIcons name="done-all" size={20} color="#007AFF" />
                <Text style={styles.headerButtonText}>Tümünü Oku</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.headerButton} onPress={handleClearAllNotifications}>
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
    <EdgeToEdgeScreen style={styles.container}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  acceptedStatus: {
    backgroundColor: '#E8F5E8',
    color: '#4CAF50',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateMessage: {
    color: '#666666',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#1a1a1a',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
  },
  notificationContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    padding: 16,
  },
  notificationFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F0F0',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationMessage: {
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    color: '#999999',
    fontSize: 12,
  },
  notificationTitle: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingStatus: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderColor: '#F44336',
  },
  rejectedStatus: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  statusText: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  textContainer: {
    flex: 1,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unreadIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    height: 8,
    marginLeft: 8,
    width: 8,
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: '#007AFF',
    borderLeftWidth: 4,
  },
});
