import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Image
} from 'react-native';
import { Text, Avatar, Button, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, serverTimestamp, orderBy, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { colors } from '../theme/theme';
import { ListCard } from '../components/CommonComponents';
import PlaceCard from '../components/PlaceCard';
import ViewListModal from '../components/ViewListModal';
import SoRitaHeader from '../components/SoRitaHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { sendFollowNotification, sendUnfollowNotification } from '../services/notificationService';
import { 
  sendFollowPushNotification, 
  sendUnfollowPushNotification 
} from '../services/pushNotificationService';
import { usePlaceCardSync } from '../hooks/useRealtimeSync';
import ImageModal from '../components/ImageModal';
import UserSafetyService from '../services/userSafetyService';
import GlobalStateService from '../services/globalStateService';

export default function ViewProfileScreen({ route, navigation }) {
  const [userData, setUserData] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    subject: '',
    categories: [],
    details: '',
    attachments: [],
    attachmentUrls: [],
  });
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ iBlocked: false, blockedMe: false });
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0
  });

  // List modal states
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listModalType, setListModalType] = useState(''); // 'followers', 'following', 'posts', 'lists'
  const [listData, setListData] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Error handling states
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // View list modal states
  const [viewListModalVisible, setViewListModalVisible] = useState(false);
  const [selectedListData, setSelectedListData] = useState(null);

  // User lists for main display
  const [userLists, setUserLists] = useState([]);
  const [userListsLoading, setUserListsLoading] = useState(false);

  // User places states
  const [userPlaces, setUserPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Tab system for lists/places
  const [activeTab, setActiveTab] = useState('listeler'); // 'listeler' or 'mekanlar'
  
  // Liste filtreleme sistemi
  const [listFilterVisible, setListFilterVisible] = useState(false);
  const [selectedListFilter, setSelectedListFilter] = useState('all'); // 'all', 'public', 'private', 'collaborative'
  
  // Image modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState('');
  
  const listFilterOptions = [
    { key: 'all', label: 'Tümü', description: 'Tüm listeler', icon: 'folder' },
    { key: 'public', label: 'Herkese Açık', description: 'Herkese açık listeler', icon: 'public' },
    { key: 'collaborative', label: 'Ortak', description: 'Ortak listeler', icon: 'group' }
  ];
  const reportCategories = [
    { key: 'spam', label: 'Spam / Sahte', icon: 'block' },
    { key: 'harassment', label: 'Taciz / Tehdit', icon: 'warning' },
    { key: 'inappropriate', label: 'Uygunsuz İçerik', icon: 'visibility-off' },
    { key: 'privacy', label: 'Gizlilik / Güvenlik', icon: 'lock' },
    { key: 'fake', label: 'Sahte Hesap', icon: 'person-off' },
    { key: 'violence', label: 'Şiddet İçeriği', icon: 'gavel' },
    { key: 'hate', label: 'Nefret Söylemi', icon: 'cancel' },
    { key: 'copyright', label: 'Telif Hakkı İhlali', icon: 'copyright' },
    { key: 'other', label: 'Diğer', icon: 'more-horiz' },
  ];
  
  // Global state synchronization for PlaceCard components
  const placeCardSync = usePlaceCardSync();

  const { userId } = route.params;
  const currentUser = auth.currentUser;
  const isInteractionBlocked = blockStatus.iBlocked || blockStatus.blockedMe;

  // Don't let users view their own profile - redirect to ProfileScreen
  useEffect(() => {
    if (currentUser && userId === currentUser.uid) {
      // Navigate to Profile tab instead of stack screen
      navigation.getParent()?.navigate('Profile');
      return;
    }
    
    if (userId && currentUser) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    if (!currentUser || !userId) {
      return;
    }

    const iBlocked = Array.isArray(currentUserData?.blockedUsers)
      ? currentUserData.blockedUsers.includes(userId)
      : false;
    const blockedMe = Array.isArray(userData?.blockedUsers)
      ? userData.blockedUsers.includes(currentUser.uid)
      : false;

    setBlockStatus({ iBlocked, blockedMe });
  }, [currentUserData?.blockedUsers, userData?.blockedUsers, currentUser?.uid, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const followersQuery = query(
      collection(db, 'follows'),
      where('followedUserId', '==', userId)
    );

    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', userId)
    );

    const unsubscribeFollowers = onSnapshot(
      followersQuery,
      (snapshot) => {
        setStats((prev) => ({
          ...prev,
          followers: snapshot.size,
        }));
      },
      (error) => {
        console.error(' [ViewProfile] Followers listener error:', error);
      }
    );

    const unsubscribeFollowing = onSnapshot(
      followingQuery,
      (snapshot) => {
        setStats((prev) => ({
          ...prev,
          following: snapshot.size,
        }));
      },
      (error) => {
        console.error(' [ViewProfile] Following listener error:', error);
      }
    );

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsOffline(false);
      
      await Promise.all([
        loadUserProfile(),
        loadCurrentUserData(),
        loadUserListsData(),
        loadUserPlaces()
      ]);
    } catch (error) {
      console.error(' [ViewProfile] Error loading data:', error);
      
      // Check if it's a Firebase offline error
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        setIsOffline(true);
        setError('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
      } else {
        setError('Profil yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const retryLoading = () => {
    loadData();
  };

  const handleToggleBlock = async () => {
    if (!currentUser) {
      Alert.alert('Hata', 'İşlemi gerçekleştirmek için giriş yapın.');
      return;
    }

    try {
      setSafetyMenuVisible(false);
      setBlockActionLoading(true);

      if (blockStatus.iBlocked) {
        await UserSafetyService.unblockUser(userId);
        const updatedBlocked = (currentUserData?.blockedUsers || []).filter(id => id !== userId);
        setCurrentUserData(prev => ({ ...(prev || {}), blockedUsers: updatedBlocked }));
        await GlobalStateService.updateUserData({ blockedUsers: updatedBlocked });
        setBlockStatus(prev => ({ ...prev, iBlocked: false }));
        Alert.alert('Engel Kaldırıldı', 'Kullanıcının engeli kaldırıldı.');
      } else {
        await UserSafetyService.blockUser(userId, { reason: 'profile_action', context: 'view_profile' });
        const updatedBlocked = [...new Set([...(currentUserData?.blockedUsers || []), userId])];
        setCurrentUserData(prev => ({ ...(prev || {}), blockedUsers: updatedBlocked }));
        await GlobalStateService.updateUserData({ blockedUsers: updatedBlocked });
        setBlockStatus(prev => ({ ...prev, iBlocked: true }));
        Alert.alert('Kullanıcı Engellendi', 'Bu kullanıcıyla ilgili içerikler gizlenecek.');
      }
    } catch (error) {
      console.error(' [ViewProfile] Block toggle error:', error);
      Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newAttachments = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image',
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
        }));

        setReportForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...newAttachments],
        }));
      }
    } catch (error) {
      console.error(' [ViewProfile] Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const removeAttachment = (index) => {
    setReportForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
      attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index),
    }));
  };

  const uploadAttachments = async () => {
    if (reportForm.attachments.length === 0) {
      return [];
    }

    setUploadingAttachments(true);
    const uploadPromises = reportForm.attachments.map(async (attachment) => {
      try {
        const response = await fetch(attachment.uri);
        const blob = await response.blob();
        const fileName = `reports/${currentUser.uid}/${Date.now()}_${attachment.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      } catch (error) {
        console.error(' [ViewProfile] Attachment upload error:', error);
        throw error;
      }
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setUploadingAttachments(false);
      return urls;
    } catch (error) {
      setUploadingAttachments(false);
      throw error;
    }
  };

  const toggleCategory = (categoryKey) => {
    setReportForm(prev => {
      const categories = prev.categories || [];
      if (categories.includes(categoryKey)) {
        return {
          ...prev,
          categories: categories.filter(cat => cat !== categoryKey),
        };
      } else {
        return {
          ...prev,
          categories: [...categories, categoryKey],
        };
      }
    });
  };

  const handleReportSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Hata', 'İşlemi gerçekleştirmek için giriş yapın.');
      return;
    }

    if (!reportForm.subject.trim() || !reportForm.details.trim()) {
      Alert.alert('Eksik Bilgi', 'Başlık ve açıklama alanlarını doldurun.');
      return;
    }

    if (reportForm.categories.length === 0) {
      Alert.alert('Eksik Bilgi', 'En az bir kategori seçmelisiniz.');
      return;
    }

    try {
      setReportSubmitting(true);

      // Upload attachments first
      let attachmentUrls = [];
      if (reportForm.attachments.length > 0) {
        attachmentUrls = await uploadAttachments();
      }

      await UserSafetyService.submitUserReport({
        targetUserId: userId,
        targetUserEmail: userData?.email,
        targetUserName: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
        reporterEmail: currentUser.email,
        subject: reportForm.subject.trim(),
        categories: reportForm.categories,
        description: reportForm.details.trim(),
        attachments: reportForm.attachments.map((att, idx) => ({
          name: att.name,
          type: att.type,
          size: att.size,
          url: attachmentUrls[idx] || null,
        })),
        attachmentUrls: attachmentUrls,
      });
      
      setReportModalVisible(false);
      setReportForm({ 
        subject: '', 
        categories: [], 
        details: '', 
        attachments: [],
        attachmentUrls: [],
      });
      Alert.alert('Bildiriminiz Alındı', 'Destek ekibi en kısa sürede değerlendirecek.');
    } catch (error) {
      console.error(' [ViewProfile] Report submit error:', error);
      Alert.alert('Hata', error.message || 'Bildiriminiz gönderilemedi. Daha sonra tekrar deneyin.');
    } finally {
      setReportSubmitting(false);
      setUploadingAttachments(false);
    }
  };

  const loadUserStats = async (profileData) => {
    try {
      // Initialize stats with profile data
      let newStats = {
        followers: profileData.followersCount || 0,
        following: profileData.followingCount || 0
      };
      
      setStats(newStats);
      
    } catch (error) {
      console.error(' [ViewProfile] Error loading stats:', error);
      // Don't throw - stats loading failure shouldn't block profile loading
    }
  };

  const loadUserProfile = async () => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        Alert.alert('Hata', 'Kullanıcı profili bulunamadı.');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }
        return;
      }

      const profileData = userDoc.data();
      setUserData(profileData);
      
      // Load user stats (posts, lists, etc.)
      await loadUserStats(profileData);

    } catch (error) {
      console.error(' [ViewProfile] Error loading profile:', error);
      throw error; // Re-throw to be handled by loadData
    }
  };

  const loadCurrentUserData = async () => {
    try {
      if (!currentUser) return;
      
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const currentUserDoc = await getDoc(currentUserDocRef);

      if (currentUserDoc.exists()) {
        const currentData = currentUserDoc.data();
        setCurrentUserData(currentData);
        
        // Check if already following
        const following = currentData.following || [];
        setIsFollowing(following.includes(userId));
      }
    } catch (error) {
      console.error(' [ViewProfile] Error loading current user data:', error);
      throw error; // Re-throw to be handled by loadData
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !userData || followLoading) return;

    setFollowLoading(true);
    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', userId);

      if (isFollowing) {
        // Unfollow
        console.log(' [ViewProfile] Unfollowing user:', userData.displayName);
        
        // Remove from follows collection
        const followsQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', currentUser.uid),
          where('followedUserId', '==', userId)
        );
        const followsSnap = await getDocs(followsQuery);
        
        const deletePromises = followsSnap.docs.map(doc => deleteDoc(doc.ref));
        
        await Promise.all([
          ...deletePromises,
          updateDoc(currentUserRef, {
            following: arrayRemove(userId),
            followingCount: increment(-1)
          }),
          updateDoc(targetUserRef, {
            followers: arrayRemove(currentUser.uid),
            followersCount: increment(-1)
          })
        ]);
        setIsFollowing(false);
        
        // Start background operations (don't wait for them to complete)
        const backgroundOperations = [];
        
        // Delete original follow notifications when unfollowing
        backgroundOperations.push(
          (async () => {
            try {
              const followNotificationsQuery = query(
                collection(db, 'notifications'),
                where('type', '==', 'follow'),
                where('fromUserId', '==', currentUser.uid),
                where('toUserId', '==', userId)
              );
              
              const followNotificationsSnapshot = await getDocs(followNotificationsQuery);
              const deleteNotificationPromises = followNotificationsSnapshot.docs.map(notificationDoc => 
                deleteDoc(doc(db, 'notifications', notificationDoc.id))
              );
              
              await Promise.all(deleteNotificationPromises);
              
              // Update notification count for target user
              if (followNotificationsSnapshot.docs.length > 0) {
                await updateDoc(doc(db, 'users', userId), {
                  unreadNotifications: increment(-followNotificationsSnapshot.docs.length)
                });
              }
              
              console.log(' [ViewProfile] Follow notifications deleted:', followNotificationsSnapshot.docs.length);
            } catch (deleteNotifError) {
              console.warn(' [ViewProfile] Non-critical: Error deleting follow notifications:', deleteNotifError);
            }
          })()
        );
        
        // Send unfollow notification
        backgroundOperations.push(
          (async () => {
            try {
              await Promise.all([
                sendUnfollowNotification({
                  fromUserId: currentUser.uid,
                  fromUserName: currentUserData?.displayName || 'Bir kullanıcı',
                  fromUserAvatar: currentUserData?.avatar || '',
                  toUserId: userId,
                  toUserName: userData.displayName
                }),
                sendUnfollowPushNotification(currentUserData, userId)
              ]);
              console.log('� [ViewProfile] Unfollow notifications sent');
            } catch (notifError) {
              console.warn(' [ViewProfile] Non-critical: Error sending unfollow notification:', notifError);
            }
          })()
        );
        
        // Start background operations but don't wait
        Promise.allSettled(backgroundOperations);
        
        // Güncel istatistikleri yükle (hem kendi hem karşı taraf için)
        await Promise.all([
          updateRealFollowerCount(),
          updateRealFollowingCount(currentUser.uid)
        ]);
        console.log(' [ViewProfile] Successfully unfollowed');
      } else {
        // Follow
        console.log(' [ViewProfile] Following user:', userData.displayName);
        
        await Promise.all([
          // Add to follows collection
          addDoc(collection(db, 'follows'), {
            followerId: currentUser.uid,
            followedUserId: userId,
            createdAt: serverTimestamp(),
            timestamp: Date.now()
          }),
          updateDoc(currentUserRef, {
            following: arrayUnion(userId),
            followingCount: increment(1)
          }),
          updateDoc(targetUserRef, {
            followers: arrayUnion(currentUser.uid),
            followersCount: increment(1)
          })
        ]);
        setIsFollowing(true);
        
        // Start background notification operations (don't wait for them)
        const followOperations = [];
        
        followOperations.push(
          (async () => {
            try {
              await Promise.all([
                sendFollowNotification({
                  fromUserId: currentUser.uid,
                  fromUserName: currentUserData?.displayName || 'Bir kullanıcı',
                  fromUserAvatar: currentUserData?.avatar || '',
                  toUserId: userId,
                  toUserName: userData.displayName
                }),
                sendFollowPushNotification(currentUserData, userId)
              ]);
              console.log(' [ViewProfile] Follow notifications sent');
            } catch (notifError) {
              console.warn(' [ViewProfile] Non-critical: Error sending follow notification:', notifError);
            }
          })()
        );
        
        // Start background operations
        Promise.allSettled(followOperations);
        
        // Güncel istatistikleri yükle (hem kendi hem karşı taraf için)
        await Promise.all([
          updateRealFollowerCount(),
          updateRealFollowingCount(currentUser.uid)
        ]);
        console.log(' [ViewProfile] Successfully followed');
      }
    } catch (error) {
      console.error(' [ViewProfile] Error following/unfollowing:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilirken bir hata oluştu.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Function to get real follower count
  const updateRealFollowerCount = async () => {
    try {
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', userId)
      );
      const followersSnap = await getDocs(followersQuery);
      const realFollowerCount = followersSnap.size;
      
      setStats(prev => ({
        ...prev,
        followers: Math.max(0, realFollowerCount)
      }));
    } catch (error) {
      console.warn('Could not update real follower count:', error);
    }
  };

  // Takip edilen kullanıcının bildirim sayısını güncelle
  const updateNotificationCount = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const currentCount = userDocSnap.exists() && userDocSnap.data().unreadNotifications ? userDocSnap.data().unreadNotifications : 0;
      await updateDoc(userDocRef, {
        unreadNotifications: Math.max(0, currentCount + 1)
      });
    } catch (error) {
      console.warn('Bildirim sayısı güncellenemedi:', error);
    }
  };

  // Kendi following sayısını güncelle
  const updateRealFollowingCount = async (uid) => {
    try {
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', uid)
      );
      const followingSnap = await getDocs(followingQuery);
      setStats(prev => ({
        ...prev,
        following: Math.max(0, followingSnap.size)
      }));
    } catch (error) {
      console.warn('Could not update real following count:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const showStatsList = async (type) => {
    if (!userId) return;
    
    setListLoading(true);
    setListData([]);
    setSearchQuery('');
    
    let modalType = '';
    switch (type) {
      case 'followers':
        modalType = 'followers';
        break;
      case 'following':
        modalType = 'following';
        break;
      case 'posts':
        modalType = 'posts';
        break;
      case 'lists':
        modalType = 'lists';
        break;
    }
    
    setListModalType(modalType);
    setListModalVisible(true);
    
    try {
      await loadListData(modalType, userId);
    } catch (error) {
      console.error(' [ViewProfile] Error loading list data:', {
        type: modalType,
        userId: userId,
        error: error,
        code: error.code,
        message: error.message
      });
      
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        Alert.alert(
          'Yükleniyor', 
          'Veriler hazırlanıyor. Lütfen birkaç dakika sonra tekrar deneyin.'
        );
      } else if (error.code === 'permission-denied' || error.message?.includes('permissions') || error.message?.includes('Missing or insufficient permissions')) {
        Alert.alert(
          'Erişim Hatası', 
          `Bu ${modalType} listesine erişim izniniz bulunmuyor. Error: ${error.code || 'unknown'}`
        );
      } else {
        Alert.alert('Hata', `Liste yüklenirken bir hata oluştu: ${error.code || error.message}`);
      }
    } finally {
      setListLoading(false);
    }
  };

  const loadListData = async (type, targetUserId) => {
    console.log(` [ViewProfile] Loading ${type} for user:`, targetUserId);
    
    try {
      let data = [];
      
      switch (type) {
        case 'followers':
          // Get followers
          const followersQuery = query(
            collection(db, 'follows'),
            where('followedUserId', '==', targetUserId)
          );
          const followersSnap = await getDocs(followersQuery);
          
          const followerIds = followersSnap.docs.map(doc => doc.data().followerId);
          if (followerIds.length > 0) {
            // Get user details for followers
            for (const followerId of followerIds) {
              try {
                const userDoc = await getDoc(doc(db, 'users', followerId));
                if (userDoc.exists()) {
                  data.push({
                    id: followerId,
                    ...userDoc.data(),
                    type: 'user'
                  });
                }
              } catch (error) {
                console.warn('Could not load follower:', followerId, error);
              }
            }
          }
          break;
          
        case 'following':
          // Get following
          const followingQuery = query(
            collection(db, 'follows'),
            where('followerId', '==', targetUserId)
          );
          const followingSnap = await getDocs(followingQuery);
          
          const followingIds = followingSnap.docs.map(doc => doc.data().followedUserId);
          if (followingIds.length > 0) {
            // Get user details for following
            for (const followedId of followingIds) {
              try {
                const userDoc = await getDoc(doc(db, 'users', followedId));
                if (userDoc.exists()) {
                  data.push({
                    id: followedId,
                    ...userDoc.data(),
                    type: 'user'
                  });
                }
              } catch (error) {
                console.warn('Could not load following user:', followedId, error);
              }
            }
          }
          break;
          
        case 'posts':
          // Get posts
          const postsQuery = query(
            collection(db, 'posts'),
            where('userId', '==', targetUserId)
          );
          const postsSnap = await getDocs(postsQuery);
          data = postsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'post'
          }));
          break;
          
        case 'lists':
          // Get lists
          console.log(' [ViewProfile] Querying lists for userId:', targetUserId);
          const listsQuery = query(
            collection(db, 'lists'),
            where('userId', '==', targetUserId)
          );
          const listsSnap = await getDocs(listsQuery);
          console.log(' [ViewProfile] Lists query result - document count:', listsSnap.docs.length);
          
          data = listsSnap.docs
            .map(doc => {
              const docData = doc.data();
              const listData = {
                id: doc.id,
                ...docData,
                type: 'list',
                placesCount: docData.places?.length || 0 // ListCard component için
              };
              console.log(' [ViewProfile] Processing list:', docData.name || 'Unnamed list', 'Privacy:', docData.privacy || 'undefined');
              return listData;
            })
            .filter(list => {
              // Show public lists or lists from current user  
              const isPublic = !list['isPrivate'] && (list['privacy'] === 'public' || !list['privacy']);
              const isOwnList = currentUser && list['userId'] === currentUser.uid;
              const shouldShow = isPublic || isOwnList;
              console.log(' [ViewProfile] List filter:', list['name'], 'isPublic:', isPublic, 'isOwnList:', isOwnList, 'shouldShow:', shouldShow);
              return shouldShow;
            });
          console.log(' [ViewProfile] Final lists data after filtering:', data.length, 'lists');
          break;
      }
      
      console.log(` [ViewProfile] Loaded ${data.length} ${type}`);
      setListData(data);
      
      // Update stats to match actual list count (ensure non-negative)
      setStats(prev => ({
        ...prev,
        [type]: Math.max(0, data.length)
      }));
    } catch (error) {
      console.error(' [ViewProfile] Error loading list data:', {
        type,
        targetUserId,
        code: error.code,
        message: error.message
      });
      throw error;
    }
  };
  
  // Liste filtreleme fonksiyonu
  const getFilteredLists = () => {
    if (selectedListFilter === 'all') {
      return userLists;
    }
    
    return userLists.filter(list => {
      switch (selectedListFilter) {
        case 'public':
          // Herkese açık listeler: tamamen public olanlar veya özel ama herkese açık olanlar
          return list.privacy === 'public' || (!list.isPrivate && list.privacy !== 'private');
        case 'collaborative':
          return list.isCollaborative;
        default:
          return true;
      }
    });
  };

  // Load user lists for main profile display
  const loadUserListsData = async () => {
    try {
      setUserListsLoading(true);
      console.log(' [ViewProfile] Loading user lists for main display, userId:', userId);
      
      const listsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', userId)
      );
      
      const listsSnap = await getDocs(listsQuery);
      console.log(' [ViewProfile] User lists query result - document count:', listsSnap.docs.length);
      
      const lists = listsSnap.docs
        .map(doc => {
          const docData = doc.data();
          const listData = {
            id: doc.id,
            ...docData,
            placesCount: docData.places?.length || 0 // ListCard component için
          };
          console.log(' [ViewProfile] Processing user list:', docData.name || 'Unnamed list', 'Privacy:', docData.privacy || 'undefined');
          console.log(' [ViewProfile] List image info:', {
            listName: docData.name,
            hasImage: !!docData.image,
            imagePath: docData.image,
            isCacheFile: docData.image?.includes('cache/ImagePicker'),
            isFirebaseURL: docData.image?.includes('firebase')
          });
          return listData;
        })
        .filter(list => {
          // Show public lists and private but publicly visible lists
          // Hide only completely private lists (isPrivate=true and privacy='private')
          const isPublic = list['privacy'] === 'public' || (!list['isPrivate'] && list['privacy'] !== 'private');
          const isOwnList = currentUser && list['userId'] === currentUser.uid;
          const shouldShow = isPublic || isOwnList;
          console.log(' [ViewProfile] User list filter:', list['name'], 'isPublic:', isPublic, 'isOwnList:', isOwnList, 'shouldShow:', shouldShow);
          return shouldShow;
        });
      
      console.log(' [ViewProfile] Final user lists after filtering:', lists.length, 'lists');
      setUserLists(lists);
      
    } catch (error) {
      console.error(' [ViewProfile] Error loading user lists:', error);
      // Don't throw - list loading failure shouldn't block profile loading
    } finally {
      setUserListsLoading(false);
    }
  };

  // Load user places for main profile display
  const loadUserPlaces = async () => {
    try {
      setPlacesLoading(true);
      console.log(' [ViewProfile] Loading user places for userId:', userId);
      
      // Get all user lists
      const userListsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', userId)
      );
      
      const userListsSnapshot = await getDocs(userListsQuery);
      const allPlaces = [];
      
      // Extract places from all lists
      userListsSnapshot.docs.forEach(doc => {
        const listData = doc.data();
        // Show public lists and private but publicly visible lists
        // Hide only completely private lists (isPrivate=true and privacy='private')
        const isPublic = listData['privacy'] === 'public' || (!listData['isPrivate'] && listData['privacy'] !== 'private');
        const isOwnList = currentUser && listData['userId'] === currentUser.uid;
        
        if ((isPublic || isOwnList) && listData.places && listData.places.length > 0) {
          listData.places.forEach(place => {
            // Add list info to place
            const placeWithListInfo = {
              ...place,
              listId: doc.id,
              listName: listData.name,
              userId: listData.userId, // PlaceCard için gerekli
              id: place.id || `${place.name}_${place.address}`.replace(/[^a-zA-Z0-9]/g, '_')
            };
            allPlaces.push(placeWithListInfo);
          });
        }
      });

      // Remove duplicates based on place coordinates
      const uniquePlaces = allPlaces.filter((place, index, self) => 
        index === self.findIndex(p => 
          p.coordinate?.latitude === place.coordinate?.latitude && 
          p.coordinate?.longitude === place.coordinate?.longitude &&
          p.name === place.name
        )
      );

      setUserPlaces(uniquePlaces);
      console.log(' [ViewProfile] User places loaded:', uniquePlaces.length);
    } catch (error) {
      console.error(' [ViewProfile] Error loading user places:', error);
      // Don't throw - places loading failure shouldn't block profile loading
    } finally {
      setPlacesLoading(false);
    }
  };

  const getFilteredData = () => {
    if (!searchQuery || !searchQuery.trim()) return listData;
    
    return listData.filter(item => {
      const query = String(searchQuery || '').toLowerCase();
      
      switch (item.type) {
        case 'user':
          const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
          const username = (item.username || '').toLowerCase();
          return fullName.includes(query) || username.includes(query);
          
        case 'post':
          const content = (item.content || '').toLowerCase();
          const title = (item.title || '').toLowerCase();
          return content.includes(query) || title.includes(query);
          
        case 'list':
          const listName = (item.name || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          return listName.includes(query) || description.includes(query);
          
        default:
          return false;
      }
    });
  };

  const renderListItem = ({ item }) => {
    switch (item.type) {
      case 'user':
        return (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              setListModalVisible(false);
              if (item.id !== auth.currentUser?.uid) {
                navigation.navigate('ViewProfile', { userId: item.id });
              } else {
                navigation.getParent()?.navigate('Profile');
              }
            }}
          >
            <View style={styles.userItem}>
              <View style={styles.userAvatar}>
                {item.avatar && (item.avatar.startsWith('data:image') || 
                  ((item.avatar.startsWith('http://') || item.avatar.startsWith('https://')) && item.avatar.length > 10)) ? (
                  <Image 
                    source={{ uri: item.avatar }} 
                    style={styles.userAvatarImage}
                    onError={() => {
                      console.log('User avatar image failed to load');
                    }}
                  />
                ) : (
                  <Text style={styles.userAvatarText}>
                    {item.avatar && !item.avatar.startsWith('http') ? item.avatar : (item.firstName?.charAt(0)?.toUpperCase() || '')}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.firstName || ''} {item.lastName || ''}</Text>
                <Text style={styles.userUsername}>@{item.username || ''}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
        
      case 'post':
        return (
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.postItem}>
              <Text style={styles.postContent} numberOfLines={3}>
                {item.content || 'İçerik yok'}
              </Text>
              <Text style={styles.postDate}>
                {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString('tr-TR') : 'Tarih yok'}
              </Text>
            </View>
          </TouchableOpacity>
        );
        
      case 'list':
        return (
          <ListCard
            list={item}
            onPress={() => {
              console.log('List pressed:', item.name);
              setSelectedListData(item);
              setViewListModalVisible(true);
            }}
            showPrivacyIcon={true}
            showArrow={false}
            showDates={false}
            style={styles.listCardStyle}
          />
        );
        
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (listModalType) {
      case 'followers':
        return 'Takipçiler';
      case 'following':
        return 'Takip Edilenler';
      case 'posts':
        return 'Gönderiler';
      case 'lists':
        return 'Listeler';
      default:
        return 'Liste';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <AppStatusBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        <View style={styles.centered}>
          {error ? (
            <>
              <MaterialIcons 
                name={isOffline ? "wifi-off" : "error-outline"} 
                size={64} 
                color={colors.textSecondary} 
              />
              <Text style={styles.errorText}>{error}</Text>
              <Button 
                mode="contained" 
                onPress={retryLoading}
                style={{ marginTop: 16 }}
              >
                {isOffline ? 'Tekrar Dene' : 'Yeniden Yükle'}
              </Button>
              <Button onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }}>
                Geri Dön
              </Button>
            </>
          ) : (
            <>
              <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.errorText}>Profil bulunamadı</Text>
              <Button onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }}>
                Geri Dön
              </Button>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const blockMenuLabel = blockStatus.iBlocked ? 'Engeli Kaldır' : 'Engelle';
  const safetyMenu = currentUser && currentUser.uid !== userId ? (
    <Menu
      visible={safetyMenuVisible}
      onDismiss={() => setSafetyMenuVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setSafetyMenuVisible(true)}
          style={styles.safetyMenuButton}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      }
    >
      <Menu.Item
        onPress={() => {
          setSafetyMenuVisible(false);
          setReportModalVisible(true);
        }}
        title="Bildir"
        leadingIcon="alert-circle-outline"
      />
      <Menu.Item
        onPress={handleToggleBlock}
        title={blockMenuLabel}
        leadingIcon="block-helper"
        disabled={blockActionLoading}
      />
    </Menu>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppStatusBar />
      
      {/* Header */}
      <SoRitaHeader 
        showBackButton={true}
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }}
        rightComponent={safetyMenu}
      />

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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => {
              if (userData.avatar && (userData.avatar.startsWith('http') || userData.avatar.startsWith('data:image'))) {
                setCurrentImageUri(userData.avatar);
                setShowImageModal(true);
              }
            }}
          >
            {userData.avatar && (((userData.avatar.startsWith('http://') || userData.avatar.startsWith('https://')) && userData.avatar.length > 10) || userData.avatar.startsWith('data:image')) ? (
              <Avatar.Image 
                size={120} 
                source={{ uri: userData.avatar }} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.emojiAvatar}>
                <Text style={styles.emojiText}>
                  {userData.avatar && !userData.avatar.startsWith('http') ? userData.avatar : ''}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name and Username */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {userData.firstName} {userData.lastName}
            </Text>
            <Text style={styles.username}>
              @{userData.username}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => showStatsList('followers')}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => showStatsList('following')}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            {userData.bio ? (
              <Text style={styles.bio}>{userData.bio}</Text>
            ) : (
              <Text style={styles.noBio}>Henüz biyografi eklenmemiş.</Text>
            )}
          </View>

          {/* Follow Button */}
          {currentUser && currentUser.uid !== userId && (
            <View style={styles.followButtonContainer}>
              {isInteractionBlocked ? (
                <Text style={styles.blockedInfoText}>
                  {blockStatus.blockedMe
                    ? 'Bu kullanıcı sizi engelledi.'
                    : 'Bu kullanıcıyı engellediniz.'}
                </Text>
              ) : (
                <Button
                  mode={isFollowing ? "outlined" : "contained"}
                  onPress={handleFollow}
                  loading={followLoading}
                  disabled={followLoading || blockActionLoading}
                  style={[
                    styles.followButton,
                    isFollowing ? styles.unfollowButton : styles.followButtonFilled
                  ]}
                  labelStyle={[
                    styles.followButtonText,
                    isFollowing ? styles.unfollowButtonText : styles.followButtonTextFilled
                  ]}
                >
                  {followLoading 
                    ? 'İşleniyor...' 
                    : isFollowing 
                      ? 'Takipten Çık' 
                      : 'Takip Et'
                  }
                </Button>
              )}
            </View>
          )}
        </View>

        {/* Content Sections */}
        {isInteractionBlocked ? (
          <View style={styles.blockedContentBox}>
            <MaterialIcons name="privacy-tip" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.blockedContentTitle}>İçerikler Gizlendi</Text>
            <Text style={styles.blockedContentSubtitle}>
              {blockStatus.blockedMe
                ? 'Bu kullanıcı sizi engellediği için içeriklerine erişemezsiniz.'
                : 'Bu kullanıcıyı engellediğiniz için içerikleri gizlendi.'}
            </Text>
          </View>
        ) : (
        <View style={styles.contentSections}>
          {/* Lists/Places Tab Section */}
          <View style={styles.section}>
            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'listeler' && styles.activeTabButton]}
                onPress={() => setActiveTab('listeler')}
              >
                <MaterialIcons 
                  name="list" 
                  size={20} 
                  color={activeTab === 'listeler' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.tabButtonText, activeTab === 'listeler' && styles.activeTabButtonText]}>
                  Listeler ({userLists.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'mekanlar' && styles.activeTabButton]}
                onPress={() => setActiveTab('mekanlar')}
              >
                <MaterialIcons 
                  name="location-on" 
                  size={20} 
                  color={activeTab === 'mekanlar' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.tabButtonText, activeTab === 'mekanlar' && styles.activeTabButtonText]}>
                  Mekanlar ({userPlaces.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'listeler' ? (
              <View>
                {/* Liste Filtreleme Seçenekleri */}
                {listFilterVisible && (
                  <View style={styles.filterContainer}>
                    <View style={styles.filterHeader}>
                      <Text style={styles.filterTitle}>Liste Türü Seçin</Text>
                      <TouchableOpacity 
                        style={styles.filterCloseButton}
                        onPress={() => {
                          setListFilterVisible(false);
                          setSelectedListFilter('all');
                        }}
                      >
                        <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    
                    {listFilterOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.filterOption,
                          selectedListFilter === option.key && styles.selectedFilterOption
                        ]}
                        onPress={() => {
                          setSelectedListFilter(option.key);
                          setListFilterVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.filterOptionLabel,
                          selectedListFilter === option.key && styles.selectedFilterOptionLabel
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={styles.filterOptionDescription}>
                          {option.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Filtreleme Butonu */}
                <View style={styles.filterButtonContainer}>
                  <TouchableOpacity 
                    style={styles.filterButton}
                    onPress={() => setListFilterVisible(!listFilterVisible)}
                  >
                    <MaterialIcons name="filter-list" size={20} color={colors.primary} />
                    <Text style={styles.filterButtonText}>
                      {listFilterOptions.find(opt => opt.key === selectedListFilter)?.label || 'Filtrele'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Lists Content */}
                {userListsLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Listeler yükleniyor...</Text>
                </View>
              ) : getFilteredLists().length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="list" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>Henüz liste yok</Text>
                  <Text style={styles.emptySubtitle}>
                    {selectedListFilter === 'all' 
                      ? 'Bu kullanıcı henüz hiç liste oluşturmamış.'
                      : `${listFilterOptions.find(opt => opt.key === selectedListFilter)?.description} bulunamadı.`
                    }
                  </Text>
                </View>
              ) : (
                <View style={styles.listsContainer}>
                  {getFilteredLists().map((list, index) => {
                    console.log(' [ViewProfileScreen] Mapping list:', list.name, 'at index:', index);
                    return (
                      <ListCard
                        key={list.id || index}
                        list={list}
                        onPress={() => {
                          setSelectedListData(list);
                          setViewListModalVisible(true);
                        }}
                        showPrivacyIcon={true}
                        showArrow={true}
                        showDates={true}
                        showActions={false}
                        showUserInfo={true}
                        userInfo={userData} // Liste sahibi bilgilerini geç
                        style={styles.enhancedListCard}
                      />
                    );
                  })}
                </View>
              )}
              </View>
            ) : (
              // Places Content
              placesLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Mekanlar yükleniyor...</Text>
                </View>
              ) : userPlaces.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="location-on" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>Henüz mekan yok</Text>
                  <Text style={styles.emptySubtitle}>
                    Bu kullanıcı henüz hiç mekan kaydetmemiş.
                  </Text>
                </View>
              ) : (
                <View style={styles.placesContainer}>
                  {userPlaces.map((place, index) => {
                    console.log(' [ViewProfileScreen] Place object:', index, place);
                    
                    // PlaceCard için veri formatını düzelt
                    const formattedPlace = {
                      ...place,
                      note: place.userContent?.note || '',
                      photos: place.userContent?.photos || [],
                      rating: place.userContent?.rating || 0,
                      latitude: place.coordinate?.latitude || place.latitude,
                      longitude: place.coordinate?.longitude || place.longitude,
                      // Tutarlı ID oluştur - PlaceCard ile aynı mantık
                      id: place.id || 
                        `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || place.latitude || 0}_${place.coordinate?.longitude || place.longitude || 0}_${place.userId || userData?.id || 'no-user'}`
                    };
                    
                    return (
                      <PlaceCard
                        key={place.id || `place_${index}`}
                        place={formattedPlace}
                        refreshTrigger={placeCardSync.refreshTrigger}
                        showUserInfo={true}
                        onFocus={() => {
                          // Navigate to map with place focus
                          navigation.navigate('MapScreen', {
                            focusedPlace: place,
                            cameFromViewProfile: true
                          });
                        }}
                        showFocusButton={true}
                        showMap={true}
                        isEvent={false}
                        onAddToList={(selectedPlace) => {
                          if (!selectedPlace) return;
                          const coordinate = selectedPlace.coordinate || (
                            selectedPlace.latitude && selectedPlace.longitude
                              ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }
                              : null
                          );

                          const placeData = {
                            name: selectedPlace.name,
                            address: selectedPlace.address,
                            coordinate,
                            district: selectedPlace.district || '',
                            province: selectedPlace.province || '',
                            isEstablishment: true,
                            placeTypes: selectedPlace.placeTypes || ['point_of_interest'],
                            userContent: selectedPlace.userContent,
                          };

                          navigation.navigate('Map', {
                            selectedPlace4List: placeData,
                            fromViewList: true,
                            showAddToListModal: true,
                          });
                        }}
                        onViewList={(place) => {
                          // Navigate to the list that contains this place
                          if (place.listId && place.listName) {
                            // Find the list in userLists and switch to lists tab
                            const targetList = userLists.find(list => list.id === place.listId);
                            if (targetList) {
                              // Switch to lists tab and show list details
                              setActiveTab('listeler');
                              setTimeout(() => {
                                setSelectedListData(targetList);
                                setViewListModalVisible(true);
                              }, 200);
                            } else {
                              Alert.alert('Hata', 'Liste bulunamadı.');
                            }
                          } else {
                            Alert.alert('Hata', 'Bu mekanın liste bilgisi bulunamadı.');
                          }
                        }}
                        navigation={navigation}
                      />
                    );
                  })}
                </View>
              )
            )}
          </View>
        </View>
        )}
      </ScrollView>

      {/* List Modal */}
      <Modal
        visible={listModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.listModalOverlay}>
          <View style={styles.listModalContent}>
            <View style={styles.listModalHeader}>
              <Text style={styles.listModalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity onPress={() => setListModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Ara..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            {/* List Content */}
            {listLoading ? (
              <View style={styles.listEmptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.listEmptyText}>Yükleniyor...</Text>
              </View>
            ) : getFilteredData().length === 0 ? (
              <View style={styles.listEmptyState}>
                <MaterialIcons 
                  name={
                    listModalType === 'followers' ? 'people' :
                    listModalType === 'following' ? 'person-add' :
                    listModalType === 'posts' ? 'article' : 'list'
                  } 
                  size={48} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.listEmptyText}>
                  {searchQuery.trim() ? 'Arama sonucu bulunamadı' : `Henüz ${(getModalTitle() || 'öğe').toLowerCase()} yok`}
                </Text>
              </View>
            ) : (
              <FlatList
                data={getFilteredData()}
                renderItem={renderListItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 400 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* View List Modal */}
      <ViewListModal
        visible={viewListModalVisible}
        onClose={() => {
          setViewListModalVisible(false);
          setSelectedListData(null);
        }}
        listData={selectedListData}
        navigation={navigation}
      />
      
      {/* Image Modal */}
      <ImageModal
        visible={showImageModal}
        imageUri={currentImageUri}
        onClose={() => setShowImageModal(false)}
        title="Profil Fotoğrafı"
      />

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!reportSubmitting && !uploadingAttachments) {
            setReportModalVisible(false);
            setReportForm({ 
              subject: '', 
              categories: [], 
              details: '', 
              attachments: [],
              attachmentUrls: [],
            });
          }
        }}
      >
        <View style={styles.reportModalBackdrop}>
          <View style={styles.reportModalCard}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Profili Bildir</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!reportSubmitting && !uploadingAttachments) {
                    setReportModalVisible(false);
                    setReportForm({ 
                      subject: '', 
                      categories: [], 
                      details: '', 
                      attachments: [],
                      attachmentUrls: [],
                    });
                  }
                }}
                disabled={reportSubmitting || uploadingAttachments}
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.reportModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.reportDescription}>
                Bildiriminiz memodee333@gmail.com adresine iletilecek ve destek ekibi tarafından incelenecektir.
              </Text>
              
              <Text style={styles.reportLabel}>Başlık *</Text>
              <TextInput
                style={styles.reportInput}
                placeholder="Bildirim başlığı"
                placeholderTextColor={colors.textSecondary}
                value={reportForm.subject}
                onChangeText={(text) => setReportForm(prev => ({ ...prev, subject: text }))}
                maxLength={120}
                editable={!reportSubmitting && !uploadingAttachments}
              />
              <Text style={styles.reportCharCount}>{reportForm.subject.length}/120</Text>

              <Text style={styles.reportLabel}>Kategori * (Birden fazla seçebilirsiniz)</Text>
              <View style={styles.reportCategoryWrapper}>
                {reportCategories.map((category) => {
                  const isSelected = (reportForm.categories || []).includes(category.key);
                  return (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.reportCategoryChip,
                        isSelected && styles.reportCategoryChipActive
                      ]}
                      onPress={() => toggleCategory(category.key)}
                      disabled={reportSubmitting || uploadingAttachments}
                    >
                      <MaterialIcons 
                        name={category.icon || 'label'} 
                        size={16} 
                        color={isSelected ? '#fff' : colors.primary} 
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.reportCategoryChipText,
                          isSelected && styles.reportCategoryChipTextActive
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(reportForm.categories || []).length === 0 && (
                <Text style={styles.reportErrorText}>En az bir kategori seçmelisiniz</Text>
              )}

              <Text style={styles.reportLabel}>Detaylı Açıklama *</Text>
              <TextInput
                style={[styles.reportInput, styles.reportTextarea]}
                placeholder="Bildiriminiz hakkında detaylı bilgi verin..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={reportForm.details}
                onChangeText={(text) => setReportForm(prev => ({ ...prev, details: text }))}
                editable={!reportSubmitting && !uploadingAttachments}
              />

              <Text style={styles.reportLabel}>Belgeler / Fotoğraflar (Opsiyonel)</Text>
              <Text style={styles.reportSubLabel}>
                Kanıt olarak fotoğraf veya belge ekleyebilirsiniz (Maks: 5 dosya)
              </Text>
              
              <TouchableOpacity
                style={styles.reportAttachmentButton}
                onPress={handlePickImage}
                disabled={reportSubmitting || uploadingAttachments || reportForm.attachments.length >= 5}
              >
                <MaterialIcons name="add-photo-alternate" size={24} color={colors.primary} />
                <Text style={styles.reportAttachmentButtonText}>
                  {reportForm.attachments.length >= 5 
                    ? 'Maksimum dosya sayısına ulaşıldı' 
                    : 'Fotoğraf / Belge Ekle'}
                </Text>
              </TouchableOpacity>

              {reportForm.attachments.length > 0 && (
                <View style={styles.reportAttachmentsList}>
                  {reportForm.attachments.map((attachment, index) => (
                    <View key={index} style={styles.reportAttachmentItem}>
                      <Image 
                        source={{ uri: attachment.uri }} 
                        style={styles.reportAttachmentThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.reportAttachmentInfo}>
                        <Text style={styles.reportAttachmentName} numberOfLines={1}>
                          {attachment.name}
                        </Text>
                        <Text style={styles.reportAttachmentSize}>
                          {(attachment.size / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeAttachment(index)}
                        disabled={reportSubmitting || uploadingAttachments}
                        style={styles.reportAttachmentRemove}
                      >
                        <MaterialIcons name="close" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {(uploadingAttachments || reportSubmitting) && (
                <View style={styles.reportLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.reportLoadingText}>
                    {uploadingAttachments ? 'Dosyalar yükleniyor...' : 'Bildirim gönderiliyor...'}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.reportActions}>
              <Button
                mode="text"
                onPress={() => {
                  if (!reportSubmitting && !uploadingAttachments) {
                    setReportModalVisible(false);
                    setReportForm({ 
                      subject: '', 
                      categories: [], 
                      details: '', 
                      attachments: [],
                      attachmentUrls: [],
                    });
                  }
                }}
                disabled={reportSubmitting || uploadingAttachments}
              >
                İptal
              </Button>
              <Button
                mode="contained"
                onPress={handleReportSubmit}
                loading={reportSubmitting || uploadingAttachments}
                disabled={
                  reportSubmitting || 
                  uploadingAttachments ||
                  !reportForm.subject.trim() ||
                  !reportForm.details.trim() ||
                  (reportForm.categories || []).length === 0
                }
                style={styles.reportSubmitButton}
              >
                {uploadingAttachments ? 'Yükleniyor...' : 'Gönder'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  emojiAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 48,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  bio: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  noBio: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  followButtonContainer: {
    paddingHorizontal: 30,
    width: '100%',
  },
  followButton: {
    borderRadius: 25,
    paddingVertical: 8,
  },
  followButtonFilled: {
    backgroundColor: colors.primary,
  },
  unfollowButton: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  followButtonTextFilled: {
    color: colors.white,
  },
  unfollowButtonText: {
    color: colors.primary,
  },
  blockedInfoText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
  },
  safetyMenuButton: {
    padding: 8,
  },
  contentSections: {
    padding: 20,
  },
  blockedContentBox: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedContentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  blockedContentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reportModalScroll: {
    maxHeight: 500,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  reportDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    backgroundColor: colors.surface,
  },
  reportTextarea: {
    minHeight: 120,
    paddingTop: 12,
  },
  reportCharCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 12,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  reportSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  reportErrorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: -8,
    marginBottom: 8,
  },
  reportCategoryWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reportCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  reportCategoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  reportCategoryChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reportCategoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  reportAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  reportAttachmentButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportAttachmentsList: {
    marginBottom: 12,
  },
  reportAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportAttachmentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  reportAttachmentInfo: {
    flex: 1,
  },
  reportAttachmentName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reportAttachmentSize: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reportAttachmentRemove: {
    padding: 4,
  },
  reportLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 8,
  },
  reportLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  reportSubmitButton: {
    marginLeft: 12,
    minWidth: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },

  // List Modal Styles
  listModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  listModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  listModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: 15,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarText: {
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  postItem: {
    paddingVertical: 8,
  },
  postContent: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  listItemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  listItemDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  listEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  listCardStyle: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedListCard: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.lightBackground,
  },
  
  // User Lists Display Styles
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  listsContainer: {
    paddingVertical: 8,
  },
  contentSection: {
    marginBottom: 24,
  },
  placesContainer: {
    paddingVertical: 8,
  },
  enhancedPlaceCard: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.lightBackground,
  },
  // Tab System Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Filter Styles
  filterButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
  filterContainer: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterCloseButton: {
    padding: 4,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedFilterOption: {
    backgroundColor: colors.primary + '10',
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectedFilterOptionLabel: {
    color: colors.primary,
  },
  filterOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
