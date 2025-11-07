import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  arrayUnion,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import pushNotificationService from './advancedPushNotificationService';

export const sendFollowNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
}) => {
  try {
    console.log('📬 [NotificationService] Sending follow notification...');
    console.log('From:', fromUserName, 'To:', toUserName);

    const title = 'Yeni Takipçi!';
    const message = `${fromUserName} seni takip etmeye başladı`;

    // Create notification document
    const notificationData = {
      type: 'follow',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'follow',
      fromUserId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending follow notification:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping follow notification');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const sendUnfollowNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
}) => {
  try {
    console.log('📬 [NotificationService] Sending unfollow notification...');
    console.log('From:', fromUserName, 'To:', toUserName);

    const title = 'Takip İptal Edildi';
    const message = `${fromUserName} seni takip etmeyi bıraktı`;

    // Create notification document
    const notificationData = {
      type: 'unfollow',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Unfollow notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'unfollow',
      fromUserId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending unfollow notification:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping unfollow notification');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const sendInviteNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
  listId,
  listName,
}) => {
  try {
    console.log('📬 [NotificationService] Sending invite notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'List:', listName);

    const title = 'Liste Daveti!';
    const message = `${fromUserName} seni "${listName}" listesine davet etti`;

    // Create notification document
    const notificationData = {
      type: 'list_invitation',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      listId,
      listName,
      title,
      message,
      status: 'pending',
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Invite notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'list_invitation',
      listId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending invite notification:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping invite notification');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log('👁️ [NotificationService] Marking notification as read:', notificationId);

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });

    console.log('✅ [NotificationService] Notification marked as read');

    return { success: true };
  } catch (error) {
    console.error('❌ [NotificationService] Error marking notification as read:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping notification read update');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    console.log(
      '👁️ [NotificationService] Marking all notifications as read for user:',
      `${userId.substring(0, 8)}...`
    );

    // Reset unread count
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      unreadNotifications: 0,
    });

    console.log('✅ [NotificationService] All notifications marked as read');

    return { success: true };
  } catch (error) {
    console.error('❌ [NotificationService] Error marking all notifications as read:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping mark all notifications read');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const sendCommentNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
  postId,
  postTitle,
  commentText,
}) => {
  try {
    console.log('📬 [NotificationService] Sending comment notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if commenting on own post
    if (fromUserId === toUserId) {
      console.log('🚫 [NotificationService] Not sending notification for own post comment');
      return { success: true };
    }

    const title = '💬 Gönderinize Yorum Yapıldı!';
    const message = `${fromUserName} "${postTitle}" paylaşımınıza yorum yaptı: "${commentText?.substring(0, 50) || ''}${commentText?.length > 50 ? '...' : ''}"`;

    // Create notification document
    const notificationData = {
      type: 'comment',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      postId,
      postTitle,
      commentText: commentText?.substring(0, 100) || '', // Limit comment preview
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Comment notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'comment',
      postId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending comment notification:', error);
    throw error;
  }
};

export const sendCommentDeleteNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
  postId,
  postTitle,
  deletedCommentText,
}) => {
  try {
    console.log('📬 [NotificationService] Sending comment delete notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if deleting comment on own post
    if (fromUserId === toUserId) {
      console.log(
        '🚫 [NotificationService] Not sending notification for own post comment deletion'
      );
      return { success: true };
    }

    const title = 'Yorum Silindi';
    const message = `${fromUserName} gönderinizdeki yorumunu sildi`;

    // Create notification document
    const notificationData = {
      type: 'comment_deleted',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      postId,
      postTitle,
      deletedCommentText: deletedCommentText?.substring(0, 100) || '',
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(
      '✅ [NotificationService] Comment delete notification created:',
      notificationDoc.id
    );

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'comment_deleted',
      postId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending comment delete notification:', error);
    throw error;
  }
};

export const sendPlaceLikeNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
  placeId,
  placeName,
}) => {
  try {
    // Kendine bildirim gönderme
    if (fromUserId === toUserId) {
      console.log('ℹ️ [NotificationService] Not sending place like notification to self');
      return { success: false, reason: 'self' };
    }

    console.log('📬 [NotificationService] Sending place like notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Place:', placeName);

    const title = '❤️ Gönderinizi Beğendi!';
    const message = `${fromUserName} "${placeName}" paylaşımınızı beğendi`;

    // Create notification document
    const notificationData = {
      type: 'place_like',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      placeId,
      placeName,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Place like notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'place_like',
      placeId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending place like notification:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping place like notification');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const sendLikeNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName,
  postId,
  postTitle,
}) => {
  try {
    console.log('📬 [NotificationService] Sending like notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if liking own post
    if (fromUserId === toUserId) {
      console.log('🚫 [NotificationService] Not sending notification for own post like');
      return { success: true };
    }

    const title = 'Gönderiniz Beğenildi!';
    const message = `${fromUserName} gönderinizi beğendi`;

    // Create notification document
    const notificationData = {
      type: 'like',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      toUserName,
      postId,
      postTitle,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('✅ [NotificationService] Like notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] User notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'like',
      postId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error sending like notification:', error);

    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - skipping like notification');
      return { success: false, offline: true };
    }

    throw error;
  }
};

export const getNotifications = async (userId) => {
  try {
    console.log('📋 [NotificationService] Getting notifications for user:', userId);

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('toUserId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const notifications = [];

    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log('✅ [NotificationService] Found', notifications.length, 'notifications');

    return notifications;
  } catch (error) {
    console.error('❌ [NotificationService] Error getting notifications:', error);

    // Offline durumunda boş array döndür
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log('📱 [NotificationService] Offline mode - returning empty notifications');
      return [];
    }

    throw error;
  }
};

// Liste davet kabul bildirimi gönder
export const sendListInvitationAcceptedNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  listId,
  listName,
}) => {
  try {
    console.log('📬 [NotificationService] Sending list invitation accepted notification...');
    console.log('From:', fromUserName, 'To List Owner:', toUserId, 'List:', listName);

    const title = 'Davet Kabul Edildi!';
    const message = `${fromUserName}, "${listName}" listenize katıldı`;

    // Bildirim dokümanı oluştur
    const notificationData = {
      type: 'list_invitation_accepted',
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId,
      listId,
      listName,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    };

    // Bildirim koleksiyonuna ekle
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(
      '✅ [NotificationService] List invitation accepted notification created:',
      notificationDoc.id
    );

    // Kullanıcının bildirim sayısını güncelle
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp(),
    });

    console.log('✅ [NotificationService] List owner notification count updated');

    // Send push notification
    await pushNotificationService.sendPushNotification(toUserId, title, message, {
      type: 'list_invitation_accepted',
      listId,
    });

    return {
      success: true,
      notificationId: notificationDoc.id,
    };
  } catch (error) {
    console.error(
      '❌ [NotificationService] Error sending list invitation accepted notification:',
      error
    );
    throw error;
  }
};
