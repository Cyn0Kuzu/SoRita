import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Text, Card, Avatar, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/theme';
import AppHeader from '../components/AppHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { auth } from '../config/firebase';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Şimdi';
  
  const now = new Date();
  const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInMs = now.getTime() - notificationTime.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Şimdi';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  } else if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  } else {
    return `${diffInDays} gün önce`;
  }
};

const NotificationCard = ({ notification, onPress }) => {
  const getNotificationContent = () => {
    switch (notification.type) {
      case 'follow':
        return (
          <View style={styles.followNotification}>
            <View style={styles.avatarContainer}>
              {notification.fromUserAvatar && notification.fromUserAvatar.startsWith('http') ? (
                <Avatar.Image 
                  source={{ uri: notification.fromUserAvatar }} 
                  size={40} 
                />
              ) : (
                <View style={styles.emojiAvatar}>
                  <Text style={styles.emojiAvatarText}>
                    {notification.fromUserAvatar || ''}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationText}>
                <Text style={styles.username}>{notification.fromUserName}</Text>
                <Text> seni takip etmeye başladı</Text>
              </Text>
              <Text style={styles.timeAgo}>
                {notification.createdAt ? getTimeAgo(notification.createdAt) : 'Şimdi'}
              </Text>
            </View>
            <MaterialIcons 
              name="person-add" 
              size={20} 
              color={colors.primary} 
            />
          </View>
        );
      
      case 'unfollow':
        return (
          <View style={styles.followNotification}>
            <View style={styles.avatarContainer}>
              {notification.fromUserAvatar && notification.fromUserAvatar.startsWith('http') ? (
                <Avatar.Image 
                  source={{ uri: notification.fromUserAvatar }} 
                  size={40} 
                />
              ) : (
                <View style={styles.emojiAvatar}>
                  <Text style={styles.emojiAvatarText}>
                    {notification.fromUserAvatar || ''}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationText}>
                <Text style={styles.username}>{notification.fromUserName}</Text>
                <Text> seni takip etmeyi bıraktı</Text>
              </Text>
              <Text style={styles.timeAgo}>
                {notification.createdAt ? getTimeAgo(notification.createdAt) : 'Şimdi'}
              </Text>
            </View>
            <MaterialIcons 
              name="person-remove" 
              size={20} 
              color={colors.textSecondary} 
            />
          </View>
        );
        
      default:
        // Legacy notifications (list actions, etc.)
        return (
          <View style={styles.notificationContent}>
            <Avatar.Image 
              source={{ uri: notification.user?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
              size={40} 
            />
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationText}>
                <Text style={styles.username}>{notification.user?.name}</Text>
                {notification.listAction?.action === 'added_to_list' && (
                  <Text> <Text style={styles.listName}>{notification.listAction.listName}</Text> listesine <Text style={styles.venueName}>{notification.listAction.venueName}</Text> ekledi</Text>
                )}
                {notification.listAction?.action === 'commented' && (
                  <Text> <Text style={styles.listName}>{notification.listAction.listName}</Text> listesindeki <Text style={styles.venueName}>{notification.listAction.venueName}</Text> mekanına yorum yaptı</Text>
                )}
                {notification.listAction?.action === 'liked' && (
                  <Text> paylaşımını beğendi</Text>
                )}
              </Text>
              {notification.listAction?.comment && (
                <Text style={styles.notificationComment}>"{notification.listAction.comment}"</Text>
              )}
              <Text style={styles.timeAgo}>{notification.timeAgo}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
        );
    }
  };

  return (
    <Card style={[
      styles.card, 
      styles.notificationCard,
      !notification.read && styles.unreadNotification
    ]}>
      <TouchableOpacity onPress={() => onPress(notification)}>
        {getNotificationContent()}
      </TouchableOpacity>
      
      {/* Legacy notification actions */}
      {notification.type !== 'follow' && notification.type !== 'unfollow' && (
        <View style={styles.notificationActions}>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="map" size={16} color={colors.primary} />
            <Text style={styles.notificationButtonText}>Haritada Gör</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="list" size={16} color={colors.primary} />
            <Text style={styles.notificationButtonText}>Listeyi Aç</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      if (!currentUser) return;

      console.log(' [NotificationsScreen] Loading notifications...');
      const userNotifications = await getNotifications(currentUser.uid);
      
      setNotifications(userNotifications);
      
      console.log(' [NotificationsScreen] Loaded', userNotifications.length, 'notifications');
    } catch (error) {
      console.error(' [NotificationsScreen] Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read && notification.type === 'follow') {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, read: true }
              : n
          )
        );
      }

      // Navigate based on notification type
      if (notification.type === 'follow') {
        navigation.navigate('ViewProfile', { userId: notification.fromUserId });
      }
      // Handle other notification types here
    } catch (error) {
      console.error(' [NotificationsScreen] Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!currentUser) return;
      
      await markAllNotificationsAsRead(currentUser.uid);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      console.log(' [NotificationsScreen] All notifications marked as read');
    } catch (error) {
      console.error(' [NotificationsScreen] Error marking all as read:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppStatusBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppStatusBar />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllRead}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptySubtitle}>
              Yeni takipçiler ve etkileşimler burada görünecek.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handleNotificationPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: StatusBar.currentHeight || 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  markAllRead: {
    fontSize: 14,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    marginBottom: 10,
    elevation: 2,
    backgroundColor: colors.white,
  },
  notificationCard: {
    paddingVertical: 5,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  followNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatarContainer: {
    marginRight: 12,
  },
  emojiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emojiAvatarText: {
    fontSize: 20,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 10,
  },
  notificationText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  username: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  listName: {
    fontWeight: '600',
    color: colors.primary,
  },
  venueName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notificationComment: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notificationActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 5,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginRight: 10,
  },
  notificationButtonText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
