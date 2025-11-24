import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  FlatList,
  Share
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, Menu, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import { doc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { AuthService } from '../services/authService';
import SoRitaHeader from '../components/SoRitaHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { EdgeToEdgeScreen } from '../components/EdgeToEdgeContainer';
import { DEFAULT_AVATARS } from '../constants/avatars';
import { ListCard } from '../components/CommonComponents';
import PlaceCard from '../components/PlaceCard';
import EditMapModal from '../components/EditMapModal';
import EditListInfoModal from '../components/EditListInfoModal';
import ViewListModal from '../components/ViewListModal';
import StorageService from '../services/storageService';
import MigrationService from '../services/migrationService';
import { pickImageFromLibraryAndUpload } from '../utils/imagePicker';
import CollaborativeListService from '../services/collaborativeListService';
import GlobalStateService from '../services/globalStateService';
import { useRealtimeSync, usePlaceCardSync, useListSync } from '../hooks/useRealtimeSync';
import ImageModal from '../components/ImageModal';

export default function ProfileScreen({ navigation }) {
  // Real-time sync hooks
  const realtimeSync = useRealtimeSync('Profile');
  const placeCardSync = usePlaceCardSync('Profile');
  const listSync = useListSync('Profile');
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState(''); // 'avatar', 'firstName', 'lastName', 'username', 'bio'
  const [editValue, setEditValue] = useState('');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  
  // Username validation states
  const [usernameValidation, setUsernameValidation] = useState({
    isValid: true,
    isChecking: false,
    error: '',
    isAvailable: null
  });
  
  // Edit Map Modal states
  const [editMapModalVisible, setEditMapModalVisible] = useState(false);
  const [editingList, setEditingList] = useState(null);
  
  // Edit List Info Modal states
  const [editListInfoModalVisible, setEditListInfoModalVisible] = useState(false);
  const [editingListInfo, setEditingListInfo] = useState(null);
  
  // View List Modal states
  const [viewListModalVisible, setViewListModalVisible] = useState(false);
  const [selectedListForView, setSelectedListForView] = useState(null);
  
  // User places states
  const [userPlaces, setUserPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  
  // Stats states
  const [stats, setStats] = useState({
    followers: 0,
    following: 0
  });
  
  // User lists for grid display
  const [userLists, setUserLists] = useState([]);
  
  // Tab system for lists/places
  const [activeTab, setActiveTab] = useState('listeler'); // 'listeler' or 'mekanlar'
  
  // List modal states
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listModalType, setListModalType] = useState(''); // 'followers', 'following', 'posts', 'lists'
  const [listData, setListData] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Error handling states
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Refresh trigger for PlaceCard components
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Liste filtreleme sistemi
  const [listFilterVisible, setListFilterVisible] = useState(false);
  const [selectedListFilter, setSelectedListFilter] = useState('all'); // 'all', 'public', 'private', 'collaborative'
  
  // Image modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState('');
  
  const listFilterOptions = [
    { key: 'all', label: 'Tümü', description: 'Tüm listeler' },
    { key: 'public', label: 'Herkese Açık', description: 'Herkese açık listeler' },
    { key: 'private', label: 'Özel', description: 'Özel listeler' },
    { key: 'collaborative', label: 'Ortak', description: 'Ortak listeler' }
  ];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log(' [ProfileScreen] No authenticated user, skipping data load');
      return;
    }
    
    console.log(' [ProfileScreen] Component mounted, starting data load...');
    loadUserData();
    loadUserStats();
    loadUserListsForPreview();
    loadUserPlaces(); // Load user places
    
    // Global state listeners
    const handleUserDataUpdate = (updatedData) => {
      console.log(' [ProfileScreen] Received user data update from GlobalState');
      setUserData(updatedData);
    };
    
    const handleUserListsUpdate = (updatedLists) => {
      console.log(' [ProfileScreen] Received user lists update from GlobalState');
      setUserLists(updatedLists);
    };
    
    const handleUserPlacesUpdate = (updatedPlaces) => {
      console.log(' [ProfileScreen] Received user places update from GlobalState');
      setUserPlaces(updatedPlaces);
    };
    
    const handleUserStatsUpdate = (updatedStats) => {
      console.log(' [ProfileScreen] Received user stats update from GlobalState');
      setStats(updatedStats);
    };
    
    const handleProfileRefresh = (trigger) => {
      console.log(' [ProfileScreen] Received refresh trigger from GlobalState');
      setRefreshTrigger(trigger);
    };
    
    // Subscribe to global state changes
    GlobalStateService.on('userDataUpdated', handleUserDataUpdate);
    GlobalStateService.on('userListsUpdated', handleUserListsUpdate);
    GlobalStateService.on('userPlacesUpdated', handleUserPlacesUpdate);
    GlobalStateService.on('userStatsUpdated', handleUserStatsUpdate);
    GlobalStateService.on('refresh_profile', handleProfileRefresh);
    
    return () => {
      // Cleanup listeners
      GlobalStateService.off('userDataUpdated', handleUserDataUpdate);
      GlobalStateService.off('userListsUpdated', handleUserListsUpdate);
      GlobalStateService.off('userPlacesUpdated', handleUserPlacesUpdate);
      GlobalStateService.off('userStatsUpdated', handleUserStatsUpdate);
      GlobalStateService.off('refresh_profile', handleProfileRefresh);
    };
  }, []);

  const loadUserPlaces = async () => {
    try {
      setPlacesLoading(true);
      console.log(' [ProfileScreen] Loading user places...');
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get all user lists
      const userListsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', currentUser.uid)
      );
      
      const userListsSnapshot = await getDocs(userListsQuery);
      const allPlaces = [];
      
      // Extract places from all lists
      userListsSnapshot.docs.forEach(doc => {
        const listData = doc.data();
        if (listData.places && listData.places.length > 0) {
          listData.places.forEach(place => {
            // Add list info to place
            const placeWithListInfo = {
              ...place,
              listId: doc.id,
              listName: listData.name,
              userId: listData.userId || currentUser.uid, // Ensure place has userId for PlaceCard functionality
              // Flatten coordinate object for PlaceCard compatibility
              latitude: place.coordinate?.latitude,
              longitude: place.coordinate?.longitude,
              // Tutarlı ID oluştur - PlaceCard ile aynı mantık
              id: place.id || 
                `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || 0}_${place.coordinate?.longitude || 0}_${listData.userId || currentUser.uid}`,
              // Flatten userContent object for PlaceCard compatibility
              note: place.userContent?.note || place.note || '',
              rating: place.userContent?.rating || place.rating || 0,
              photos: place.userContent?.photos || place.photos || [],
              // Ensure we have name and address for PlaceCard
              name: place.name || 'İsimsiz Mekan',
              address: place.address || 'Adres bilgisi yok'
            };
            console.log(' [ProfileScreen] Processed place for PlaceCard:', placeWithListInfo.name, {
              hasUserId: !!placeWithListInfo.userId,
              hasCoordinates: !!(placeWithListInfo.latitude && placeWithListInfo.longitude),
              hasAddress: !!placeWithListInfo.address,
              listName: placeWithListInfo.listName
            });
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
      
      // Update global state
      await GlobalStateService.updateUserPlaces(uniquePlaces);
      
      console.log(' [ProfileScreen] User places loaded:', uniquePlaces.length);
    } catch (error) {
      console.error(' [ProfileScreen] Error loading user places:', error);
    } finally {
      setPlacesLoading(false);
    }
  };

  // Listen for navigation focus to refresh stats
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log(' [ProfileScreen] Screen focused, refreshing stats...');
      loadUserStats();
      loadUserListsForPreview();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log(' [ProfileScreen] Loading user stats');
      
      // Initialize stats with default values
      let newStats = {
        followers: 0,
        following: 0
      };
      
      try {
        // Get followers count
        const followersQuery = query(
          collection(db, 'follows'),
          where('followedUserId', '==', user.uid)
        );
        const followersSnap = await getDocs(followersQuery);
        newStats.followers = Math.max(0, followersSnap.size);
      } catch (error) {
        console.warn(' [ProfileScreen] Could not load followers:', error.message);
      }
      
      try {
        // Get following count
        const followingQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid)
        );
        const followingSnap = await getDocs(followingQuery);
        newStats.following = Math.max(0, followingSnap.size);
      } catch (error) {
        console.warn(' [ProfileScreen] Could not load following:', error.message);
      }
      
      setStats(newStats);
      
      // Update global state
      await GlobalStateService.updateUserStats(newStats);
      
      // Cache stats
      await AsyncStorage.setItem(`userStats_${user.uid}`, JSON.stringify(newStats));
      
      console.log(' [ProfileScreen] User stats loaded:', newStats);
      
    } catch (error) {
      console.error(' [ProfileScreen] Error loading stats:', error);
      // Use cached stats if available
      try {
        const cachedStats = await AsyncStorage.getItem(`userStats_${auth.currentUser?.uid}`);
        if (cachedStats) {
          const parsedStats = JSON.parse(cachedStats);
          setStats(parsedStats);
          console.log(' [ProfileScreen] Using cached stats:', parsedStats);
        }
      } catch (cacheError) {
        console.warn(' [ProfileScreen] Could not load cached stats:', cacheError.message);
      }
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    const followersQuery = query(
      collection(db, 'follows'),
      where('followedUserId', '==', user.uid)
    );

    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid)
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
        console.error(' [ProfileScreen] Followers listener error:', error);
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
        console.error(' [ProfileScreen] Following listener error:', error);
      }
    );

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, []);

  const loadUserLists = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log(' [ProfileScreen] User not authenticated');
        return [];
      }

      console.log(' [ProfileScreen] Loading user lists for user:', user.uid);
      
      // Kullanıcının kendi listelerini al
      const ownListsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      console.log(' [ProfileScreen] Executing own lists query...');
      const ownListsSnap = await getDocs(ownListsQuery);
      console.log(' [ProfileScreen] Own lists result - document count:', ownListsSnap.size);
      
      // Kullanıcının üye olduğu ortak listeleri al
      console.log(' [ProfileScreen] Loading collaborative lists...');
      const collaborativeLists = await CollaborativeListService.getUserCollaborativeLists(user.uid);
      console.log(' [ProfileScreen] Collaborative lists count:', collaborativeLists.length);
      
      const ownLists = [];
      ownListsSnap.forEach((doc) => {
        const listData = doc.data();
        console.log(' [ProfileScreen] Processing own list:', doc.id, listData.title);
        ownLists.push({
          id: doc.id,
          ...listData,
          placesCount: listData.places?.length || 0
        });
      });
      
      // Ortak listeleri formatla
      const formattedCollaborativeLists = collaborativeLists.map(list => ({
        ...list,
        placesCount: list.places?.length || 0
      }));
      
      // Tüm listeleri birleştir
      const allLists = [...ownLists, ...formattedCollaborativeLists];
      
      console.log(' [ProfileScreen] All user lists loaded:', allLists.length, '(Own:', ownLists.length, ', Collaborative:', formattedCollaborativeLists.length, ')');
      return allLists;
      
    } catch (error) {
      console.error(' [ProfileScreen] Error loading lists:', error);
      return [];
    }
  };

  // Liste filtreleme fonksiyonu
  const getFilteredLists = () => {
    // Önce null/undefined listelerini filtrele
    const validLists = userLists.filter(list => list && list.id && list.name);
    
    if (selectedListFilter === 'all') {
      return validLists;
    }
    
    return validLists.filter(list => {
      switch (selectedListFilter) {
        case 'public':
          return !list.isPrivate && list.privacy !== 'private';
        case 'private':
          return list.isPrivate || list.privacy === 'private';
        case 'collaborative':
          return list.isCollaborative;
        default:
          return true;
      }
    });
  };

  const loadUserListsForPreview = async () => {
    try {
      console.log(' [ProfileScreen] Starting loadUserListsForPreview...');
      const lists = await loadUserLists();
      console.log(' [ProfileScreen] Loaded lists for display:', lists.length, lists);
      setUserLists(lists); // Show all lists, not just 4
      console.log(' [ProfileScreen] userLists state updated with', lists.length, 'lists');
    } catch (error) {
      console.error(' [ProfileScreen] Error loading lists for preview:', error);
      setUserLists([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadUserStats(), loadUserListsForPreview(), loadUserPlaces()]);
    // Force refresh using hook
    realtimeSync.forceRefresh();
    setRefreshing(false);
  };

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        console.log(' [ProfileScreen] Loading user data for:', user.email);
        
        // Try to get cached data first
        const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
        if (cachedData) {
          console.log(' [ProfileScreen] Using cached user data');
          setUserData(JSON.parse(cachedData));
        }
        
        try {
          // Try to get fresh data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const freshData = userDoc.data();
            console.log(' [ProfileScreen] Fresh user data loaded from Firestore');
            setUserData(freshData);
            
            // Update global state
            await GlobalStateService.updateUserData(freshData);
            
            // Cache the fresh data
            await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(freshData));
          }
        } catch (firestoreError) {
          console.warn(' [ProfileScreen] Firestore offline, using cached data:', firestoreError.message);
          if (!cachedData) {
            // If no cached data and Firestore fails, show basic user info from Firebase Auth
            setUserData({
              email: user.email,
              firstName: user.displayName?.split(' ')[0] || 'Kullanıcı',
              lastName: user.displayName?.split(' ')[1] || '',
              username: user.email.split('@')[0],
              avatar: ''
            });
          }
        }
      }
    } catch (error) {
      console.error(' [ProfileScreen] Error loading user data:', error);
      
      // Check if it's a Firebase offline error
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        setIsOffline(true);
        setError('İnternet bağlantısı yok. Bazı özellikler kullanılamayabilir.');
      } else {
        setError('Kullanıcı bilgileri yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const retryLoading = () => {
    setError(null);
    setIsOffline(false);
    setLoading(true);
    loadUserData();
    loadUserStats();
  };

  const openEditModal = (type, currentValue) => {
    if (type === 'avatar') {
      setAvatarModalVisible(true);
      return;
    }
    setEditType(type);
    setEditValue(currentValue || '');
    setEditModalVisible(true);
    
    // Reset username validation when opening username edit
    if (type === 'username') {
      setUsernameValidation({
        isValid: true,
        isChecking: false,
        error: '',
        isAvailable: null
      });
    }
  };

  // Real-time username validation
  useEffect(() => {
    if (editType === 'username' && editValue) {
      const checkUsername = async () => {
        const trimmedValue = editValue.trim().toLowerCase();
        
        // Minimum length check
        if (trimmedValue.length < 3) {
          setUsernameValidation({
            isValid: false,
            isChecking: false,
            error: 'Kullanıcı adı en az 3 karakter olmalı',
            isAvailable: null
          });
          return;
        }

        // Check if it's the same as current username
        if (trimmedValue === (userData?.username || '').toLowerCase()) {
          setUsernameValidation({
            isValid: true,
            isChecking: false,
            error: '',
            isAvailable: true
          });
          return;
        }

        // Check availability
        setUsernameValidation(prev => ({ ...prev, isChecking: true }));
        try {
          const result = await AuthService.checkUsernameAvailability(trimmedValue);
          setUsernameValidation({
            isValid: result.valid,
            isChecking: false,
            error: result.error || '',
            isAvailable: result.available
          });
        } catch (error) {
          console.error('Username check error:', error);
          setUsernameValidation({
            isValid: false,
            isChecking: false,
            error: 'Kullanıcı adı kontrol edilemedi',
            isAvailable: null
          });
        }
      };

      // Debounce the check
      const timeoutId = setTimeout(checkUsername, 500);
      return () => clearTimeout(timeoutId);
    } else if (editType === 'username' && !editValue) {
      // Reset validation when input is empty
      setUsernameValidation({
        isValid: true,
        isChecking: false,
        error: '',
        isAvailable: null
      });
    }
  }, [editValue, editType, userData?.username]);

  const selectAvatar = async (avatar) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), { avatar });
      
      // Update local state
      setUserData(prev => ({ ...prev, avatar }));
      
      // Update cache
      const updatedData = { ...userData, avatar };
      await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(updatedData));
      
      setAvatarModalVisible(false);
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
      
    } catch (error) {
      console.error(' [ProfileScreen] Error updating avatar:', error);
      Alert.alert('Hata', 'Profil fotoğrafı güncellenirken bir hata oluştu');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Hata', 'Oturum açmanız gerekiyor');
        return;
      }

      // Use the new automatic upload function
      const result = await pickImageFromLibraryAndUpload('avatars', user.uid);
      
      if (!result.cancelled && result.downloadURL) {
        await selectAvatar(result.downloadURL);
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi');
      }
      
    } catch (error) {
      console.error(' [ProfileScreen] Error picking and uploading image:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu: ' + error.message);
    }
  };

  // Cache'ten Firebase'e migration fonksiyonu
  const migrateImageToFirebase = async (list) => {
    try {
      console.log(' [ProfileScreen] Migrating image for list:', list.name);
      
      if (!StorageService.isCacheFile(list.image)) {
        console.log(' [ProfileScreen] Image is already a valid URL, skipping:', list.image);
        return list.image; // Zaten Firebase URL
      }

      // Firebase Storage'a yükle
      console.log(' [ProfileScreen] Uploading cache file to Firebase...');
      const firebaseURL = await StorageService.uploadListCoverImage(list.image, list.id);
      
      // Firestore'da güncelle
      const listRef = doc(db, 'lists', list.id);
      await updateDoc(listRef, {
        image: firebaseURL,
        updatedAt: new Date()
      });

      console.log(' [ProfileScreen] Migration completed for:', list.name);
      return firebaseURL;
      
    } catch (error) {
      console.error(' [ProfileScreen] Migration failed for list:', list.name, error);
      throw error;
    }
  };

  // Liste İşlem Fonksiyonları
  const handleShareList = async (list) => {
    try {
      console.log(' [ProfileScreen] Sharing list:', list.name);
      const shareMessage = `${list.name} listemi kontrol edin!\n\n${list.placesCount} harika mekan keşfedin.\n\nSoRita uygulaması ile paylaşıldı.`;
      
      await Share.share({
        message: shareMessage,
        title: `${list.name} - SoRita`
      });
    } catch (error) {
      console.error(' [ProfileScreen] Share failed:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu');
    }
  };

  const handleEditList = (list) => {
    console.log(' [ProfileScreen] Opening edit list info modal for list:', list.name);
    console.log(' [ProfileScreen] List object:', list);
    console.log(' [ProfileScreen] Setting editingListInfo and opening modal...');
    setEditingListInfo(list);
    setEditListInfoModalVisible(true);
    console.log(' [ProfileScreen] Modal state should now be true');
  };

  const handleListUpdated = async (updatedList, isDeleted = false) => {
    if (isDeleted) {
      // Liste silindi
      const updatedLists = userLists.filter(l => l.id !== updatedList?.id);
      setUserLists(updatedLists);
      
      // Update global state
      await GlobalStateService.updateUserLists(updatedLists);
      await GlobalStateService.updateUserStats(stats);
    } else {
      // Liste güncellendi
      const updatedLists = userLists.map(list => 
        list.id === updatedList.id ? updatedList : list
      );
      setUserLists(updatedLists);
      
      // Update global state
      await GlobalStateService.updateUserLists(updatedLists);
    }
  };

  const handleViewList = (list) => {
    console.log(' [ProfileScreen] Opening list view modal for list:', list.name);
    console.log(' [ProfileScreen] List object:', list);
    setEditingList(list);
    setEditMapModalVisible(true);
  };

  const handleDeleteList = (list) => {
    Alert.alert(
      'Liste Sil',
      `"${list.name}" listesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve listedeki tüm mekanlar silinecektir.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => confirmDeleteList(list)
        }
      ]
    );
  };

  const confirmDeleteList = async (list) => {
    try {
      console.log(' [ProfileScreen] Deleting list:', list.id);
      setLoading(true);

      // Firebase'den sil
      const listRef = doc(db, 'lists', list.id);
      await deleteDoc(listRef);

      // Local state'den çıkar
      setUserLists(prev => prev.filter(l => l.id !== list.id));
      console.log(' [ProfileScreen] List deleted successfully');
      Alert.alert('Başarılı', `"${list.name}" listesi silindi`);
      
    } catch (error) {
      console.error(' [ProfileScreen] Delete failed:', error);
      Alert.alert('Hata', 'Liste silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editValue.trim()) {
      Alert.alert('Hata', 'Bu alan boş bırakılamaz');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const updateData = {};
      
      switch (editType) {
        case 'avatar':
          updateData.avatar = editValue;
          break;
        case 'firstName':
          updateData.firstName = editValue;
          break;
        case 'lastName':
          updateData.lastName = editValue;
          break;
        case 'username':
          // Validate username before saving
          if (!usernameValidation.isValid || !usernameValidation.isAvailable) {
            Alert.alert('Hata', usernameValidation.error || 'Geçersiz kullanıcı adı');
            return;
          }
          
          // Double-check availability (in case it changed)
          const usernameQuery = query(
            collection(db, 'users'),
            where('username', '==', editValue.trim().toLowerCase())
          );
          const existingUsers = await getDocs(usernameQuery);
          
          if (existingUsers.size > 0 && existingUsers.docs[0].id !== user.uid) {
            Alert.alert('Hata', 'Bu kullanıcı adı zaten kullanılıyor');
            setUsernameValidation({
              isValid: false,
              isChecking: false,
              error: 'Bu kullanıcı adı zaten kullanılıyor',
              isAvailable: false
            });
            return;
          }
          updateData.username = editValue.trim().toLowerCase();
          break;
        case 'bio':
          updateData.bio = editValue;
          break;
      }

      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      // Update local state
      const updatedUserData = { ...userData, ...updateData };
      setUserData(updatedUserData);
      
      // Update global state
      await GlobalStateService.updateUserData(updatedUserData);
      
      // Update cache
      await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(updatedUserData));
      
      setEditModalVisible(false);
      Alert.alert('Başarılı', 'Profil güncellendi');
      
    } catch (error) {
      console.error(' [ProfileScreen] Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    }
  };

  // Handle place editing - simplified with sync hook
  const handleEditPlace = async (updatedPlace) => {
    try {
      console.log(' [ProfileScreen] Editing place:', updatedPlace.name);
      
      if (!updatedPlace.listId) {
        Alert.alert('Hata', 'Bu mekanın liste bilgisi bulunamadı.');
        return;
      }

      // Update the place in the corresponding list
      const listRef = doc(db, 'lists', updatedPlace.listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        Alert.alert('Hata', 'Liste bulunamadı.');
        return;
      }

      const listData = listDoc.data();
      const places = listData.places || [];
      
      // Find and update the place
      const updatedPlaces = places.map(place => {
        if (place.id === updatedPlace.id || 
            (place.name === updatedPlace.name && place.address === updatedPlace.address)) {
          return {
            ...place,
            userContent: {
              ...place.userContent,
              note: updatedPlace.note || '',
              rating: updatedPlace.rating || 0,
              photos: updatedPlace.photos || []
            },
            // Also update top-level properties for backward compatibility
            note: updatedPlace.note || '',
            rating: updatedPlace.rating || 0,
            photos: updatedPlace.photos || []
          };
        }
        return place;
      });

      // Update the list in Firestore
      await updateDoc(listRef, {
        places: updatedPlaces,
        updatedAt: serverTimestamp()
      });

      // Use hook to update global state
      await placeCardSync.updatePlace(updatedPlace);

      console.log(' [ProfileScreen] Place updated successfully');
      Alert.alert('Başarılı', 'Mekan bilgileri güncellendi');
      
    } catch (error) {
      console.error(' [ProfileScreen] Error updating place:', error);
      Alert.alert('Hata', 'Mekan güncellenirken bir hata oluştu');
    }
  };

  // Handle place deletion - simplified with sync hook
  const handleDeletePlace = async (place) => {
    try {
      console.log(' [ProfileScreen] Deleting place:', place.name);
      
      Alert.alert(
        'Mekanı Sil',
        `"${place.name}" mekanını listeden silmek istediğinizden emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Sil', 
            style: 'destructive',
            onPress: async () => {
              try {
                if (!place.listId) {
                  Alert.alert('Hata', 'Bu mekanın liste bilgisi bulunamadı.');
                  return;
                }

                // Remove place from the list using the service
                const { ListsDataService } = await import('../services/listsDataService');
                await ListsDataService.removePlaceFromList(place.listId, place.id);

                // Use hook to update global state
                await placeCardSync.deletePlace(place);

                console.log(' [ProfileScreen] Place deleted successfully');
                Alert.alert('Başarılı', `"${place.name}" mekanı listeden silindi`);
                
              } catch (error) {
                console.error(' [ProfileScreen] Error deleting place:', error);
                Alert.alert('Hata', 'Mekan silinirken bir hata oluştu');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error(' [ProfileScreen] Error in delete handler:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  const showStatsList = async (type) => {
    const user = auth.currentUser;
    if (!user) return;
    
    setListLoading(true);
    setListData([]);
    setSearchQuery('');
    
    let modalType = '';
    switch (type) {
      case 'Takipçiler':
        modalType = 'followers';
        break;
      case 'Takip Edilenler':
        modalType = 'following';
        break;
      case 'Gönderiler':
        modalType = 'posts';
        break;
      case 'Listeler':
        modalType = 'lists';
        break;
    }
    
    setListModalType(modalType);
    setListModalVisible(true);
    
    try {
      await loadListData(modalType, user.uid);
    } catch (error) {
      console.error(' [ProfileScreen] Error loading list data:', {
        type: modalType,
        userId: user.uid,
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

  const loadListData = async (type, userId) => {
    console.log(` [ProfileScreen] Loading ${type} for user:`, userId);
    
    try {
      let data = [];
      
      switch (type) {
        case 'followers':
          // Get followers
          const followersQuery = query(
            collection(db, 'follows'),
            where('followedUserId', '==', userId)
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
            where('followerId', '==', userId)
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
            where('userId', '==', userId)
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
          console.log(' [ProfileScreen] Loading lists for user:', userId);
          const listsQuery = query(
            collection(db, 'lists'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          );
          console.log(' [ProfileScreen] Executing lists query...');
          const listsSnap = await getDocs(listsQuery);
          console.log(' [ProfileScreen] Lists query result - count:', listsSnap.size);
          
          data = listsSnap.docs.map(doc => {
            const listData = doc.data();
            console.log(' [ProfileScreen] Processing list doc:', doc.id, listData.title);
            return {
              id: doc.id,
              ...listData,
              type: 'list',
              placesCount: listData.places?.length || 0
            };
          });
          
          console.log(' [ProfileScreen] Final processed lists data:', data);
          break;
      }
      
      console.log(` [ProfileScreen] Loaded ${data.length} ${type}`, data);
      setListData(data);
      
      // Update stats to match actual list count (ensure non-negative)
      let statsKey = type;
      if (type === 'lists') statsKey = 'lists';
      else if (type === 'posts') statsKey = 'posts';
      else if (type === 'followers') statsKey = 'followers';
      else if (type === 'following') statsKey = 'following';
      
      console.log(` [ProfileScreen] Updating stats - ${statsKey}: ${data.length}`);
      setStats(prev => ({
        ...prev,
        [statsKey]: Math.max(0, data.length)
      }));
    } catch (error) {
      console.error(' [ProfileScreen] Error loading list data:', {
        type,
        userId,
        code: error.code,
        message: error.message
      });
      throw error;
    }
  };

  const getFilteredData = () => {
    if (!searchQuery.trim()) return listData;
    
    return listData.filter(item => {
      const query = searchQuery.toLowerCase();
      
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
              console.log(' [ProfileScreen] Liste kartına tıklandı:', item.name);
              // Modal'ı kapat ve liste detaylarını göster
              setListModalVisible(false);
              setTimeout(() => {
                handleViewList(item);
              }, 100);
            }}
            showPrivacyIcon={true}
            showArrow={false}
            showDates={true}
            style={styles.listItem}
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

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumu kapatmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(' [ProfileScreen] User initiated logout');
              await AuthService.logout();
              console.log(' [ProfileScreen] Logout successful');
              
              // Clear component state immediately
              setUserData(null);
              setUserLists([]);
              setUserPlaces([]);
              
              // Force navigation to Welcome screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error(' [ProfileScreen] Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz! Hesabınız ve tüm verileriniz kalıcı olarak silinecek.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Son Onay',
              'Hesabınızı silmek için "SİL" yazın:',
              [
                {
                  text: 'İptal',
                  style: 'cancel'
                },
                {
                  text: 'Devam Et',
                  style: 'destructive',
                  onPress: confirmDeleteAccount
                }
              ]
            );
          }
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Firestore'dan kullanıcı verisini sil
        await deleteDoc(doc(db, 'users', user.uid));
        
        // Firebase Auth'dan kullanıcıyı sil
        await user.delete();
        
        Alert.alert(
          'Hesap Silindi',
          'Hesabınız başarıyla silindi.',
          [
            {
              text: 'Tamam',
              onPress: () => console.log('Account deleted successfully')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Hata', 'Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>Profil bilgileri bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <EdgeToEdgeScreen style={styles.container} edges={['top', 'left', 'right']}>
      <AppStatusBar />
      {/* Header */}
      <View style={styles.headerContainer}>
          <SoRitaHeader 
            rightIcon="settings"
            onRightPress={() => setMenuVisible(true)}
          />
          <View style={styles.profileHeaderActions}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity 
                  onPress={() => setMenuVisible(true)}
                  style={styles.menuButton}
                >
                  <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              }
            >
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
              title="Çıkış Yap"
              leadingIcon="logout"
            />
            <Menu.Item 
              onPress={() => {
                setMenuVisible(false);
                handleDeleteAccount();
              }}
              title="Hesabı Sil"
              leadingIcon="delete"
            />
          </Menu>
          </View>
        </View>

        {/* Offline/Error Notification */}
        {(error || isOffline) && (
          <View style={styles.errorBanner}>
            <MaterialIcons 
              name={isOffline ? "wifi-off" : "error-outline"} 
              size={20} 
              color={colors.white} 
            />
            <Text style={styles.errorBannerText}>{error}</Text>
            {isOffline && (
              <TouchableOpacity onPress={retryLoading} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
          {/* Profile Info Section */}
          <View style={styles.profileSection}>
            {/* Avatar with Edit */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity 
                  style={styles.avatarCircle}
                  onPress={() => {
                    if (userData.avatar && (userData.avatar.startsWith('data:image') || userData.avatar.startsWith('http'))) {
                      setCurrentImageUri(userData.avatar);
                      setShowImageModal(true);
                    }
                  }}
                >
                  {userData.avatar && (userData.avatar.startsWith('data:image') || 
                    (userData.avatar.startsWith('http://') || userData.avatar.startsWith('https://')) && userData.avatar.length > 10) ? (
                    <Image 
                      source={{ uri: userData.avatar }} 
                      style={styles.avatarImage}
                      resizeMode="cover"
                      onError={() => {
                        // If image fails to load, fall back to emoji
                        console.log('Avatar image failed to load');
                      }}
                    />
                  ) : (
                    <Text style={styles.avatar}>{userData.avatar && !userData.avatar.startsWith('http') ? userData.avatar : ''}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => openEditModal('avatar', userData.avatar)}
                >
                  <MaterialIcons name="edit" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Name - Display Only Style */}
            <View style={styles.nameContainer}>
              <TouchableOpacity onPress={() => openEditModal('firstName', userData.firstName)}>
                <View style={styles.editableField}>
                  <Text style={styles.displayName}>{userData.firstName} {userData.lastName}</Text>
                  <MaterialIcons name="edit" size={16} color={colors.textSecondary} style={styles.editIcon} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Username with Edit */}
            <TouchableOpacity onPress={() => openEditModal('username', userData.username)}>
              <View style={styles.editableField}>
                <Text style={styles.username}>@{userData.username}</Text>
                <MaterialIcons name="edit" size={16} color={colors.textSecondary} style={styles.editIcon} />
              </View>
            </TouchableOpacity>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statButton} onPress={() => showStatsList('Takipçiler')}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statButton} onPress={() => showStatsList('Takip Edilenler')}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>Takip</Text>
              </TouchableOpacity>
            </View>

            {/* Bio with Edit */}
            <TouchableOpacity onPress={() => openEditModal('bio', userData.bio)}>
              <View style={styles.bioContainer}>
                <View style={styles.editableField}>
                  {userData.bio ? (
                    <Text style={styles.bio}>{userData.bio}</Text>
                  ) : (
                    <Text style={styles.noBio}>Biyografi ekle...</Text>
                  )}
                  <MaterialIcons name="edit" size={16} color={colors.textSecondary} style={styles.editIcon} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Lists/Places Tab Section */}
            <View style={styles.contentSection}>
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
                  {getFilteredLists().length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="list" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>Henüz liste yok</Text>
                    <Text style={styles.emptySubtitle}>
                      {selectedListFilter === 'all' 
                        ? 'Yeni listeler oluşturduğunuzda burada görünecek.'
                        : `${listFilterOptions.find(opt => opt.key === selectedListFilter)?.description} bulunamadı.`
                      }
                    </Text>
                  </View>
                ) : (
                  <View style={styles.listsContainer}>
                    {getFilteredLists().map((list, index) => {
                      return (
                        <ListCard
                          key={list.id || index}
                          list={list}
                          onPress={() => handleViewList(list)} // Liste detaylarını göster
                          showPrivacyIcon={true}
                          showArrow={false}
                          showDates={true}
                          showActions={true}
                          showUserInfo={false} // Kendi profilinde kullanıcı bilgisi gereksiz
                          onShare={handleShareList}
                          onEdit={handleEditList}
                          onDelete={handleDeleteList}
                        />
                      );
                    })}
                  </View>
                )}
                </View>
              ) : (
                // Places Content
                placesLoading ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="location-on" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>Mekanlar yükleniyor...</Text>
                  </View>
                ) : userPlaces.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="location-on" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>Henüz mekan yok</Text>
                    <Text style={styles.emptySubtitle}>
                      Listelerinize mekan eklediğinizde burada görünecek.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.placesContainer}>
                    {userPlaces.map((place, index) => {
                      console.log(' [ProfileScreen] Place object:', index, place);
                      return (
                      <PlaceCard
                        key={`${place.listId || 'no-list'}_${place.id || `place_${index}`}`}
                        place={place}
                        refreshTrigger={realtimeSync.refreshTrigger}
                        onFocus={() => {
                          // Navigate to map with place focus
                          navigation.navigate('MapScreen', {
                            focusedPlace: place,
                            cameFromProfile: true
                          });
                        }}
                        showFocusButton={true}
                        showMap={true}
                        isEvent={false}
                        onEdit={handleEditPlace}
                        onDelete={handleDeletePlace}
                        onViewList={(place) => {
                          // Navigate to the list that contains this place
                          if (place.listId && place.listName) {
                            // Find the list in userLists and navigate to it
                            const targetList = userLists.find(list => list.id === place.listId);
                            if (targetList) {
                              // Open the ViewListModal for this list
                              setSelectedListForView(targetList);
                              setViewListModalVisible(true);
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
        </ScrollView>

        {/* Edit Modal */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editType === 'avatar' ? 'Avatar Düzenle' : 
                 editType === 'firstName' ? 'Ad Düzenle' :
                 editType === 'lastName' ? 'Soyad Düzenle' :
                 editType === 'username' ? 'Kullanıcı Adı Düzenle' : 'Biyografi Düzenle'}
              </Text>
              
              <TextInput
                style={[
                  styles.modalInput,
                  editType === 'username' && !usernameValidation.isValid && styles.modalInputError
                ]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={editType === 'avatar' ? 'Emoji girin (örn: )' : 
                           editType === 'bio' ? 'Biyografinizi yazın...' : 'Yazın...'}
                multiline={editType === 'bio'}
                numberOfLines={editType === 'bio' ? 4 : 1}
                maxLength={editType === 'bio' ? 150 : 50}
              />
              
              {/* Username validation feedback */}
              {editType === 'username' && editValue && (
                <View style={styles.validationContainer}>
                  {usernameValidation.isChecking && (
                    <View style={styles.validationRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.validationText}>Kontrol ediliyor...</Text>
                    </View>
                  )}
                  {!usernameValidation.isChecking && usernameValidation.error && (
                    <View style={styles.validationRow}>
                      <MaterialIcons name="error-outline" size={16} color={colors.error} />
                      <Text style={[styles.validationText, styles.validationError]}>
                        {usernameValidation.error}
                      </Text>
                    </View>
                  )}
                  {!usernameValidation.isChecking && usernameValidation.isAvailable && !usernameValidation.error && (
                    <View style={styles.validationRow}>
                      <MaterialIcons name="check-circle" size={16} color={colors.success} />
                      <Text style={[styles.validationText, styles.validationSuccess]}>
                        Bu kullanıcı adı kullanılabilir
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.cancelButton}
                >
                  İptal
                </Button>
                <Button
                  mode="contained"
                  onPress={saveEdit}
                  style={styles.saveButton}
                >
                  Kaydet
                </Button>
              </View>
            </View>
          </View>
        </Modal>

        {/* Avatar Selection Modal */}
        <Modal
          visible={avatarModalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.avatarModalContent]}>
              <Text style={styles.modalTitle}>Profil Fotoğrafı Seç</Text>
              
              {/* Action Buttons */}
              <View style={styles.avatarActionButtons}>
                <TouchableOpacity 
                  style={styles.avatarActionButton} 
                  onPress={pickImageFromGallery}
                >
                  <MaterialIcons name="photo-library" size={30} color={colors.primary} />
                  <Text style={styles.avatarActionText}>Galeri</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.avatarActionButton}
                  onPress={() => {/* Show emoji grid */}}
                >
                  <MaterialIcons name="emoji-emotions" size={30} color={colors.primary} />
                  <Text style={styles.avatarActionText}>Avatar</Text>
                </TouchableOpacity>
              </View>
              
              {/* Emoji Grid */}
              <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
                <View style={styles.emojiContainer}>
                  {DEFAULT_AVATARS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emojiButton,
                        userData?.avatar === emoji && styles.selectedEmoji
                      ]}
                      onPress={() => selectAvatar(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setAvatarModalVisible(false)}
                  style={styles.cancelButton}
                >
                  İptal
                </Button>
              </View>
            </View>
          </View>
        </Modal>

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
                    {searchQuery.trim() ? 'Arama sonucu bulunamadı' : `Henüz ${getModalTitle().toLowerCase()} yok`}
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
        
        {/* Edit Map Modal */}
        <EditMapModal
          visible={editMapModalVisible}
          onClose={() => {
            setEditMapModalVisible(false);
            setEditingList(null);
          }}
          listData={editingList}
        />

        {/* Edit List Info Modal */}
        <EditListInfoModal
          visible={editListInfoModalVisible}
          onClose={() => {
            setEditListInfoModalVisible(false);
            setEditingListInfo(null);
          }}
          listData={editingListInfo}
          onListUpdated={handleListUpdated}
        />

        {/* View List Modal */}
        <ViewListModal
          visible={viewListModalVisible}
          onClose={() => {
            setViewListModalVisible(false);
            setSelectedListForView(null);
          }}
          listData={selectedListForView}
          navigation={navigation}
        />
        
        {/* Image Modal */}
        <ImageModal
          visible={showImageModal}
          imageUri={currentImageUri}
          onClose={() => setShowImageModal(false)}
          title="Profil Fotoğrafı"
        />
      </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0, // StatusBar için yer
  },
  headerContainer: {
    position: 'relative',
  },
  profileHeaderActions: {
    position: 'absolute',
    right: 20,
    top: 15,
    zIndex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  menuButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    marginBottom: 15,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatar: {
    fontSize: 48,
    color: '#333333',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    marginBottom: 20,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginVertical: 5,
  },
  editIcon: {
    marginLeft: 8,
  },
  firstName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  lastName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: 20,
    minHeight: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  // Avatar Modal Styles
  avatarModalContent: {
    maxHeight: '80%',
  },
  avatarActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  avatarActionButton: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: colors.background,
    minWidth: 100,
  },
  avatarActionText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emojiGrid: {
    maxHeight: 300,
    marginBottom: 20,
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  emojiButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    margin: 2,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedEmoji: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 24,
    color: '#333333',
    textAlign: 'center',
  },

  // Content Section Styles
  contentSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'left',
    marginLeft: 0,
    paddingLeft: 0,
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
  // New list styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  listsPreview: {
    marginTop: 8,
  },
  listsPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listsPreviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listsPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  listsPreviewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // List item styles
  listImageContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  listItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  listItemIcon: {
    width: 50,
    height: 50,
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemPlaces: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.lightBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  listItemPrivacy: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Error Banner Styles
  errorBanner: {
    backgroundColor: colors.error || '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.white,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  // Lists Container Styles
  listsContainer: {
    marginTop: 8,
    paddingHorizontal: 0,
    width: '100%',
    flex: 1,
  },
  // Places Container Styles
  placesContainer: {
    marginTop: 8,
    paddingHorizontal: 0,
    width: '100%',
    flex: 1,
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
  validationContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  validationError: {
    color: colors.error,
  },
  validationSuccess: {
    color: colors.success,
  },
  modalInputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
});
