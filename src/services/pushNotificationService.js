import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (userId) => {
  try {
    console.log('📱 [PushNotificationService] Registering for push notifications...');
    
    if (!userId) {
      console.warn('⚠️ [PushNotificationService] No userId provided for push notification registration');
      return null;
    }
    
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ [PushNotificationService] Permission denied for push notifications');
        return null;
      }
      
      try {
        // Check if firebase config is loaded and we're on a real device
        if (!db) {
          console.warn('⚠️ [PushNotificationService] Firebase not initialized, skipping token registration');
          return null;
        }
        
        // Only try to get push token on real device with proper Firebase setup
        if (Platform.OS === 'ios' || (Platform.OS === 'android' && !__DEV__)) {
          token = (await Notifications.getExpoPushTokenAsync()).data;
          console.log('✅ [PushNotificationService] Push token obtained:', token.substring(0, 20) + '...');
        } else {
          console.log('ℹ️ [PushNotificationService] Skipping token generation in development/emulator');
          return null;
        }
      } catch (tokenError) {
        console.error('❌ [PushNotificationService] Error getting push token:', tokenError);
        return null;
      }
      
      // Save token to user document
      if (userId && token) {
        try {
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            pushToken: token,
            lastTokenUpdate: serverTimestamp()
          });
          console.log('✅ [PushNotificationService] Push token saved to database');
        } catch (dbError) {
          console.error('❌ [PushNotificationService] Error saving token to database:', dbError);
        }
      }
    } else {
      console.warn('⚠️ [PushNotificationService] Must use physical device for Push Notifications');
    }

    return token;
  } catch (error) {
    console.error('❌ [PushNotificationService] Error registering for push notifications:', error);
    return null;
  }
};

export const sendPushNotification = async (userId, title, message, data = {}) => {
  try {
    console.log('📤 [PushNotificationService] Sending push notification to user:', userId);
    console.log('Title:', title, 'Message:', message);
    
    // Get user's push token
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.warn('⚠️ [PushNotificationService] User not found:', userId);
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const pushToken = userData.pushToken;
    
    if (!pushToken) {
      // Only warn in production - this is expected in development
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ [PushNotificationService] No push token found for user:', userId);
      } else {
        console.log('📝 [PushNotificationService] No push token for user (expected in development):', userId);
      }
      return { success: false, error: 'No push token' };
    }
    
    // Prepare the message
    const message_data = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: message,
      data: {
        ...data,
        userId: userId,
        timestamp: Date.now()
      },
      badge: (userData.unreadNotifications || 0) + 1
    };
    
    // Send the notification
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message_data),
    });
    
    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log('✅ [PushNotificationService] Push notification sent successfully');
      
      // Log the notification send
      await addDoc(collection(db, 'pushNotificationLogs'), {
        userId: userId,
        title: title,
        message: message,
        data: data,
        status: 'sent',
        response: result,
        sentAt: serverTimestamp(),
        timestamp: Date.now()
      });
      
      return { success: true, result: result };
    } else {
      console.error('❌ [PushNotificationService] Failed to send push notification:', result);
      
      // Log the failed notification
      await addDoc(collection(db, 'pushNotificationLogs'), {
        userId: userId,
        title: title,
        message: message,
        data: data,
        status: 'failed',
        error: result,
        sentAt: serverTimestamp(),
        timestamp: Date.now()
      });
      
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending push notification:', error);
    
    // Log the error
    try {
      await addDoc(collection(db, 'pushNotificationLogs'), {
        userId: userId,
        title: title,
        message: message,
        data: data,
        status: 'error',
        error: error.message,
        sentAt: serverTimestamp(),
        timestamp: Date.now()
      });
    } catch (logError) {
      console.error('❌ [PushNotificationService] Error logging notification error:', logError);
    }
    
    return { success: false, error: error.message };
  }
};

