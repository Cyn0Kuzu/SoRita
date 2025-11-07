/**
 * Advanced Push Notification Service
 * Professional push notification management for SoRita
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { doc, updateDoc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { logger } from '../utils/logger';
import { ENV, ENVIRONMENTS } from '../config/environment';

const notificationLogger = logger.createServiceLogger('PushNotifications');

// Notification categories for iOS
const NOTIFICATION_CATEGORIES = {
  MESSAGE: 'message',
  FRIEND_REQUEST: 'friend_request',
  LOCATION_SHARE: 'location_share',
  LIST_INVITE: 'list_invite',
  SYSTEM: 'system',
};

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    notificationLogger.debug('Received notification:', notification);

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

// Set notification categories for iOS
if (Platform.OS === 'ios') {
  Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.MESSAGE, [
    {
      identifier: 'reply',
      buttonTitle: 'Yanıtla',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'mark_read',
      buttonTitle: 'Okundu İşaretle',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.FRIEND_REQUEST, [
    {
      identifier: 'accept',
      buttonTitle: 'Kabul Et',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Reddet',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    this.pendingNotifications = [];
  }

  // Initialize push notifications
  async initialize() {
    try {
      if (this.isInitialized) {
        notificationLogger.debug('Push notifications already initialized');
        return this.expoPushToken;
      }

      notificationLogger.info('Initializing push notifications...');

      // Check if device supports push notifications
      if (!Device.isDevice) {
        notificationLogger.warn('Must use physical device for Push Notifications');
        // Set initialized to true to prevent repeated warnings
        this.isInitialized = true;
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        notificationLogger.warn('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      this.expoPushToken = await this.getExpoPushToken();

      if (!this.expoPushToken) {
        notificationLogger.error('Failed to get Expo push token');
        return null;
      }

      // Setup notification listeners
      this.setupNotificationListeners();

      // Save token to user profile
      await this.saveTokenToDatabase();

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      this.isInitialized = true;
      notificationLogger.info('Push notifications initialized successfully');

      return this.expoPushToken;
    } catch (error) {
      notificationLogger.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  // Get Expo push token
  async getExpoPushToken() {
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      if (!projectId) {
        notificationLogger.warn(
          'No project ID found for push notifications - using development mode'
        );
        // In development, we can skip push tokens
        if (__DEV__) {
          return null;
        }
        notificationLogger.error('Project ID required for push notifications in production');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      notificationLogger.debug('Expo push token obtained');
      return token.data;
    } catch (error) {
      // Handle specific error types
      if (error.message.includes('INVALID_SENDER')) {
        notificationLogger.warn(
          'Push notifications not configured for this project - this is normal in development'
        );
        return null;
      } else if (error.message.includes('ExecutionException')) {
        notificationLogger.warn(
          'Push notification service not available - continuing without notifications'
        );
        return null;
      } else {
        notificationLogger.error('Error getting Expo push token:', error.message);
        return null;
      }
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    notificationLogger.debug('Notification listeners set up');
  }

  // Handle notification received
  async handleNotificationReceived(notification) {
    try {
      notificationLogger.debug('Notification received:', notification);

      const { data, request } = notification;

      // Update badge count
      if (Platform.OS === 'ios') {
        const currentBadgeCount = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(currentBadgeCount + 1);
      }

      // Track notification analytics
      await this.trackNotificationEvent('received', {
        notificationId: request.identifier,
        category: data?.category,
        type: data?.type,
      });

      // Handle specific notification types
      if (data?.category) {
        await this.handleNotificationByCategory(data.category, data);
      }
    } catch (error) {
      notificationLogger.error('Error handling notification received:', error);
    }
  }

  // Handle notification response (when user taps)
  async handleNotificationResponse(response) {
    try {
      notificationLogger.debug('Notification response received:', response);

      const { notification, actionIdentifier } = response;
      const { data } = notification.request.content;

      // Track notification interaction
      await this.trackNotificationEvent('interacted', {
        notificationId: notification.request.identifier,
        actionIdentifier,
        category: data?.category,
        type: data?.type,
      });

      // Handle action-specific responses
      if (actionIdentifier === 'accept') {
        await this.handleAcceptAction(data);
      } else if (actionIdentifier === 'decline') {
        await this.handleDeclineAction(data);
      } else if (actionIdentifier === 'reply') {
        await this.handleReplyAction(data);
      } else if (actionIdentifier === 'mark_read') {
        await this.handleMarkReadAction(data);
      } else {
        // Default tap action - navigate to appropriate screen
        await this.handleDefaultTapAction(data);
      }
    } catch (error) {
      notificationLogger.error('Error handling notification response:', error);
    }
  }

  // Handle notification by category
  async handleNotificationByCategory(category, data) {
    switch (category) {
      case NOTIFICATION_CATEGORIES.MESSAGE:
        await this.handleMessageNotification(data);
        break;
      case NOTIFICATION_CATEGORIES.FRIEND_REQUEST:
        await this.handleFriendRequestNotification(data);
        break;
      case NOTIFICATION_CATEGORIES.LOCATION_SHARE:
        await this.handleLocationShareNotification(data);
        break;
      case NOTIFICATION_CATEGORIES.LIST_INVITE:
        await this.handleListInviteNotification(data);
        break;
      default:
        notificationLogger.debug('Unknown notification category:', category);
    }
  }

  // Save token to database
  async saveTokenToDatabase() {
    try {
      const user = auth.currentUser;
      if (!user || !this.expoPushToken) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        pushToken: this.expoPushToken,
        pushTokenUpdatedAt: new Date(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          deviceName: Device.deviceName,
          modelName: Device.modelName,
        },
      });

      notificationLogger.debug('Push token saved to database');
    } catch (error) {
      notificationLogger.error('Error saving push token to database:', error);
    }
  }

  // Setup Android notification channels
  async setupAndroidChannels() {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id: 'messages',
        name: 'Mesajlar',
        description: 'Yeni mesaj bildirimleri',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'message.wav',
        vibrationPattern: [0, 250, 250, 250],
      },
      {
        id: 'social',
        name: 'Sosyal',
        description: 'Arkadaş istekleri ve sosyal aktiviteler',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'social.wav',
      },
      {
        id: 'location',
        name: 'Konum',
        description: 'Konum paylaşımı bildirimleri',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'system',
        name: 'Sistem',
        description: 'Sistem bildirimleri',
        importance: Notifications.AndroidImportance.LOW,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }

    notificationLogger.debug('Android notification channels set up');
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: data.category || NOTIFICATION_CATEGORIES.SYSTEM,
        },
        trigger: null, // Send immediately
      });

      notificationLogger.debug('Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      notificationLogger.error('Error sending local notification:', error);
      return null;
    }
  }

  // Send push notification to user
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // The backend function will handle fetching the user's push token.
      const message = {
        userId, // Pass userId for the backend to resolve
        title,
        body,
        data: {
          ...data,
          timestamp: Date.now(),
        },
        priority: 'high',
        channelId: data.channelId || 'default',
      };

      // Store the notification request in the database for the backend to process.
      await addDoc(collection(db, 'pendingNotifications'), {
        message,
        createdAt: new Date(),
        status: 'pending',
      });

      notificationLogger.debug('Push notification queued for user:', userId);
      return true;
    } catch (error) {
      notificationLogger.error('Error queuing push notification:', error);
      return false;
    }
  }

  // Track notification events for analytics
  async trackNotificationEvent(event, data) {
    try {
      if (ENV === ENVIRONMENTS.DEVELOPMENT) return;

      await addDoc(collection(db, 'notificationAnalytics'), {
        event,
        data,
        userId: auth.currentUser?.uid,
        timestamp: new Date(),
        platform: Platform.OS,
      });
    } catch (error) {
      notificationLogger.error('Error tracking notification event:', error);
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      return (
        userData?.notificationSettings || {
          messages: true,
          friendRequests: true,
          locationShares: true,
          listInvites: true,
          systemUpdates: true,
          marketingEmails: false,
          pushEnabled: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        }
      );
    } catch (error) {
      notificationLogger.error('Error getting notification settings:', error);
      return null;
    }
  }

  // Update notification settings
  async updateNotificationSettings(settings) {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationSettings: settings,
        notificationSettingsUpdatedAt: new Date(),
      });

      notificationLogger.debug('Notification settings updated');
      return true;
    } catch (error) {
      notificationLogger.error('Error updating notification settings:', error);
      return false;
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();

      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(0);
      }

      notificationLogger.debug('All notifications cleared');
    } catch (error) {
      notificationLogger.error('Error clearing notifications:', error);
    }
  }

  // Cleanup listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    notificationLogger.debug('Notification listeners cleaned up');
  }

  // Action handlers
  async handleAcceptAction(data) {
    // Handle accept action (e.g., friend request)
    notificationLogger.debug('Accept action handled:', data);
  }

  async handleDeclineAction(data) {
    // Handle decline action
    notificationLogger.debug('Decline action handled:', data);
  }

  async handleReplyAction(data) {
    // Handle reply action
    notificationLogger.debug('Reply action handled:', data);
  }

  async handleMarkReadAction(data) {
    // Handle mark as read action
    notificationLogger.debug('Mark read action handled:', data);
  }

  async handleDefaultTapAction(data) {
    // Handle default tap action - navigate to appropriate screen
    notificationLogger.debug('Default tap action handled:', data);
  }

  // Specific notification handlers
  async handleMessageNotification(data) {
    notificationLogger.debug('Message notification handled:', data);
  }

  async handleFriendRequestNotification(data) {
    notificationLogger.debug('Friend request notification handled:', data);
  }

  async handleLocationShareNotification(data) {
    notificationLogger.debug('Location share notification handled:', data);
  }

  async handleListInviteNotification(data) {
    notificationLogger.debug('List invite notification handled:', data);
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// Export utility functions
export const registerForPushNotifications = () => pushNotificationService.initialize();
export const sendLocalNotification = (title, body, data) =>
  pushNotificationService.sendLocalNotification(title, body, data);
export const clearAllNotifications = () => pushNotificationService.clearAllNotifications();

export default pushNotificationService;
