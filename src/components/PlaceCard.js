import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Alert, Image, Clipboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import MapView, { Marker } from 'react-native-maps';
import ImageModal from './ImageModal';
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
  onSnapshot
} from 'firebase/firestore';
import { 
  sendLikeNotification, 
  sendPlaceLikeNotification,
  sendCommentNotification, 
  sendCommentDeleteNotification 
} from '../services/notificationService';
import { 
  sendLikePushNotification, 
  sendCommentPushNotification, 
  sendCommentDeletePushNotification 
} from '../services/pushNotificationService';
import GlobalStateService from '../services/globalStateService';

// Import activity service
import ActivityService from '../services/activityService';

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
      month: 'short' 
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

const getSafeDate = (value) => {
  if (!value) return null;
  try {
    if (value.toDate && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (value.seconds) {
      return new Date(value.seconds * 1000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const renderAvatarContent = (value, size = 48) => {
  const stringValue = typeof value === 'string' ? value : '';
  const isHttpImage = stringValue.startsWith('http://') || stringValue.startsWith('https://');
  const isDataImage = stringValue.startsWith('data:image');

  if (stringValue && (isHttpImage || isDataImage) && stringValue.length > 10) {
    return (
      <Image
        source={{ uri: stringValue }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        onError={() => {
          console.log('PlaceCard avatar image failed to load');
        }}
      />
    );
  }

  if (stringValue && !isHttpImage && !isDataImage) {
    return (
      <View style={[styles.avatarEmoji, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarEmojiText, { fontSize: size * 0.5 }]}>{stringValue}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <MaterialIcons name="person" size={size * 0.5} color={colors.primary} />
    </View>
  );
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
  userData = null // Dış kaynaktan gelen kullanıcı bilgileri
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
  const [fullTextModal, setFullTextModal] = useState({
    visible: false,
    title: '',
    content: '',
  });
  const mapRef = useRef(null); // MapView referansı
  const debounceTimer = useRef(null); // Debounce timer'ı

  const currentUser = auth.currentUser;
  
  // Tutarlı placeId oluştur - tüm ekranlarda aynı olması için
  const placeId = place.id || 
    `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.latitude || 0}_${place.longitude || 0}_${place.userId || 'no-user'}`;

  // Safely extract and validate text content
  const safePlaceName = place.name ? String(place.name).replace(/[\n\r]/g, ' ').trim() : 'İsimsiz Mekan';
  const safePlaceNote = place.note ? String(place.note).trim() : '';
  const safeRating = place.rating && typeof place.rating === 'number' ? place.rating : 0;
  const hasPhotos = Array.isArray(place.photos) && place.photos.length > 0;
  
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
    const likesQuery = query(
      collection(db, 'placeLikes'),
      where('placeId', '==', placeId)
    );
    
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
          userAvatar: likeData.userAvatar || '',
          createdAt: likeData.createdAt
        });
      });
      
      setLikes(likesData);
      setLikesCount(likesData.length);
      const isLikedByUser = likesData.some(like => like.userId === currentUser?.uid);
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
          userAvatar: commentData.userAvatar || '',
          text: commentData.text,
          createdAt: commentData.createdAt
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
          avatar: userData.avatar || '',
          email: userData.email
        });
      } else {
        // Kullanıcı bulunamadı, varsayılan değerler
        setUserInfo({
          fullName: 'Bilinmeyen Kullanıcı',
          username: 'kullanici',
          avatar: '',
          email: null
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({
        fullName: 'Bilinmeyen Kullanıcı',
        username: 'kullanici',
        avatar: '',
        email: null
      });
    } finally {
      setLoadingUserInfo(false);
    }
  };

  // Kullanıcı profilini aç
  const handleUserProfilePress = () => {
    if (!navigation || !place.userId) return;
    
    const currentUser = auth.currentUser;
    if (currentUser && place.userId === currentUser.uid) {
      // Kendi profilini açıyor, ProfileScreen'e git
      navigation.getParent()?.navigate('Profile');
    } else {
      // Başka birinin profilini açıyor, ViewProfileScreen'e git
      navigation.navigate('ViewProfile', { 
        userId: place.userId,
        userInfo: userInfo // Yüklenen kullanıcı bilgilerini geçir
      });
    }
  };

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    // Eğer userData prop'u varsa onu kullan, yoksa Firebase'den çek
    if (userData) {
      setUserInfo({
        fullName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Bilinmeyen Kullanıcı',
        username: userData.username || 'kullanici',
        avatar: userData.avatar || '',
        email: userData.email || null
      });
    } else {
      loadUserInfo();
    }
  }, [place.userId, userData]);

  // Cache'den veri çek, yoksa Firestore'dan çek (backup için)
  const loadLikesAndCommentsFromCache = async () => {
    const cachedData = GlobalStateService.getPlaceCardData(placeId);
    
    if (cachedData && (Date.now() - cachedData.lastUpdate) < 30000) { // 30 saniye cache
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
        const likeToDelete = likes.find(like => like.userId === currentUser.uid);
        if (likeToDelete) {
          await deleteDoc(doc(db, 'placeLikes', likeToDelete.id));
          
          // Start all operations in parallel for better performance
          const operations = [];
          
          // 1. Record unlike activity (non-blocking)
          operations.push(
            ActivityService.recordActivity({
              action: 'place_unliked',
              data: {
                placeId: placeId,
                placeName: place.name,
                placeOwnerId: place.userId,
                timestamp: new Date().toISOString()
              }
            }).catch(error => console.warn('Activity recording failed:', error))
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
                        lastNotificationUpdate: serverTimestamp()
                      })
                    ]);
                  }
                } catch (notifError) {
                  console.warn(' [PlaceCard] Non-critical: Failed to delete like notification:', notifError);
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
        const currentUserName = `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Kullanıcı';
        
        const likeData = {
          placeId: placeId,
          placeName: place.name,
          placeAddress: place.address,
          userId: currentUser.uid,
          userName: currentUserName,
          userAvatar: currentUserData?.avatar || '',
          createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'placeLikes'), likeData);
        
        // Start background operations in parallel
        const operations = [];
        
        // 1. Record like activity (non-blocking)
        operations.push(
          ActivityService.recordActivity({
            action: 'place_liked',
            data: {
              placeId: placeId,
              placeName: place.name,
              placeOwnerId: place.userId,
              isOwnPost: place.userId === currentUser.uid,
              timestamp: new Date().toISOString()
            }
          }).catch(error => console.warn('Activity recording failed:', error))
        );
        
        // 2. Send like notification if it's not user's own post
        if (place.userId && place.userId !== currentUser.uid) {
          operations.push(
            (async () => {
              try {
                // Get current user data
                const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const currentUserData = currentUserDoc.data();
                const currentUserName = `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Bir kullanıcı';
                
                // Get post owner data
                const postOwnerDoc = await getDoc(doc(db, 'users', place.userId));
                const postOwnerData = postOwnerDoc.data();
                const postOwnerName = `${postOwnerData?.firstName || ''} ${postOwnerData?.lastName || ''}`.trim() || 'Kullanıcı';
                
                // Send notification and push notification in parallel
                await Promise.all([
                  sendPlaceLikeNotification({
                    fromUserId: currentUser.uid,
                    fromUserName: currentUserName,
                    fromUserAvatar: currentUserData?.avatar || '',
                    toUserId: place.userId,
                    toUserName: postOwnerName,
                    placeId: placeId,
                    placeName: place.name || 'Mekan'
                  }),
                  sendLikePushNotification(currentUserData, place.userId, place.name || 'Mekan paylaşımı')
                ]);
              } catch (notifError) {
                console.warn(' [PlaceCard] Non-critical: Failed to send like notification:', notifError);
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
        placeId: placeId, 
        type: 'like', 
        action: isLiked ? 'unlike' : 'like' 
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
      const currentUserName = `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Kullanıcı';
      
      const commentData = {
        placeId: placeId,
        placeName: place.name,
        placeAddress: place.address,
        userId: currentUser.uid,
        userName: currentUserName,
        userAvatar: currentUserData?.avatar || '',
        text: newComment.trim(),
        createdAt: serverTimestamp()
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
              const currentUserName = `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Bir kullanıcı';
              
              // Get post owner data
              const postOwnerDoc = await getDoc(doc(db, 'users', place.userId));
              const postOwnerData = postOwnerDoc.data();
              const postOwnerName = `${postOwnerData?.firstName || ''} ${postOwnerData?.lastName || ''}`.trim() || 'Kullanıcı';
              
              // Send notification and push notification in parallel
              await Promise.all([
                sendCommentNotification({
                  fromUserId: currentUser.uid,
                  fromUserName: currentUserName,
                  fromUserAvatar: currentUserData?.avatar || '',
                  toUserId: place.userId,
                  toUserName: postOwnerName,
                  postId: placeId,
                  postTitle: place.name || 'Mekan paylaşımı',
                  commentText: commentData.text
                }),
                sendCommentPushNotification(currentUserData, place.userId, place.name || 'Mekan paylaşımı', commentData.text)
              ]);
            } catch (notifError) {
              console.warn(' [PlaceCard] Non-critical: Failed to send comment notification:', notifError);
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
            placeId: placeId, 
            type: 'comment', 
            action: 'add' 
          });

          // Also refresh all PlaceCards globally
          GlobalStateService.refreshAllPlaceCards();
        }) // Reload data to show new comment
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
      Alert.alert(
        'Yorumu Sil',
        'Bu yorumu silmek istediğinizden emin misiniz?',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete comment from Firestore first
                await deleteDoc(doc(db, 'placeComments', comment.id));

                // Update UI immediately
                setComments(prev => prev.filter(c => c.id !== comment.id));
                setCommentsCount(prev => prev - 1);

                // Trigger global state refresh to update all screens
                GlobalStateService.triggerRefresh(['profile', 'home', 'maps']);
                
                // Trigger specific PlaceCard refresh for this place
                GlobalStateService.emit('placeInteraction', { 
                  placeId: placeId, 
                  type: 'comment', 
                  action: 'delete' 
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

                      notificationsSnapshot.docs.forEach(notificationDoc => {
                        const notificationData = notificationDoc.data();
                        // Check if this notification is for the same comment (by content or timestamp)
                        if (notificationData.commentText && comment.text && 
                            notificationData.commentText.includes(comment.text.substring(0, 50))) {
                          deletePromises.push(deleteDoc(doc(db, 'notifications', notificationDoc.id)));
                          notificationCountToDecrease++;
                        }
                      });

                      await Promise.all(deletePromises);

                      // Update notification count for place owner
                      if (notificationCountToDecrease > 0 && place.userId !== currentUser.uid) {
                        await updateDoc(doc(db, 'users', place.userId), {
                          unreadNotifications: increment(-notificationCountToDecrease)
                        });
                      }
                    } catch (notifError) {
                      console.warn(' [PlaceCard] Non-critical: Failed to delete comment notifications:', notifError);
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
                            fromUserName: `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Kullanıcı',
                            fromUserAvatar: currentUserData?.avatar || '',
                            toUserId: comment.userId,
                            toUserName: comment.userName,
                            postId: placeId,
                            postTitle: place.name || 'Mekan paylaşımı',
                            deletedCommentText: comment.text
                          }),
                          sendCommentDeletePushNotification(currentUserData, comment.userId, place.name || 'Mekan paylaşımı')
                        ]);
                      } catch (notifError) {
                        console.warn(' [PlaceCard] Non-critical: Failed to send comment deletion notification:', notifError);
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
                  placeId: placeId, 
                  type: 'comment', 
                  action: 'delete' 
                });

                // Also refresh all PlaceCards globally
                GlobalStateService.refreshAllPlaceCards();

              } catch (deleteError) {
                console.error(' [PlaceCard] Error deleting comment:', deleteError);
                Alert.alert('Hata', 'Yorum silinirken bir hata oluştu.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error(' [PlaceCard] Error in handleDeleteComment:', error);
    }
  };

  const formatDate = (timestamp) => {
    const date = getSafeDate(timestamp);
    if (!date) {
      return null;
    }

    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [copyOptionsVisible, setCopyOptionsVisible] = useState(false);

  const copyAddress = async () => {
    try {
      await Clipboard.setString(place.address);
      Alert.alert('Başarılı', 'Adres panoya kopyalandı.');
      setCopyOptionsVisible(false);
    } catch (error) {
      Alert.alert('Hata', 'Adres kopyalanırken bir hata oluştu.');
    }
  };

  const copyPlaceName = async () => {
    try {
      await Clipboard.setString(safePlaceName);
      Alert.alert('Başarılı', 'Mekan adı panoya kopyalandı.');
      setCopyOptionsVisible(false);
    } catch (error) {
      Alert.alert('Hata', 'Mekan adı kopyalanırken bir hata oluştu.');
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
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.001, // Daha fazla zoom
        longitudeDelta: 0.001, // Daha fazla zoom
      }, 1000);
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
        photos: editPhotos
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

  const handleFavoritePress = () => {
    if (onAddToList) {
      onAddToList(place);
      return;
    }
    Alert.alert('Listeye Ekle', `"${safePlaceName}" mekanını listelerinize eklemek için liste yönetim ekranını kullanın.`);
  };

  const handleShowFullText = (title, content) => {
    if (!content) return;
    setFullTextModal({
      visible: true,
      title,
      content,
    });
  };

  const renderActionButton = ({ icon, label, onPress, active = false, iconColor = '#666' }) => (
    <TouchableOpacity
      key={label}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      style={[styles.actionButton, active && styles.actionButtonActive]}
    >
      <MaterialIcons
        name={icon}
        size={22}
        color={active ? colors.primary : iconColor}
      />
      <Text style={[styles.actionButtonText, active && styles.actionButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const closeFullTextModal = () => {
    setFullTextModal((prev) => ({ ...prev, visible: false }));
  };

  const renderStars = (rating, onPress) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity key={i} onPress={() => onPress && onPress(i + 1)}>
        <MaterialIcons
          name={i < rating ? "star" : "star-border"}
          size={30}
          color={i < rating ? "#FFB800" : "#ddd"}
          style={{ marginHorizontal: 2 }}
        />
      </TouchableOpacity>
    ));
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.placeCard, style]}
        onPress={onPress}
        disabled={!onPress}
      >
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
              {renderAvatarContent(userInfo?.avatar, 48)}
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
                  <Text style={styles.shareTime}>
                    {formatShareTime(place.createdAt)}
                  </Text>
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
                <View 
                  style={[
                    styles.userColorIndicator, 
                    { backgroundColor: place.userColor }
                  ]} 
                />
              )}
              <View style={styles.placeNameWrapper}>
                <Text style={styles.placeName} numberOfLines={2}>
                  {safePlaceName}
                </Text>
                {safePlaceName.length > 30 && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShowFullText('Mekan Adı', safePlaceName);
                    }}
                    style={styles.ellipsisButton}
                  >
                    <MaterialIcons name="more-horiz" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
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
                <Text style={styles.listInfoText}>
                  "{place.listName}" listesine eklendi
                </Text>
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
                <Text style={styles.topActionLabel}>Düzenle</Text>
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
                <Text style={styles.topActionLabel}>Sil</Text>
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
            {safePlaceNote.length > 100 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleShowFullText('Not', safePlaceNote);
                }}
                style={styles.ellipsisButton}
              >
                <MaterialIcons name="more-horiz" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {(safeRating > 0 || hasPhotos) && (
          <View style={styles.mediaSection}>
            {safeRating > 0 && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={18} color="#FFB800" />
                <Text style={styles.ratingText}>{safeRating}/5</Text>
              </View>
            )}

            {hasPhotos && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoStrip}
              >
                {place.photos.slice(0, 5).map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={(e) => {
                      e.stopPropagation();
                      openPhotoModal(index);
                    }}
                    style={styles.photoThumbnail}
                  >
                    <Image
                      source={{ uri: photo.url || photo }}
                      style={styles.thumbnailImage}
                    />
                    {index === 4 && place.photos.length > 5 && (
                      <View style={styles.morePhotosOverlay}>
                        <Text style={styles.morePhotosText}>+{place.photos.length - 5}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Aksiyon butonları */}
        <View style={styles.socialSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderActionButton({
              icon: isLiked ? 'favorite' : 'favorite-border',
              label: `Beğen ${likesCount > 0 ? `(${likesCount})` : ''}`.trim(),
              onPress: handleLike,
              active: isLiked,
              iconColor: isLiked ? '#EF4444' : '#666'
            })}

            {renderActionButton({
              icon: 'comment',
              label: `Yorumlar ${commentsCount > 0 ? `(${commentsCount})` : ''}`.trim(),
              onPress: () => setShowCommentsModal(true)
            })}

            {renderActionButton({
              icon: showAddressDetail ? 'close' : 'location-on',
              label: showAddressDetail ? 'Adresi Gizle' : 'Adres Gör',
              onPress: () => setShowAddressDetail(!showAddressDetail)
            })}

            {renderActionButton({
              icon: 'content-copy',
              label: 'Kopyala',
              onPress: () => setCopyOptionsVisible(true)
            })}

            {onAddToList && renderActionButton({
              icon: 'playlist-add',
              label: 'Listeye Ekle',
              onPress: handleFavoritePress
            })}

            {showFocusButton && onFocus && renderActionButton({
              icon: 'center-focus-strong',
              label: 'Odakla',
              onPress: handleFocus
            })}
          </ScrollView>
          
          {/* Beğeni Listesi Butonu - Her zaman görünür */}
          <TouchableOpacity
            style={styles.likesListButton}
            onPress={() => setShowLikesModal(true)}
          >
            <MaterialIcons name="people-alt" size={18} color={colors.primary} />
            <Text style={styles.likesListButtonText}>
              Beğeni Listesi {likesCount > 0 ? `(${likesCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Adres Detayı */}
        {showAddressDetail && (
          <View style={styles.addressDetailSection}>
            <Text style={styles.addressDetailText}>{place.address}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Copy Options Modal */}
      <Modal
        visible={copyOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyOptionsVisible(false)}
      >
        <View style={styles.copyOptionsOverlay}>
          <View style={styles.copyOptionsContainer}>
            <Text style={styles.copyOptionsTitle}>Kopyalama Seçenekleri</Text>
            <Text style={styles.copyOptionsSubtitle}>Hangi bilgiyi kopyalamak istersiniz?</Text>

            <TouchableOpacity style={styles.copyOptionButton} onPress={copyPlaceName}>
              <MaterialIcons name="content-copy" size={20} color={colors.primary} />
              <Text style={styles.copyOptionText}>Mekan İsmini Kopyala</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyOptionButton} onPress={copyAddress}>
              <MaterialIcons name="map" size={20} color={colors.primary} />
              <Text style={styles.copyOptionText}>Adresi Kopyala</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyOptionCancel} onPress={() => setCopyOptionsVisible(false)}>
              <Text style={styles.copyOptionCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <TouchableOpacity
                onPress={() => setShowLikesModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {likes.map((like) => (
                <View key={like.id} style={styles.userItem}>
                  {renderAvatarContent(like.userAvatar, 48)}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{String(like.userName || 'Anonim')}</Text>
                    <Text style={styles.userDate}>{formatDate(like.createdAt) || ''}</Text>
                  </View>
                </View>
              ))}
              {likes.length === 0 && (
                <Text style={styles.emptyText}>Henüz beğeni yok</Text>
              )}
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
                  {renderAvatarContent(comment.userAvatar, 48)}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.userName}>{String(comment.userName || 'Anonim')}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.createdAt) || ''}</Text>
                    </View>
                    <Text style={styles.commentText}>{String(comment.text || '')}</Text>
                  </View>
                  {/* Delete button - only show for comment owner or place owner */}
                  {(currentUser && (comment.userId === currentUser.uid || place.userId === currentUser.uid)) && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment)}
                      style={styles.deleteCommentButton}
                    >
                      <MaterialIcons name="delete" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {comments.length === 0 && (
                <Text style={styles.emptyText}>Henüz yorum yok</Text>
              )}
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
                style={[styles.sendButton, (!newComment.trim() || loading) && styles.sendButtonDisabled]}
                disabled={!newComment.trim() || loading}
              >
                <MaterialIcons 
                  name="send" 
                  size={20} 
                  color={(!newComment.trim() || loading) ? "#999" : "#3B82F6"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Text Modal */}
      <Modal
        visible={fullTextModal.visible}
        animationType="fade"
        transparent
        onRequestClose={closeFullTextModal}
      >
        <View style={styles.fullTextOverlay}>
          <View style={styles.fullTextContainer}>
            <View style={styles.fullTextHeader}>
              <Text style={styles.fullTextTitle}>{fullTextModal.title}</Text>
              <TouchableOpacity onPress={closeFullTextModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullTextBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fullTextContent}>{fullTextModal.content}</Text>
            </ScrollView>
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
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setShowPhotoModal(false)}
          >
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
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
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
                <View style={styles.ratingSelector}>
                  {renderStars(editRating, setEditRating)}
                </View>
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Fotoğraflar</Text>
                <View style={styles.photoEditContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {editPhotos.map((photo, index) => (
                      <View key={index} style={styles.editPhotoItem}>
                        <Image
                          source={{ uri: photo.url || photo }}
                          style={styles.editPhotoImage}
                        />
                        <TouchableOpacity
                          onPress={() => removePhoto(index)}
                          style={styles.removePhotoButton}
                        >
                          <MaterialIcons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={addPhoto}
                      style={styles.addPhotoButton}
                    >
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4, // Add margin for list info
  },
  listInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  listInfoText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginHorizontal: 4,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topActionButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#4b5563',
  },
  miniMapContainer: {
    height: 180, // Biraz daha yüksek
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    marginBottom: 0, // Alt boşluğu kaldır çünkü harita en üstte
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  addressSection: {
    marginBottom: 12,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
  },
  showAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showAddressButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  fullAddressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullAddress: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  socialSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likesListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 8,
  },
  likesListButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionButton: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  actionButtonActive: {
    backgroundColor: '#e0f2fe',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  deleteCommentButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
  },
  sendButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  noteSection: {
    marginBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
  },
  mediaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  photoStrip: {
    flex: 1,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
  },
  addressDetailSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressDetailText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  copyAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  copyAddressText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  photoGallery: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16, // Yan padding ekle
  },
  photoThumbnail: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  photoModalImageContainer: {
    width: 400,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '90%',
  },
  photoModalIndicator: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editPlaceName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonSave: {
    backgroundColor: '#3B82F6',
  },
  editButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoEditContainer: {
    marginTop: 8,
  },
  editPhotoItem: {
    position: 'relative',
    marginRight: 12,
  },
  editPhotoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  addPhotoText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userAvatarContainer: {
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 24,
    color: colors.primary,
  },
  userDetails: {
    flex: 1,
    marginRight: 10,
  },
  userFullName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.secondary,
  },
  userUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  shareTimeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
  },
  shareTime: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '500',
  },
  // Ortak liste renk göstergesi stilleri
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  userInfoBar: {
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarSmallText: {
    fontSize: 16,
  },
  userInfoDetails: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  userColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.white,
  },
  placeNameWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ellipsisButton: {
    padding: 4,
  },
  avatarEmoji: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  avatarEmojiText: {
    color: colors.primary,
    fontWeight: '600',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  fullTextOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullTextContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fullTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fullTextTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  fullTextBody: {
    maxHeight: '80%',
  },
  fullTextContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  copyOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copyOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  copyOptionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  copyOptionsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  copyOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
    gap: 12,
  },
  copyOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  copyOptionCancel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginTop: 8,
  },
  copyOptionCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default memo(PlaceCard);