export const sendFollowPushNotification = async (fromUser, toUserId) => {
  try {
    console.log('👤 [PushNotificationService] Sending follow push notification...');
    
    const title = 'Yeni Takipçi!';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} seni takip etmeye başladı`;
    
    const data = {
      type: 'follow',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending follow push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendUnfollowPushNotification = async (fromUser, toUserId) => {
  try {
    console.log('👤 [PushNotificationService] Sending unfollow push notification...');
    
    const title = 'Takip İptal Edildi';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} seni takip etmeyi bıraktı`;
    
    const data = {
      type: 'unfollow',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending unfollow push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendCommentPushNotification = async (fromUser, toUserId, postTitle, commentText) => {
  try {
    console.log('💬 [PushNotificationService] Sending comment push notification...');
    
    const title = 'Yeni Yorum!';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} gönderinize yorum yaptı`;
    
    const data = {
      type: 'comment',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar,
      postTitle: postTitle,
      commentText: commentText
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending comment push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendCommentDeletePushNotification = async (fromUser, toUserId, postTitle) => {
  try {
    console.log('🗑️ [PushNotificationService] Sending comment delete push notification...');
    
    const title = 'Yorum Silindi';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} gönderinizdeki yorumunu sildi`;
    
    const data = {
      type: 'comment_deleted',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar,
      postTitle: postTitle
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending comment delete push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendLikePushNotification = async (fromUser, toUserId, postTitle) => {
  try {
    console.log('❤️ [PushNotificationService] Sending like push notification...');
    
    const title = 'Gönderiniz Beğenildi!';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} gönderinizi beğendi`;
    
    const data = {
      type: 'like',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar,
      postTitle: postTitle
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending like push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendListInvitationPushNotification = async (fromUser, toUserId, listName, listId) => {
  try {
    console.log('📋 [PushNotificationService] Sending list invitation push notification...');
    
    const title = 'Liste Daveti!';
    const message = `${fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName} sizi "${listName}" listesine davet etti`;
    
    const data = {
      type: 'list_invitation',
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.firstName + ' ' + fromUser.lastName,
      fromUserAvatar: fromUser.avatar,
      listName: listName,
      listId: listId
    };
    
    return await sendPushNotification(toUserId, title, message, data);
  } catch (error) {
    console.error('❌ [PushNotificationService] Error sending list invitation push notification:', error);
    return { success: false, error: error.message };
  }
};

export const handleNotificationReceived = (notification) => {
  try {
    console.log('📩 [PushNotificationService] Notification received:', notification?.request?.content?.title || 'Unknown');
    
    // Handle the notification data safely
    const data = notification?.request?.content?.data;
    
    if (!data) {
      console.log('📩 [PushNotificationService] Notification has no data');
      return;
    }
    
    switch (data.type) {
      case 'follow':
        console.log('👤 Follow notification received from:', data.fromUserName || 'Unknown user');
        break;
      case 'unfollow':
        console.log('👤 Unfollow notification received from:', data.fromUserName || 'Unknown user');
        break;
      case 'comment':
        console.log('💬 Comment notification received from:', data.fromUserName || 'Unknown user');
        break;
      case 'comment_deleted':
        console.log('🗑️ Comment delete notification received from:', data.fromUserName || 'Unknown user');
        break;
      case 'like':
        console.log('❤️ Like notification received from:', data.fromUserName || 'Unknown user');
        break;
      case 'list_invitation':
        console.log('📋 List invitation notification received from:', data.fromUserName || 'Unknown user');
        break;
      default:
        console.log('📩 Unknown notification type:', data.type || 'none');
    }
  } catch (error) {
    console.error('❌ [PushNotificationService] Error handling notification received:', error);
  }
};

export const handleNotificationResponse = (response) => {
  try {
    console.log('👆 [PushNotificationService] Notification tapped');
    
    const data = response?.notification?.request?.content?.data;
    
    if (!data) {
      console.log('📩 [PushNotificationService] Notification response has no data');
      return { screen: 'Notifications' };
    }
    
    // Return navigation info based on notification type
    switch (data.type) {
      case 'follow':
      case 'unfollow':
        return {
          screen: 'Profile',
          params: { userId: data.fromUserId }
        };
      case 'comment':
      case 'comment_deleted':
      case 'like':
        return {
          screen: 'PostDetail',
          params: { postId: data.postId }
        };
      case 'list_invitation':
        return {
          screen: 'Notifications'
        };
      default:
        return {
          screen: 'Notifications'
        };
    }
  } catch (error) {
    console.error('❌ [PushNotificationService] Error handling notification response:', error);
    return { screen: 'Notifications' };
  }
};