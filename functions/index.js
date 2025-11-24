const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();
const expo = new Expo();

// Helper function to check if token is Expo push token
const isExpoPushToken = (token) => {
  return typeof token === 'string' && (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[') ||
    /^[a-zA-Z0-9_-]{22,}$/.test(token)
  );
};

// Trigger when a new notification is created
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    // Skip if notification is already read or doesn't have a toUserId
    if (!notification.toUserId) {
      console.log('No toUserId found, skipping push notification');
      return null;
    }

    try {
      // Get user's push token
      const userDoc = await admin.firestore().collection('users').doc(notification.toUserId).get();
      
      if (!userDoc.exists) {
        console.log('User not found:', notification.toUserId);
        return null;
      }

      const userData = userDoc.data();
      const pushToken = userData.pushToken;

      if (!pushToken) {
        console.log('No push token for user:', notification.toUserId);
        return null;
      }

      // Check if it's an Expo push token
      if (isExpoPushToken(pushToken)) {
        // Send via Expo push service
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error('Invalid Expo push token:', pushToken);
          return null;
        }

        const messages = [{
          to: pushToken,
          sound: 'default',
          title: notification.title || 'Yeni Bildirim',
          body: notification.message || 'Yeni bir bildiriminiz var',
          data: {
            type: notification.type || 'general',
            notificationId: notificationId,
            toUserId: notification.toUserId,
            fromUserId: notification.fromUserId || '',
          },
          priority: 'high',
        }];

        const tickets = await expo.sendPushNotificationsAsync(messages);
        console.log('Expo push notification sent:', tickets);
        
        return { success: true, tickets: tickets };
      } else {
        // Send via FCM for native tokens
        const message = {
          notification: {
            title: notification.title || 'Yeni Bildirim',
            body: notification.message || 'Yeni bir bildiriminiz var',
          },
          data: {
            type: notification.type || 'general',
            notificationId: notificationId,
            toUserId: notification.toUserId,
            fromUserId: notification.fromUserId || '',
          },
          token: pushToken,
        };

        const response = await admin.messaging().send(message);
        console.log('FCM push notification sent:', response);
        
        return { success: true, messageId: response };
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return null;
    }
  });

// HTTP endpoint to manually trigger push notification (for testing)
exports.triggerPushNotification = functions.https.onRequest(async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    res.status(400).json({ error: 'Missing required fields: userId, title, body' });
    return;
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    const pushToken = userData.pushToken;

    if (!pushToken) {
      res.status(400).json({ error: 'User has no push token' });
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      token: pushToken,
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

