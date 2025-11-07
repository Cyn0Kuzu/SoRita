import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import MapView, { Marker } from 'react-native-maps';

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { colors } from '../theme/theme';
import {
  sendLikeNotification,
  sendPlaceLikeNotification,
  sendCommentNotification,
  sendCommentDeleteNotification,
} from '../services/notificationService';
import {
  sendLikePushNotification,
  sendCommentPushNotification,
  sendCommentDeletePushNotification,
} from '../services/pushNotificationService';
import GlobalStateService from '../services/globalStateService';

// Import activity service
import ActivityService from '../services/activityService';

import ImageModal from './ImageModal';

// Paylaşım zamanını formatla
const formatShareTime = (createdAt) => {
  if (!createdAt) return '';

  try {
    let date;
    if (createdAt.toDate) {
      // Firestore Timestamp
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      date = new Date(createdAt);
    }

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes}dk`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}sa`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}g`;

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

const PlaceCard = ({
  place,
  onFocus,
  showFocusButton = true,
  onPress = null,
  onEdit = null,
  onDelete = null,
  onAddToList = null, // Yeni: Listeye ekle butonu
  onViewList = null, // Liste görüntüleme callback'i
  showMap = true,
  isEvent = false, // Etkinlik kartı mı?
  refreshTrigger = null, // Verileri yenileme tetikleyicisi
  style = null, // Dış stil prop'u
  navigation = null, // Navigation prop'u
  showUserInfo = true, // Kullanıcı bilgilerini göster
  userData = null, // Dış kaynaktan gelen kullanıcı bilgileri
}) => {
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showAddress, setShowAddress] = useState(false); // Etkinlik kartlarında adres gizlemek için
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0); // Fotoğraf modal'ı için
  const [showPhotoModal, setShowPhotoModal] = useState(false); // Fotoğraf modal'ı görünürlüğü
  const [showImageModal, setShowImageModal] = useState(false); // Yeni image modal
  const [currentImageUri, setCurrentImageUri] = useState(''); // Mevcut görüntülenen resim
  const [showEditModal, setShowEditModal] = useState(false); // Düzenleme modal'ı
  const [editNote, setEditNote] = useState(''); // Düzenlenen not
  const [editRating, setEditRating] = useState(0); // Düzenlenen puan
  const [editPhotos, setEditPhotos] = useState([]); // Düzenlenen fotoğraflar
  const [showAddressDetail, setShowAddressDetail] = useState(false); // Adres detayı gösterimi
  const [userInfo, setUserInfo] = useState(null); // Kullanıcı bilgileri
  const [loadingUserInfo, setLoadingUserInfo] = useState(false); // Kullanıcı bilgileri yükleniyor mu
  const mapRef = useRef(null); // MapView referansı
  const debounceTimer = useRef(null); // Debounce timer'ı

  const { currentUser } = auth;

  // Tutarlı placeId oluştur - tüm ekranlarda aynı olması için
  const placeId =
    place.id ||
    `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.latitude || 0}_${place.longitude || 0}_${place.userId || 'no-user'}`;

  // Safely extract and validate text content
  const safePlaceName = place.name
    ? String(place.name)
        .replace(/[\n\r]/g, ' ')
        .trim()
    : 'İsimsiz Mekan';
  const safePlaceNote = place.note ? String(place.note).trim() : '';
  const safeRating = place.rating && typeof place.rating === 'number' ? place.rating : 0;

  // Debounced load function - çok sık çağrılmasını engeller
  const debouncedLoadLikesAndComments = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      loadLikesAndComments();
    }, 1000); // 1 saniye debounce
  }, [placeId]); // placeId değiştiğinde yeniden oluştur

  useEffect(() => {
    loadLikesAndComments();

    // Real-time listeners for likes and comments
    const likesQuery = query(collection(db, 'placeLikes'), where('placeId', '==', placeId));

    const commentsQuery = query(
      collection(db, 'placeComments'),
      where('placeId', '==', placeId),
      orderBy('createdAt', 'desc')
    );

    // Listen to likes changes in real-time
    const unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
      const likesData = [];
      snapshot.forEach((docSnap) => {
        const likeData = docSnap.data();
        likesData.push({
          id: docSnap.id,
          userId: likeData.userId,
          userName: likeData.userName || 'Kullanıcı',
          userAvatar: likeData.userAvatar || '👤',
          createdAt: likeData.createdAt,
        });
      });

      setLikes(likesData);
      setLikesCount(likesData.length);
      const isLikedByUser = likesData.some((like) => like.userId === currentUser?.uid);
      setIsLiked(isLikedByUser);

      // Update cache
      GlobalStateService.updatePlaceCardLikes(placeId, likesData, likesData.length, isLikedByUser);
    });

    // Listen to comments changes in real-time
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = [];
      snapshot.forEach((docSnap) => {
        const commentData = docSnap.data();
        commentsData.push({
          id: docSnap.id,
          userId: commentData.userId,
          userName: commentData.userName || 'Kullanıcı',
          userAvatar: commentData.userAvatar || '👤',
          text: commentData.text,
          createdAt: commentData.createdAt,
        });
      });

      setComments(commentsData);
      setCommentsCount(commentsData.length);

      // Update cache
      GlobalStateService.updatePlaceCardComments(placeId, commentsData, commentsData.length);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [placeId]);

  // refreshTrigger değiştiğinde verileri yeniden yükle
  useEffect(() => {
    if (refreshTrigger !== null) {
      debouncedLoadLikesAndComments();
      // Clear any pending comment input
      setNewComment('');
      setLoading(false);
    }
  }, [refreshTrigger]);

  // Global state değişikliklerini dinle
  useEffect(() => {
    const handleGlobalRefresh = () => {
      debouncedLoadLikesAndComments();
    };

    const handlePlaceInteraction = (data) => {
      // Tüm PlaceCard'ları etkileyen global refresh veya bu place'i etkileyen event'leri dinle
      if (!data.placeId || data.placeId === placeId || data.type === 'global_refresh') {
        debouncedLoadLikesAndComments();
      }
    };

    const handlePlaceCardDataUpdate = (data) => {
      // Cache'den gelen veri güncellemelerini dinle
      if (data.placeId === placeId) {
        const cacheData = data.data;
        setLikes(cacheData.likes || []);
        setComments(cacheData.comments || []);
        setLikesCount(cacheData.likesCount || 0);
        setCommentsCount(cacheData.commentsCount || 0);
        setIsLiked(cacheData.isLiked || false);
      }
    };

    // Global state event'lerini dinle
    GlobalStateService.on('refresh', handleGlobalRefresh);
    GlobalStateService.on('userPlacesUpdated', handleGlobalRefresh);
    GlobalStateService.on('userListsUpdated', handleGlobalRefresh);
    GlobalStateService.on('placeInteraction', handlePlaceInteraction);
    GlobalStateService.on('placeCardDataUpdated', handlePlaceCardDataUpdate);

    // Periodic refresh - her 2 dakikada bir kontrol et (daha az agresif)
    const periodicRefresh = setInterval(() => {
      // Sadece like/comment sayısı varsa refresh yap
      if (likesCount > 0 || commentsCount > 0) {
        debouncedLoadLikesAndComments();
      }
    }, 120000); // 2 dakika

    return () => {
      GlobalStateService.off('refresh', handleGlobalRefresh);
      GlobalStateService.off('userPlacesUpdated', handleGlobalRefresh);
      GlobalStateService.off('userListsUpdated', handleGlobalRefresh);
      GlobalStateService.off('placeInteraction', handlePlaceInteraction);
      GlobalStateService.off('placeCardDataUpdated', handlePlaceCardDataUpdate);
      clearInterval(periodicRefresh);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [placeId, safePlaceName]);

  // Kullanıcı bilgilerini çek
  const loadUserInfo = async () => {
    if (!place.userId || loadingUserInfo) return;

    setLoadingUserInfo(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', place.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfo({
          fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          username: userData.username || userData.email?.split('@')[0] || 'kullanici',
          avatar: userData.avatar || '👤',
          email: userData.email,
        });
      } else {
        // Kullanıcı bulunamadı, varsayılan değerler
        setUserInfo({
          fullName: 'Bilinmeyen Kullanıcı',
          username: 'kullanici',
          avatar: '👤',
          email: null,
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({
        fullName: 'Bilinmeyen Kullanıcı',
        username: 'kullanici',
        avatar: '👤',
        email: null,
      });
    } finally {
      setLoadingUserInfo(false);
    }
  };

  // Kullanıcı profilini aç
  const handleUserProfilePress = () => {
    if (!navigation || !place.userId) return;

    const { currentUser } = auth;
    if (currentUser && place.userId === currentUser.uid) {
      // Kendi profilini açıyor, ProfileScreen'e git
      navigation.getParent()?.navigate('Profile');
    } else {
      // Başka birinin profilini açıyor, ViewProfileScreen'e git
      navigation.navigate('ViewProfile', {
        userId: place.userId,
        userInfo, // Yüklenen kullanıcı bilgilerini geçir
      });
    }
  };

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    // Eğer userData prop'u varsa onu kullan, yoksa Firebase'den çek
    if (userData) {
      setUserInfo({
        fullName:
          userData.displayName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          'Bilinmeyen Kullanıcı',
        username: userData.username || 'kullanici',
        avatar: userData.avatar || '👤',
        email: userData.email || null,
      });
    } else {
      loadUserInfo();
    }
  }, [place.userId, userData]);

  // Cache'den veri çek, yoksa Firestore'dan çek (backup için)
  const loadLikesAndCommentsFromCache = async () => {
    const cachedData = GlobalStateService.getPlaceCardData(placeId);

    if (cachedData && Date.now() - cachedData.lastUpdate < 30000) {
      // 30 saniye cache
      // Cache'den veri kullan
      setLikes(cachedData.likes || []);
      setComments(cachedData.comments || []);
      setLikesCount(cachedData.likesCount || 0);
      setCommentsCount(cachedData.commentsCount || 0);
      setIsLiked(cachedData.isLiked || false);
      return true; // Cache'den veri alındı
    }

    return false; // Cache'de veri yok, Firestore'dan çek
  };

  // Backup Firestore loader (real-time listener fail ederse)
  const loadLikesAndComments = async () => {
    try {
      // Önce cache'den veri çekmeyi dene
      const fromCache = await loadLikesAndCommentsFromCache();
      if (fromCache) {
        return; // Cache'den veri alındı, Firestore'a gitmiyoruz
      }

      // Cache'de veri yok, manuel Firestore fetch (backup)

      // Bu artık backup olarak kullanılacak, real-time listener'lar primary
      // Sadece cache miss durumunda çalışır
    } catch (error) {
      console.error('Error loading likes and comments:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        // Unlike
        const likeToDelete = likes.find((like) => like.userId === currentUser.uid);
        if (likeToDelete) {
          await deleteDoc(doc(db, 'placeLikes', likeToDelete.id));

          // Start all operations in parallel for better performance
          const operations = [];

          // 1. Record unlike activity (non-blocking)
          operations.push(
            ActivityService.recordActivity({
              action: 'place_unliked',
              data: {
                placeId,
                placeName: place.name,
                placeOwnerId: place.userId,
                timestamp: new Date().toISOString(),
              },
            }).catch((error) => console.warn('Activity recording failed:', error))
          );

          // 2. Delete the corresponding like notification if exists
          if (place.userId && place.userId !== currentUser.uid) {
            operations.push(
              (async () => {
                try {
                  // Find and delete the like notification for this place
                  const notificationsRef = collection(db, 'notifications');
                  const notificationQuery = query(
                    notificationsRef,
                    where('type', '==', 'place_like'),
                    where('fromUserId', '==', currentUser.uid),
                    where('toUserId', '==', place.userId),
                    where('placeId', '==', placeId)
                  );

                  const notificationSnap = await getDocs(notificationQuery);

                  if (!notificationSnap.empty) {
                    // Run delete and count update in parallel
                    await Promise.all([
                      deleteDoc(doc(db, 'notifications', notificationSnap.docs[0].id)),
                      updateDoc(doc(db, 'users', place.userId), {
                        unreadNotifications: increment(-1),
                        lastNotificationUpdate: serverTimestamp(),
                      }),
                    ]);
                  }
                } catch (notifError) {
                  console.warn(
                    '❌ [PlaceCard] Non-critical: Failed to delete like notification:',
                    notifError
                  );
                }
              })()
            );
          }

          // Wait for all operations to complete (but don't block UI)
          Promise.allSettled(operations);
        }
      } else {
        // Like - önce kullanıcı bilgilerini çek
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentUserData = currentUserDoc.data();
        const currentUserName =
          `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() ||
          'Kullanıcı';

        const likeData = {
          placeId,
          placeName: place.name,
          placeAddress: place.address,
          userId: currentUser.uid,
          userName: currentUserName,
          userAvatar: currentUserData?.avatar || '👤',
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'placeLikes'), likeData);

        // Start background operations in parallel
        const operations = [];

        // 1. Record like activity (non-blocking)
        operations.push(
          ActivityService.recordActivity({
            action: 'place_liked',
            data: {
              placeId,
              placeName: place.name,
              placeOwnerId: place.userId,
              isOwnPost: place.userId === currentUser.uid,
              timestamp: new Date().toISOString(),
            },
          }).catch((error) => console.warn('Activity recording failed:', error))
        );

        // 2. Send like notification if it's not user's own post
        if (place.userId && place.userId !== currentUser.uid) {
          operations.push(
            (async () => {
              try {
                // Get current user data
                const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const currentUserData = currentUserDoc.data();
                const currentUserName =
                  `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() ||
                  'Bir kullanıcı';

                // Get post owner data
                const postOwnerDoc = await getDoc(doc(db, 'users', place.userId));
                const postOwnerData = postOwnerDoc.data();
                const postOwnerName =
                  `${postOwnerData?.firstName || ''} ${postOwnerData?.lastName || ''}`.trim() ||
                  'Kullanıcı';

                // Send notification and push notification in parallel
                await Promise.all([
                  sendPlaceLikeNotification({
                    fromUserId: currentUser.uid,
                    fromUserName: currentUserName,
                    fromUserAvatar: currentUserData?.avatar || '👤',
                    toUserId: place.userId,
                    toUserName: postOwnerName,
                    placeId,
                    placeName: place.name || 'Mekan',
                  }),
                  sendLikePushNotification(
                    currentUserData,
                    place.userId,
                    place.name || 'Mekan paylaşımı'
                  ),
                ]);
              } catch (notifError) {
                console.warn(
                  '❌ [PlaceCard] Non-critical: Failed to send like notification:',
                  notifError
                );
              }
            })()
          );
        }

        // Don't wait for background operations to complete
        Promise.allSettled(operations);
      }

      // Update UI immediately and cache
      const newIsLiked = !isLiked;
      const newLikesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

      // Update local state immediately for instant UI feedback
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      // Update cache for all PlaceCards
      GlobalStateService.updatePlaceCardLikes(placeId, likes, newLikesCount, newIsLiked);

      // Reload data from Firestore to get accurate data and update cache
      setTimeout(() => loadLikesAndComments(), 1000); // Small delay for Firestore consistency

      // Trigger global state refresh to update all screens
      GlobalStateService.triggerRefresh(['profile', 'home', 'maps']);

      // Trigger specific PlaceCard refresh for this place
      GlobalStateService.emit('placeInteraction', {
        placeId,
        type: 'like',
        action: isLiked ? 'unlike' : 'like',
      });

      // Also refresh all PlaceCards globally
      GlobalStateService.refreshAllPlaceCards();
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  const handleComment = async () => {
    if (!currentUser || !newComment.trim()) return;

    setLoading(true);
    try {
      // Önce kullanıcı bilgilerini çek
      const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const currentUserData = currentUserDoc.data();
      const currentUserName =
        `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() ||
        'Kullanıcı';

      const commentData = {
        placeId,
        placeName: place.name,
        placeAddress: place.address,
        userId: currentUser.uid,
        userName: currentUserName,
        userAvatar: currentUserData?.avatar || '👤',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'placeComments'), commentData);

      // Update UI immediately
      setNewComment('');
      setLoading(false);

      // Start background operations (don't wait for them)
      const backgroundOperations = [];

      // Send comment notification if it's not user's own post
      if (place.userId && place.userId !== currentUser.uid) {
        backgroundOperations.push(
          (async () => {
            try {
              // Get current user data
              const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
              const currentUserData = currentUserDoc.data();
              const currentUserName =
                `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() ||
                'Bir kullanıcı';

              // Get post owner data
              const postOwnerDoc = await getDoc(doc(db, 'users', place.userId));
              const postOwnerData = postOwnerDoc.data();
              const postOwnerName =
                `${postOwnerData?.firstName || ''} ${postOwnerData?.lastName || ''}`.trim() ||
                'Kullanıcı';

              // Send notification and push notification in parallel
              await Promise.all([
                sendCommentNotification({
                  fromUserId: currentUser.uid,
                  fromUserName: currentUserName,
                  fromUserAvatar: currentUserData?.avatar || '👤',
                  toUserId: place.userId,
                  toUserName: postOwnerName,
                  postId: placeId,
                  postTitle: place.name || 'Mekan paylaşımı',
                  commentText: commentData.text,
                }),
                sendCommentPushNotification(
                  currentUserData,
                  place.userId,
                  place.name || 'Mekan paylaşımı',
                  commentData.text
                ),
              ]);
            } catch (notifError) {
              console.warn(
                '❌ [PlaceCard] Non-critical: Failed to send comment notification:',
                notifError
              );
            }
          })()
        );
      }

      // Update UI immediately for instant feedback
      const newCommentsCount = commentsCount + 1;
      setCommentsCount(newCommentsCount);
      setLoading(false);

      // Update cache for all PlaceCards
      GlobalStateService.updatePlaceCardComments(placeId, comments, newCommentsCount);

      // Start background operations and reload data in parallel
      Promise.allSettled([
        ...backgroundOperations,
        loadLikesAndComments().then(() => {
          // Trigger global state refresh to update all screens
          GlobalStateService.triggerRefresh(['profile', 'home', 'maps']);

          // Trigger specific PlaceCard refresh for this place
          GlobalStateService.emit('placeInteraction', {
            placeId,
            type: 'comment',
            action: 'add',
          });

          // Also refresh all PlaceCards globally
          GlobalStateService.refreshAllPlaceCards();
        }), // Reload data to show new comment
      ]);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!currentUser) return;

    try {
      // Show confirmation alert
      Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinizden emin misiniz?', [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete comment from Firestore first
              await deleteDoc(doc(db, 'placeComments', comment.id));

              // Update UI immediately
              setComments((prev) => prev.filter((c) => c.id !== comment.id));
              setCommentsCount((prev) => prev - 1);

              // Trigger global state refresh to update all screens
              GlobalStateService.triggerRefresh(['profile', 'home', 'maps']);

              // Trigger specific PlaceCard refresh for this place
              GlobalStateService.emit('placeInteraction', {
                placeId,
                type: 'comment',
                action: 'delete',
              });

              // Also refresh all PlaceCards globally
              GlobalStateService.refreshAllPlaceCards();

              // Start background operations (don't wait for them)
              const backgroundOperations = [];

              // Delete related notifications
              backgroundOperations.push(
                (async () => {
                  try {
                    const notificationsQuery = query(
                      collection(db, 'notifications'),
                      where('type', '==', 'comment'),
                      where('fromUserId', '==', comment.userId),
                      where('postId', '==', placeId)
                    );

                    const notificationsSnapshot = await getDocs(notificationsQuery);

                    // Delete notifications and update user notification count
                    const deletePromises = [];
                    let notificationCountToDecrease = 0;

                    notificationsSnapshot.docs.forEach((notificationDoc) => {
                      const notificationData = notificationDoc.data();
                      // Check if this notification is for the same comment (by content or timestamp)
                      if (
                        notificationData.commentText &&
                        comment.text &&
                        notificationData.commentText.includes(comment.text.substring(0, 50))
                      ) {
                        deletePromises.push(
                          deleteDoc(doc(db, 'notifications', notificationDoc.id))
                        );
                        notificationCountToDecrease++;
                      }
                    });

                    await Promise.all(deletePromises);

                    // Update notification count for place owner
                    if (notificationCountToDecrease > 0 && place.userId !== currentUser.uid) {
                      await updateDoc(doc(db, 'users', place.userId), {
                        unreadNotifications: increment(-notificationCountToDecrease),
                      });
                    }
                  } catch (notifError) {
                    console.warn(
                      '❌ [PlaceCard] Non-critical: Failed to delete comment notifications:',
                      notifError
                    );
                  }
                })()
              );

              // Send comment deletion notification if comment was deleted by place owner (not by comment author)
              if (comment.userId !== currentUser.uid && place.userId === currentUser.uid) {
                backgroundOperations.push(
                  (async () => {
                    try {
                      const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                      const currentUserData = currentUserDoc.data();

                      await Promise.all([
                        sendCommentDeleteNotification({
                          fromUserId: currentUser.uid,
                          fromUserName:
                            `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() ||
                            'Kullanıcı',
                          fromUserAvatar: currentUserData?.avatar || '👤',
                          toUserId: comment.userId,
                          toUserName: comment.userName,
                          postId: placeId,
                          postTitle: place.name || 'Mekan paylaşımı',
                          deletedCommentText: comment.text,
                        }),
                        sendCommentDeletePushNotification(
                          currentUserData,
                          comment.userId,
                          place.name || 'Mekan paylaşımı'
                        ),
                      ]);
                    } catch (notifError) {
                      console.warn(
                        '❌ [PlaceCard] Non-critical: Failed to send comment deletion notification:',
                        notifError
                      );
                    }
                  })()
                );
              }

              // Start background operations
              Promise.allSettled(backgroundOperations);

              // Reload data and trigger global refresh
              await loadLikesAndComments();

              // Trigger global state refresh to update all screens
              GlobalStateService.triggerRefresh(['profile', 'home', 'maps']);

              // Trigger specific PlaceCard refresh for this place
              GlobalStateService.emit('placeInteraction', {
                placeId,
                type: 'comment',
                action: 'delete',
              });

              // Also refresh all PlaceCards globally
              GlobalStateService.refreshAllPlaceCards();
            } catch (deleteError) {
              console.error('❌ [PlaceCard] Error deleting comment:', deleteError);
              Alert.alert('Hata', 'Yorum silinirken bir hata oluştu.');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('❌ [PlaceCard] Error in handleDeleteComment:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return null;
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return null;
    }
  };

  const copyAddress = async () => {
    try {
      await Clipboard.setString(place.address);
      Alert.alert('Başarılı', 'Adres panoya kopyalandı.');
    } catch (error) {
      Alert.alert('Hata', 'Adres kopyalanırken bir hata oluştu.');
    }
  };

  const openPhotoModal = (index) => {
    setSelectedPhotoIndex(index);
    // setShowPhotoModal(true); // Eski modal yerine

    // Yeni ImageModal'ı aç
    const photos = place.photos || [];
    if (photos[index]) {
      const photoUrl = photos[index].url || photos[index];
      setCurrentImageUri(photoUrl);
      setShowImageModal(true);
    }
  };

  const handleFocus = () => {
    // Önce kendi haritasında odakla
    if (mapRef.current && place.latitude && place.longitude && showMap) {
      mapRef.current.animateToRegion(
        {
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.001, // Daha fazla zoom
          longitudeDelta: 0.001, // Daha fazla zoom
        },
        1000
      );
    }

    // Ana haritaya odaklama callback'ini çağır (EditMapModal için)
    if (onFocus) {
      onFocus(place);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit({
        ...place,
        note: editNote,
        rating: editRating,
        photos: editPhotos,
      });
    }
    setShowEditModal(false);
  };

  const addPhoto = () => {
    // Fotoğraf ekleme işlevi - burada image picker kullanılacak
    Alert.alert('Fotoğraf Ekle', 'Fotoğraf ekleme özelliği yakında eklenecek.');
  };

  const removePhoto = (index) => {
    const newPhotos = editPhotos.filter((_, i) => i !== index);
    setEditPhotos(newPhotos);
  };

  const renderStars = (rating, onPress) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity key={i} onPress={() => onPress && onPress(i + 1)}>
        <MaterialIcons
          name={i < rating ? 'star' : 'star-border'}
          size={30}
          color={i < rating ? '#FFB800' : '#ddd'}
          style={{ marginHorizontal: 2 }}
        />
      </TouchableOpacity>
    ));
  };

  return (
    <>
      <TouchableOpacity style={[styles.placeCard, style]} onPress={onPress} disabled={!onPress}>
        {/* Kullanıcı Bilgi Bar'ı - EN ÜSTTE */}
        {showUserInfo && (userInfo || place.userId) && (
          <TouchableOpacity
            style={styles.userInfoBar}
            onPress={handleUserProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.userInfoContent}>
              {/* Profil Fotoğrafı */}
              <View style={styles.userAvatarContainer}>
                <Text style={styles.userAvatarText}>{userInfo?.avatar || '👤'}</Text>
              </View>

              {/* Kullanıcı Bilgileri */}
              <View style={styles.userDetails}>
                <Text style={styles.userFullName} numberOfLines={1}>
                  {userInfo?.fullName || 'Yükleniyor...'}
                </Text>
                {userInfo?.username && (
                  <Text style={styles.userUsername} numberOfLines={1}>
                    @{userInfo.username}
                  </Text>
                )}
              </View>

              {/* Kullanıcı Marker Rengi */}
              {place.userColor && (
                <View style={[styles.userColorIndicator, { backgroundColor: place.userColor }]} />
              )}

              {/* Paylaşım Zamanı */}
              {place.createdAt && (
                <View style={styles.shareTimeContainer}>
                  <Text style={styles.shareTime}>{formatShareTime(place.createdAt)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Küçük harita - Kullanıcı bilgilerinin altında */}
        {showMap && place.latitude && place.longitude && (
          <View style={styles.miniMapContainer}>
            <MapView
              ref={mapRef}
              style={styles.miniMap}
              initialRegion={{
                latitude: place.latitude,
                longitude: place.longitude,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={safePlaceName}
              />
            </MapView>
          </View>
        )}

        {/* Üst kısım - Mekan adı ve düzenle/sil/odakla butonları */}
        <View style={styles.topSection}>
          <View style={styles.placeInfo}>
            <View style={styles.placeNameRow}>
              {/* Kullanıcı renk göstergesi - sadece ortak listelerde */}
              {place.userColor && !place.showUserInfo && (
                <View style={[styles.userColorIndicator, { backgroundColor: place.userColor }]} />
              )}
              <Text style={styles.placeName} numberOfLines={2}>
                {safePlaceName}
              </Text>
            </View>

            {/* Liste bilgisi */}
            {place.listName && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (onViewList) {
                    onViewList(place);
                  }
                }}
                style={styles.listInfoButton}
              >
                <MaterialIcons name="list" size={14} color="#10B981" />
                <Text style={styles.listInfoText}>"{place.listName}" listesine eklendi</Text>
                <MaterialIcons name="chevron-right" size={14} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.topActions}>
            {onEdit && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setEditNote(safePlaceNote);
                  setEditRating(safeRating);
                  setEditPhotos(place.photos || []);
                  setShowEditModal(true);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="edit" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(place);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="delete" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            {onAddToList && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onAddToList(place);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="star" size={18} color="#FFB800" />
              </TouchableOpacity>
            )}

            {showFocusButton && onFocus && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleFocus();
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="center-focus-strong" size={18} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Not kısmı - mekan adının hemen altında */}
        {safePlaceNote && (
          <View style={styles.noteSection}>
            <Text style={styles.noteText} numberOfLines={3}>
              {safePlaceNote}
            </Text>
          </View>
        )}

        {/* Puan ve fotoğraflar kısmı */}
        <View style={styles.metaSection}>
          {/* Puan */}
          {safeRating > 0 && (
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={16} color="#FFB800" />
              <Text style={styles.ratingText}>{safeRating}/5</Text>
            </View>
          )}
        </View>

        {/* Fotoğraf galerisi */}
        {place.photos && Array.isArray(place.photos) && place.photos.length > 0 && (
          <View style={styles.photoGallery}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {place.photos.slice(0, 5).map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={(e) => {
                    e.stopPropagation();
                    openPhotoModal(index);
                  }}
                  style={styles.photoThumbnail}
                >
                  <Image source={{ uri: photo.url || photo }} style={styles.thumbnailImage} />
                  {index === 4 && place.photos.length > 5 && (
                    <View style={styles.morePhotosOverlay}>
                      <Text style={styles.morePhotosText}>+{place.photos.length - 5}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Beğeni, yorum ve adres görme butonları */}
        <View style={styles.socialSection}>
          <View style={styles.likeSection}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              style={styles.socialActionButton}
            >
              <MaterialIcons
                name={isLiked ? 'favorite' : 'favorite-border'}
                size={20}
                color={isLiked ? '#EF4444' : '#666'}
              />
              <Text style={[styles.socialActionText, isLiked && styles.likedText]}>
                {`Beğen${likesCount > 0 ? ` (${likesCount})` : ''}`}
              </Text>
            </TouchableOpacity>

            {/* Beğenileri gör butonu - Beğeni butonunun tam altında */}
            {likesCount > 0 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setShowLikesModal(true);
                }}
                style={styles.viewLikesButtonBelow}
              >
                <Text style={styles.viewLikesTextBelow}>{likesCount} beğeniyi gör</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowCommentsModal(true);
            }}
            style={styles.socialActionButton}
          >
            <MaterialIcons name="comment" size={20} color="#666" />
            <Text style={styles.socialActionText}>
              {`Yorum${commentsCount > 0 ? ` (${commentsCount})` : ''}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowAddressDetail(!showAddressDetail);
            }}
            style={styles.socialActionButton}
          >
            <MaterialIcons name="location-on" size={20} color="#666" />
            <Text style={styles.socialActionText}>Adres Gör</Text>
          </TouchableOpacity>
        </View>

        {/* Adres Detayı */}
        {showAddressDetail && (
          <View style={styles.addressDetailSection}>
            <Text style={styles.addressDetailText}>{place.address}</Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                copyAddress();
              }}
              style={styles.copyAddressButton}
            >
              <MaterialIcons name="content-copy" size={16} color="#3B82F6" />
              <Text style={styles.copyAddressText}>Kopyala</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLikesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beğenenler</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {likes.map((like) => (
                <View key={like.id} style={styles.userItem}>
                  <Text style={styles.userAvatar}>{String(like.userAvatar || '👤')}</Text>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{String(like.userName || 'Anonim')}</Text>
                    <Text style={styles.userDate}>{formatDate(like.createdAt) || ''}</Text>
                  </View>
                </View>
              ))}
              {likes.length === 0 && <Text style={styles.emptyText}>Henüz beğeni yok</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yorumlar</Text>
              <TouchableOpacity
                onPress={() => setShowCommentsModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.userAvatar}>{String(comment.userAvatar || '👤')}</Text>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.userName}>{String(comment.userName || 'Anonim')}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.createdAt) || ''}</Text>
                    </View>
                    <Text style={styles.commentText}>{String(comment.text || '')}</Text>
                  </View>
                  {/* Delete button - only show for comment owner or place owner */}
                  {currentUser &&
                    (comment.userId === currentUser.uid || place.userId === currentUser.uid) && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment)}
                        style={styles.deleteCommentButton}
                      >
                        <MaterialIcons name="delete" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                </View>
              ))}
              {comments.length === 0 && <Text style={styles.emptyText}>Henüz yorum yok</Text>}
            </ScrollView>

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorum yaz..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleComment}
                style={[
                  styles.sendButton,
                  (!newComment.trim() || loading) && styles.sendButtonDisabled,
                ]}
                disabled={!newComment.trim() || loading}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={!newComment.trim() || loading ? '#999' : '#3B82F6'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setShowPhotoModal(false)}>
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {place.photos && Array.isArray(place.photos) && place.photos.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: selectedPhotoIndex * 400, y: 0 }}
            >
              {place.photos.map((photo, index) => (
                <View key={index} style={styles.photoModalImageContainer}>
                  <Image
                    source={{ uri: photo.url || photo }}
                    style={styles.photoModalImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.photoModalIndicator}>
            <Text style={styles.photoModalText}>
              {`${selectedPhotoIndex + 1} / ${place.photos?.length || 0}`}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mekanı Düzenle</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Mekan Adı</Text>
                <Text style={styles.editPlaceName}>{safePlaceName}</Text>
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Not</Text>
                <TextInput
                  style={styles.editTextInput}
                  placeholder="Notunuzu yazın..."
                  value={editNote}
                  onChangeText={setEditNote}
                  multiline
                  maxLength={500}
                />
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Puan (1-5)</Text>
                <View style={styles.ratingSelector}>{renderStars(editRating, setEditRating)}</View>
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Fotoğraflar</Text>
                <View style={styles.photoEditContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {editPhotos.map((photo, index) => (
                      <View key={index} style={styles.editPhotoItem}>
                        <Image source={{ uri: photo.url || photo }} style={styles.editPhotoImage} />
                        <TouchableOpacity
                          onPress={() => removePhoto(index)}
                          style={styles.removePhotoButton}
                        >
                          <MaterialIcons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity onPress={addPhoto} style={styles.addPhotoButton}>
                      <MaterialIcons name="add-a-photo" size={24} color="#666" />
                      <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={[styles.editButton, styles.editButtonCancel]}
                >
                  <Text style={styles.editButtonTextCancel}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleEdit}
                  style={[styles.editButton, styles.editButtonSave]}
                >
                  <Text style={styles.editButtonTextSave}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Yeni Image Modal */}
      <ImageModal
        visible={showImageModal}
        imageUri={currentImageUri}
        onClose={() => setShowImageModal(false)}
        title={place.name}
      />
    </>
  );
};

const styles = StyleSheet.create({
  placeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0, // Padding'i kaldır çünkü harita en üste taşındı
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden', // Harita için gerekli
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed to flex-start to accommodate list info
    marginBottom: 12,
    paddingHorizontal: 16, // Yan padding ekle
    paddingTop: 16, // Üst padding ekle
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4, // Add margin for list info
  },
  listInfoButton: {
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listInfoText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topActionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 8,
  },
  miniMapContainer: {
    height: 180, // Biraz daha yüksek
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    marginBottom: 0, // Alt boşluğu kaldır çünkü harita en üstte
  },
  miniMap: {
    height: '100%',
    width: '100%',
  },
  addressSection: {
    marginBottom: 12,
  },
  placeAddress: {
    color: '#666',
    fontSize: 14,
  },
  showAddressButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  showAddressButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  fullAddressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fullAddress: {
    color: '#666',
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  copyButton: {
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  socialSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 16, // Yan padding ekle
    paddingBottom: 16, // Alt padding ekle
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeSection: {
    alignItems: 'center',
  },
  socialActionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  socialActionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  likedText: {
    color: '#EF4444',
  },
  viewLikesButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8, // Kartın yan padding'i ile uyumlu
  },
  viewLikesText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  viewLikesButtonInline: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  viewLikesTextInline: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  viewLikesButtonBelow: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewLikesTextBelow: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '500',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  modalTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 20,
  },
  userItem: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  userDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  commentItem: {
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentDate: {
    color: '#999',
    fontSize: 12,
  },
  commentText: {
    color: '#333',
    fontSize: 14,
  },
  deleteCommentButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    height: 32,
    justifyContent: 'center',
    marginLeft: 8,
    padding: 8,
    width: 32,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  commentInputContainer: {
    alignItems: 'flex-end',
    borderTopColor: '#f0f0f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 20,
  },
  commentInput: {
    borderColor: '#ddd',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButton: {
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    padding: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  noteSection: {
    marginBottom: 8,
    paddingHorizontal: 16, // Yan padding ekle
  },
  noteText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  metaSection: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16, // Yan padding ekle
  },
  ratingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  photosInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  photoCount: {
    color: '#666',
    fontSize: 12,
  },
  addressDetailSection: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
  },
  addressDetailText: {
    color: '#333',
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  copyAddressButton: {
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyAddressText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  photoGallery: {
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 16, // Yan padding ekle
  },
  photoThumbnail: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnailImage: {
    borderRadius: 8,
    height: 60,
    width: 60,
  },
  morePhotosOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  morePhotosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoModalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    flex: 1,
    justifyContent: 'center',
  },
  photoModalClose: {
    padding: 10,
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 1,
  },
  photoModalImageContainer: {
    alignItems: 'center',
    height: 400,
    justifyContent: 'center',
    width: 400,
  },
  photoModalImage: {
    height: '90%',
    width: '90%',
  },
  photoModalIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    bottom: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
  },
  photoModalText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editPlaceName: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  editTextInput: {
    borderColor: '#ddd',
    borderRadius: 8,
    borderWidth: 1,
    color: '#333',
    fontSize: 16,
    minHeight: 80,
    padding: 12,
    textAlignVertical: 'top',
  },
  ratingSelector: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  editButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  editButtonSave: {
    backgroundColor: '#3B82F6',
  },
  editButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonTextSave: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoEditContainer: {
    marginTop: 8,
  },
  editPhotoItem: {
    marginRight: 12,
    position: 'relative',
  },
  editPhotoImage: {
    borderRadius: 8,
    height: 80,
    width: 80,
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    top: -8,
    width: 24,
  },
  addPhotoButton: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: '#ddd',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  addPhotoText: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  userInfoContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userAvatarContainer: {
    marginRight: 10,
  },
  userAvatarText: {
    color: colors.primary,
    fontSize: 24,
  },
  userDetails: {
    flex: 1,
    marginRight: 10,
  },
  userFullName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: colors.secondary,
    fontSize: 12,
  },
  userUsername: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  shareTimeContainer: {
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shareTime: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  // Ortak liste renk göstergesi stilleri
  placeNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  userColorIndicator: {
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    elevation: 2,
    height: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    width: 12,
  },
  userInfoBar: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: 8,
    paddingBottom: 8,
  },
  userInfoLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  userAvatarSmall: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  userAvatarSmallText: {
    fontSize: 16,
  },
  userInfoDetails: {
    flex: 1,
  },
  userDisplayName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userColorDot: {
    borderColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
});

export default memo(PlaceCard);
