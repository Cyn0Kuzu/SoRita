import { collection, doc, addDoc, setDoc, serverTimestamp, getDoc, getDocs, updateDoc, increment, arrayUnion, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendPushNotification } from './pushNotificationService';

export const sendFollowNotification = async ({
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  toUserName
}) => {
  try {
    console.log(' [NotificationService] Sending follow notification...');
    console.log('From:', fromUserName, 'To:', toUserName);

    // Create notification document
    const notificationData = {
      type: 'follow',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      title: 'Yeni Takipçi!',
      message: `${fromUserName} seni takip etmeye başladı`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending follow notification:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping follow notification');
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
  toUserName
}) => {
  try {
    console.log(' [NotificationService] Sending unfollow notification...');
    console.log('From:', fromUserName, 'To:', toUserName);

    // Create notification document
    const notificationData = {
      type: 'unfollow',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      title: 'Takip İptal Edildi',
      message: `${fromUserName} seni takip etmeyi bıraktı`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Unfollow notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending unfollow notification:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping unfollow notification');
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
  listName
}) => {
  try {
    console.log(' [NotificationService] Sending invite notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'List:', listName);

    // Create notification document
    const notificationData = {
      type: 'list_invitation',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      listId: listId,
      listName: listName,
      title: 'Liste Daveti!',
      message: `${fromUserName} seni "${listName}" listesine davet etti`,
      status: 'pending',
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Invite notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending invite notification:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping invite notification');
      return { success: false, offline: true };
    }
    
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log(' [NotificationService] Marking notification as read:', notificationId);
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });

    console.log(' [NotificationService] Notification marked as read');
    
    return { success: true };
  } catch (error) {
    console.error(' [NotificationService] Error marking notification as read:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping notification read update');
      return { success: false, offline: true };
    }
    
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    console.log(' [NotificationService] Marking all notifications as read for user:', userId.substring(0, 8) + '...');
    
    // Reset unread count
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      unreadNotifications: 0
    });

    console.log(' [NotificationService] All notifications marked as read');
    
    return { success: true };
  } catch (error) {
    console.error(' [NotificationService] Error marking all notifications as read:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping mark all notifications read');
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
  commentText
}) => {
  try {
    console.log(' [NotificationService] Sending comment notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if commenting on own post
    if (fromUserId === toUserId) {
      console.log(' [NotificationService] Not sending notification for own post comment');
      return { success: true };
    }

    // Create notification document
    const notificationData = {
      type: 'comment',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      postId: postId,
      postTitle: postTitle,
      commentText: commentText?.substring(0, 100) || '', // Limit comment preview
      title: 'Gönderinize Yorum Yapıldı!',
      message: `${fromUserName} "${postTitle}" paylaşımınıza yorum yaptı: "${commentText?.substring(0, 50) || ''}${commentText?.length > 50 ? '...' : ''}"`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Comment notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending comment notification:', error);
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
  deletedCommentText
}) => {
  try {
    console.log(' [NotificationService] Sending comment delete notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if deleting comment on own post
    if (fromUserId === toUserId) {
      console.log(' [NotificationService] Not sending notification for own post comment deletion');
      return { success: true };
    }

    // Create notification document
    const notificationData = {
      type: 'comment_deleted',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      postId: postId,
      postTitle: postTitle,
      deletedCommentText: deletedCommentText?.substring(0, 100) || '',
      title: 'Yorum Silindi',
      message: `${fromUserName} gönderinizdeki yorumunu sildi`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Comment delete notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending comment delete notification:', error);
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
  placeName
}) => {
  try {
    // Kendine bildirim gönderme
    if (fromUserId === toUserId) {
      console.log(' [NotificationService] Not sending place like notification to self');
      return { success: false, reason: 'self' };
    }

    console.log(' [NotificationService] Sending place like notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Place:', placeName);

    // Geçici olarak basit bildirim oluştur (duplicate check olmadan)
    console.log(' [NotificationService] Creating simple notification while index builds');
    
    try {
      // Create notification document (duplicate check olmadan)
      const notificationData = {
        type: 'place_like',
        fromUserId: fromUserId,
        fromUserName: fromUserName,
        fromUserAvatar: fromUserAvatar,
        toUserId: toUserId,
        toUserName: toUserName,
        placeId: placeId,
        placeName: placeName,
        title: 'Gönderinizi Beğendi!',
        message: `${fromUserName} "${placeName}" paylaşımınızı beğendi`,
        read: false,
        createdAt: serverTimestamp(),
        timestamp: Date.now()
      };

      // Add notification to notifications collection
      const notificationsRef = collection(db, 'notifications');
      const notificationDoc = await addDoc(notificationsRef, notificationData);

      console.log(' [NotificationService] Simple place like notification created:', notificationDoc.id);

      // Update user's notification count
      const userDocRef = doc(db, 'users', toUserId);
      await updateDoc(userDocRef, {
        unreadNotifications: increment(1),
        lastNotificationUpdate: serverTimestamp()
      });

      console.log(' [NotificationService] User notification count updated');

      return {
        success: true,
        notificationId: notificationDoc.id
      };
    } catch (error) {
      console.error(' [NotificationService] Error creating simple notification:', error);
      
      // Eğer hata duplicate check ile ilgiliyse, sadece count'u artır
      if (error.message && error.message.includes('index')) {
        console.log(' [NotificationService] Index issue - updating count only');
        try {
          const userDocRef = doc(db, 'users', toUserId);
          await updateDoc(userDocRef, {
            unreadNotifications: increment(1),
            lastNotificationUpdate: serverTimestamp()
          });
          return { success: true, reason: 'count_only' };
        } catch (countError) {
          console.error(' [NotificationService] Count update also failed:', countError);
          return { success: false, error: countError };
        }
      }
      
      return { success: false, error: error };
    }

    // Index hazır olunca bu kod aktif edilecek:
    /*
    // Create notification document
    const notificationData = {
      type: 'place_like',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      placeId: placeId,
      placeName: placeName,
      title: 'Mekanına Beğeni!',
      message: `${fromUserName} "${placeName}" mekanını beğendi`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Place like notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
    */
  } catch (error) {
    console.error(' [NotificationService] Error sending place like notification:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping place like notification');
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
  postTitle
}) => {
  try {
    console.log(' [NotificationService] Sending like notification...');
    console.log('From:', fromUserName, 'To:', toUserName, 'Post:', postTitle);

    // Don't send notification if liking own post
    if (fromUserId === toUserId) {
      console.log(' [NotificationService] Not sending notification for own post like');
      return { success: true };
    }

    // Create notification document
    const notificationData = {
      type: 'like',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      toUserName: toUserName,
      postId: postId,
      postTitle: postTitle,
      title: 'Gönderiniz Beğenildi!',
      message: `${fromUserName} gönderinizi beğendi`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Add notification to notifications collection
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] Like notification created:', notificationDoc.id);

    // Update user's notification count
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] User notification count updated');

    // Send push notification
    try {
      await sendPushNotification(
        toUserId,
        notificationData.title,
        notificationData.message,
        {
          type: 'follow',
          notificationId: notificationDoc.id,
          fromUserId: fromUserId
        }
      );
    } catch (pushError) {
      console.warn(' [NotificationService] Push notification failed (non-critical):', pushError);
    }

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending like notification:', error);
    
    // Offline durumunda sessizce geç
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - skipping like notification');
      return { success: false, offline: true };
    }
    
    throw error;
  }
};

export const getNotifications = async (userId) => {
  try {
    console.log(' [NotificationService] Getting notifications for user:', userId);
    
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
        ...doc.data()
      });
    });

    console.log(' [NotificationService] Found', notifications.length, 'notifications');
    
    return notifications;
  } catch (error) {
    console.error(' [NotificationService] Error getting notifications:', error);
    
    // Offline durumunda boş array döndür
    if (error.code === 'unavailable' || error.message.includes('offline')) {
      console.log(' [NotificationService] Offline mode - returning empty notifications');
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
  listName
}) => {
  try {
    console.log(' [NotificationService] Sending list invitation accepted notification...');
    console.log('From:', fromUserName, 'To List Owner:', toUserId, 'List:', listName);

    // Bildirim dokümanı oluştur
    const notificationData = {
      type: 'list_invitation_accepted',
      fromUserId: fromUserId,
      fromUserName: fromUserName,
      fromUserAvatar: fromUserAvatar,
      toUserId: toUserId,
      listId: listId,
      listName: listName,
      title: 'Davet Kabul Edildi!',
      message: `${fromUserName}, "${listName}" listenize katıldı`,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    // Bildirim koleksiyonuna ekle
    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log(' [NotificationService] List invitation accepted notification created:', notificationDoc.id);

    // Kullanıcının bildirim sayısını güncelle
    const userDocRef = doc(db, 'users', toUserId);
    await updateDoc(userDocRef, {
      unreadNotifications: increment(1),
      lastNotificationUpdate: serverTimestamp()
    });

    console.log(' [NotificationService] List owner notification count updated');

    return {
      success: true,
      notificationId: notificationDoc.id
    };
  } catch (error) {
    console.error(' [NotificationService] Error sending list invitation accepted notification:', error);
    throw error;
  }
};
