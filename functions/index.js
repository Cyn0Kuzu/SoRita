const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.sendPushNotification = functions.firestore
  .document("pendingNotifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    const { userId, title, body, data } = notificationData.message;

    if (!userId) {
      console.error("User ID not found in notification data");
      return;
    }

    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      console.error(`User with ID ${userId} not found`);
      return;
    }

    const { pushToken } = userDoc.data();
    if (!pushToken) {
      console.warn(`Push token not found for user ${userId}`);
      return;
    }

    const message = {
      to: pushToken,
      sound: "default",
      title: title,
      body: body,
      data: data,
    };

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
      console.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending push notification to user ${userId}:`, error);
    }
  });
