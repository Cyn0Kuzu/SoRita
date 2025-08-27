import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Text,
  Dimensions,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Share,
  Image,
  RefreshControl
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { placesService } from '../services/placesService';
import SoRitaHeader from '../components/SoRitaHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { pickImageFromLibraryAndUpload } from '../utils/imagePicker';
import { auth, db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ListCard } from '../components/CommonComponents';
import StorageService from '../services/storageService';
import { sendListInvitationPushNotification } from '../services/pushNotificationService';
import { sendInviteNotification } from '../services/notificationService';
import { generateColorAssignments } from '../utils/collaboratorColors';
import CollaborativeListService from '../services/collaborativeListService';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import GlobalStateService from '../services/globalStateService';

// Türkiye İlleri
const turkishProvinces = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya',
  'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın',
  'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır',
  'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman',
  'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir',
  'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin',
  'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa',
  'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van',
  'Yalova', 'Yozgat', 'Zonguldak'
];

const { height } = Dimensions.get('window');

const MapScreen = ({ navigation, route }) => {
  const { 
    listId, 
    listData, 
    showListDetail, 
    editMode, 
    showEditPanel,
    selectedPlace4List: routeSelectedPlace,
    showAddToListModal: routeShowAddToListModal,
    fromViewList
  } = route.params || {};
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(editMode || false);
  const [editingList, setEditingList] = useState(listData || null);
  const [showEditBottomPanel, setShowEditBottomPanel] = useState(showEditPanel || false);
  const [editListPlaces, setEditListPlaces] = useState([]);
  
  // ViewList modal navigation state
  const [cameFromViewList, setCameFromViewList] = useState(false);

  // Update states when route params change
  useEffect(() => {
    console.log('🔄 [MapScreen] Route params changed, updating states:', {
      editMode,
      showEditPanel,
      listDataName: listData?.name,
      fromViewList,
      hasRouteSelectedPlace: !!routeSelectedPlace,
      routeShowAddToListModal
    });
    
    setIsEditMode(editMode || false);
    setEditingList(listData || null);
    setShowEditBottomPanel(showEditPanel || false);
    
    // Handle place from ViewListModal
    if (fromViewList && routeSelectedPlace) {
      console.log('⭐ [MapScreen] Handling place from ViewListModal:', routeSelectedPlace.name);
      setCameFromViewList(true); // Save that we came from ViewList
      setSelectedPlace4List(routeSelectedPlace);
      setShowAddToListModal(true);
      
      // Clear the route parameters to prevent re-triggering
      navigation.setParams({
        selectedPlace4List: undefined,
        showAddToListModal: undefined,
        fromViewList: undefined
      });
    }
  }, [editMode, showEditPanel, listData, fromViewList, routeSelectedPlace, routeShowAddToListModal]);
  
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [places, setPlaces] = useState([]);
  
  // Map interaction states
  const [tappedLocation, setTappedLocation] = useState(null);
  const [tappedPlaceInfo, setTappedPlaceInfo] = useState(null);
  const [loadingPlaceInfo, setLoadingPlaceInfo] = useState(false);
  
  // Search UI states
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // List management states
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListPrivacy, setNewListPrivacy] = useState('public'); // 'public', 'private', 'collaborative'
  const [isCollaborativePrivate, setIsCollaborativePrivate] = useState(false); // For collaborative lists: true = private, false = public
  const [newListImage, setNewListImage] = useState(null);
  const [newListImageType, setNewListImageType] = useState('photo'); // 'emoji' or 'photo'
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorQuery, setCollaboratorQuery] = useState('');
  const [followers, setFollowers] = useState([]); // Takipçi listesi
  const [filteredFollowers, setFilteredFollowers] = useState([]); // Filtrelenmiş takipçiler
  const [selectedCollaborators, setSelectedCollaborators] = useState([]); // Seçilen işbirlikçiler
  const [loadingFollowers, setLoadingFollowers] = useState(false); // Takipçi yükleme durumu
  const [selectedPlace4List, setSelectedPlace4List] = useState(null);
  
  // Place details for adding to list - NEW
  const [placeNote, setPlaceNote] = useState('');
  const [placeRating, setPlaceRating] = useState(0);
  const [placePhotos, setPlacePhotos] = useState([]);
  
  // Photo preview modal states
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  
  // List detail states
  const [currentListDetail, setCurrentListDetail] = useState(null);
  const [showListDetailModal, setShowListDetailModal] = useState(false);

  // Global state synchronization
  const { userData, userLists, userPlaces, forceRefresh } = useRealtimeSync();

  // Local states for "Add to List" modal
  const [modalUserLists, setModalUserLists] = useState([]);
  const [refreshingLists, setRefreshingLists] = useState(false);
  const [listFilter, setListFilter] = useState('Tümü'); // 'Tümü', 'Herkese Açık', 'Ortak', 'Özel'

  console.log('🗺️ [MapScreen] Current state:', {
    hasLocation: !!location,
    hasError: !!errorMsg,
    mapReady,
    searchQuery,
    resultsCount: searchResults.length,
    placesCount: places.length,
    isEditMode,
    hasEditingList: !!editingList,
    showEditBottomPanel,
    editListPlacesCount: editListPlaces.length
  });

  console.log('🔍 [MapScreen] Modal states:', {
    showAddToListModal,
    showCreateListModal,
    showSearchModal,
    selectedPlace4List: !!selectedPlace4List,
    tappedPlaceInfo: !!tappedPlaceInfo,
    userListsCount: userLists.length,
    cameFromViewList
  });

  useEffect(() => {
    let isMounted = true;
    
    const setDefaultLocation = () => {
      console.log('🏙️ [Location] Using Turkey center...');
      const defaultCoords = {
        latitude: 39.9334,
        longitude: 32.8597,
        latitudeDelta: 10.0,
        longitudeDelta: 10.0,
      };
      setLocation(defaultCoords);
      console.log('🗺️ [MapScreen] Default location set, should render map now');
    };
    
    const getLocationPermission = async () => {
      try {
        console.log('📍 [Location] Requesting permissions...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Konum erişimi gerekli');
            setDefaultLocation();
          }
          return;
        }

        console.log('📍 [Location] Getting current position...');
        
        // Add timeout for location request with proper error handling
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(error => {
          console.log('📍 [Location] getCurrentPosition failed:', error.message);
          throw error;
        });
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), 10000)
        );
        
        try {
          const locationResult = await Promise.race([locationPromise, timeoutPromise]);

          if (isMounted && locationResult) {
            const coords = {
              latitude: locationResult.coords.latitude,
              longitude: locationResult.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            
            console.log('✅ [Location] Location set:', coords.latitude, coords.longitude);
            setLocation(coords);
            console.log('🗺️ [MapScreen] Location state updated, should render map now');
          }
        } catch (locationError) {
          console.log('⚠️ [Location] Location error, using default:', locationError.message);
          if (isMounted) {
            setDefaultLocation();
          }
        }
        
      } catch (error) {
        console.log('⚠️ [Location] Permission error, using default location:', error.message);
        if (isMounted) {
          setDefaultLocation();
        }
      }
    };

    getLocationPermission();
    loadUserLists();

    return () => {
      isMounted = false;
    };
  }, []);

  // Liste verisini güncel tutmak için listId değiştiğinde yeniden yükle
  useEffect(() => {
    const refreshListData = async () => {
      if (listId && currentListDetail) {
        try {
          // ColorAssignments'ı yenile
          await CollaborativeListService.refreshColorAssignments(listId);
          
          // Güncel liste verisini al
          const listRef = doc(db, 'lists', listId);
          const listDoc = await getDoc(listRef);
          if (listDoc.exists()) {
            const updatedListData = { id: listDoc.id, ...listDoc.data() };
            setCurrentListDetail(updatedListData);
            console.log('🔄 [MapScreen] Liste verisi güncellendi:', updatedListData['name'] || 'İsimsiz');
          }
        } catch (error) {
          console.error('❌ [MapScreen] Liste verisi güncellenirken hata:', error);
        }
      }
    };

    refreshListData();
  }, [listId]); // listId değiştiğinde yeniden yükle

  // Handle list detail from navigation
  useEffect(() => {
    if (showListDetail && listData) {
      setCurrentListDetail(listData);
      setShowListDetailModal(true);
      
      // Show list places on map
      if (listData.places && listData.places.length > 0) {
        setPlaces(listData.places);
        
        // Focus map on list places
        if (mapRef.current && listData.places.length > 0) {
          const coordinates = listData.places.map(place => ({
            latitude: place.latitude,
            longitude: place.longitude
          }));
          
          setTimeout(() => {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }, 1000);
        }
      }
    }
  }, [showListDetail, listData]);

  // Edit Mode useEffect
  useEffect(() => {
    console.log('🔍 [MapScreen] Edit useEffect triggered:', {
      isEditMode,
      hasEditingList: !!editingList,
      editingListName: editingList?.name,
      editingListPlaces: editingList?.places?.length || 0
    });
    
    if (isEditMode && editingList) {
      console.log('✏️ [MapScreen] Entering edit mode for list:', editingList.name);
      console.log('📋 [MapScreen] List places:', editingList.places);
      
      // Load list places for editing
      if (editingList.places && editingList.places.length > 0) {
        console.log('📍 [MapScreen] Setting edit places:', editingList.places.length);
        setEditListPlaces([...editingList.places]);
        setPlaces([...editingList.places]);
        
        // Focus map on list places
        if (mapRef.current) {
          const coordinates = editingList.places
            .map(place => {
              const latitude = place.coordinate?.latitude || place.latitude;
              const longitude = place.coordinate?.longitude || place.longitude;
              
              if (latitude && longitude) {
                return { latitude, longitude };
              }
              return null;
            })
            .filter(coord => coord !== null);
          
          console.log('🗺️ [MapScreen] Focusing map on coordinates:', coordinates.length);
          
          if (coordinates.length > 0) {
            setTimeout(() => {
              if (coordinates.length === 1) {
                mapRef.current.animateToRegion({
                  latitude: coordinates[0].latitude,
                  longitude: coordinates[0].longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 1000);
              } else if (coordinates.length > 1) {
                mapRef.current.fitToCoordinates(coordinates, {
                  edgePadding: { top: 50, right: 50, bottom: 150, left: 50 },
                  animated: true,
                });
              }
            }, 1000);
          }
        }
      } else {
        console.log('⚠️ [MapScreen] No places found in editing list');
        setEditListPlaces([]);
        setPlaces([]);
      }
      
      // Show edit panel
      console.log('📱 [MapScreen] Showing edit bottom panel');
      setShowEditBottomPanel(true);
    }
  }, [isEditMode, editingList]);

  // Load lists when "Add to List" modal opens
  useEffect(() => {
    if (showAddToListModal) {
      console.log('📋 [MapScreen] Modal opened, loading lists...');
      loadUserLists();
    }
  }, [showAddToListModal]);

  // Load user lists
  const loadUserLists = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('📋 [MapScreen] Loading all user lists (manual mode)');
      setRefreshingLists(true);
      
      const allLists = [];
      const seenListIds = new Set();
      
      // 1. Kendi listelerini al
      try {
        const ownListsQuery = query(
          collection(db, 'lists'),
          where('userId', '==', user.uid)
        );
        const ownListsSnap = await getDocs(ownListsQuery);
        console.log('✅ [MapScreen] Own lists found:', ownListsSnap.size);
        
        ownListsSnap.forEach((doc) => {
          const listData = { 
            id: doc.id, 
            ...doc.data(),
            isOwned: true
          };
          allLists.push(listData);
          seenListIds.add(doc.id);
        });
      } catch (error) {
        console.error('❌ [MapScreen] Error getting own lists:', error);
      }
      
      // 2. Collaborative listeleri al (sadece basit bir deneme)
      try {
        // Tüm listeleri al ve collaborators kontrolü yap
        const allListsQuery = query(collection(db, 'lists'));
        const allListsSnap = await getDocs(allListsQuery);
        console.log('🔍 [MapScreen] Checking all lists for collaborations:', allListsSnap.size);
        
        allListsSnap.forEach((doc) => {
          const listData = doc.data();
          // Eğer bu kullanıcı collaborators listesinde varsa ve daha önce eklenmemişse
          if (listData.collaborators && 
              listData.collaborators.includes(user.uid) && 
              !seenListIds.has(doc.id)) {
            const collaborativeListData = { 
              id: doc.id, 
              ...listData,
              isOwned: false,
              isCollaborative: true
            };
            allLists.push(collaborativeListData);
            seenListIds.add(doc.id);
          }
        });
      } catch (error) {
        console.warn('⚠️ [MapScreen] Error getting collaborative lists:', error);
      }
      
      console.log('📋 [MapScreen] Total lists loaded:', allLists.length);
      
      // Debug: Her liste için kategori bilgisi
      console.log('🔍 [MapScreen] Liste kategorileri analizi:');
      allLists.forEach((list, index) => {
        const currentUserId = auth.currentUser?.uid;
        const isCollaborative = (list.collaborators && list.collaborators.includes(currentUserId)) || 
                               list.isCollaborative === true;
        const isPrivate = list.isPrivate === true || list.privacy === 'private';
        
        let category = 'Herkese Açık';
        if (isCollaborative) {
          category = 'Ortak';
        } else if (isPrivate) {
          category = 'Özel';
        }
        
        console.log(`${index + 1}. "${list.name}" → ${category}`, {
          hasCollaborators: !!list.collaborators?.length,
          isUserInCollaborators: list.collaborators?.includes(currentUserId),
          isCollaborativeFlag: list.isCollaborative,
          isPrivate: isPrivate,
          privacy: list.privacy,
          finalCategory: category,
          collaboratorsArray: list.collaborators
        });
      });
      
      setModalUserLists(allLists);
      
    } catch (error) {
      console.error('❌ [MapScreen] Error loading user lists:', error);
      Alert.alert('Hata', 'Listeler yüklenirken bir hata oluştu');
    } finally {
      setRefreshingLists(false);
    }
  };

  // Liste kategorilerinin sayısını hesapla
  const getListCounts = () => {
    const total = modalUserLists.length;
    const currentUserId = auth.currentUser?.uid;
    
    let publicCount = 0;
    let collaborativeCount = 0;
    let privateCount = 0;
    
    modalUserLists.forEach(list => {
      // Collaborative kontrolü - hem collaborators array'i hem isCollaborative flag'i kontrol et
      const isCollaborative = (list.collaborators && list.collaborators.includes(currentUserId)) || 
                             list.isCollaborative === true;
      const isPrivate = list.isPrivate === true || list.privacy === 'private';
      
      // Öncelik sırası: Ortak > Özel > Herkese Açık (mutual exclusive)
      if (isCollaborative) {
        collaborativeCount++;
      } else if (isPrivate) {
        privateCount++;
      } else {
        publicCount++;
      }
    });
    
    console.log('📊 [MapScreen] Liste kategorileri:', {
      total,
      public: publicCount,
      collaborative: collaborativeCount,
      private: privateCount,
      toplam: publicCount + collaborativeCount + privateCount
    });
    
    return {
      total,
      public: publicCount,
      collaborative: collaborativeCount,
      private: privateCount
    };
  };

  // Search functionality
  const searchPlaces = async (query) => {
    if (!query.trim() || !location) return;
    
    try {
      console.log('🔍 [Search] Searching for:', query);
      setSearchLoading(true);
      
      const results = await placesService.searchPlacesByText(
        query + ' Turkey',
        location.latitude,
        location.longitude
      );
      
      // Filter to Turkey bounds
      const turkeyResults = results.filter(place => {
        const lat = place.geometry.location.lat;
        const lng = place.geometry.location.lng;
        return lat >= 35.8 && lat <= 42.2 && lng >= 25.6 && lng <= 44.8;
      });
      
      console.log('✅ [Search] Found', turkeyResults.length, 'places in Turkey');
      setSearchResults(turkeyResults);
      setShowSuggestions(true);
    } catch (error) {
      console.error('❌ [Search] Error:', error);
      Alert.alert('Hata', 'Arama sırasında hata oluştu');
    } finally {
      setSearchLoading(false);
    }
  };

  // Extract district from address
  const extractDistrict = (address) => {
    if (!address) return '';
    
    console.log('🔍 [Extract] Extracting district from:', address);
    
    // Google Places API formatında adres parçala
    const parts = address.split(',').map(part => part.trim());
    console.log('🔍 [Extract] Address parts:', parts);
    
    // Turkish district patterns - daha spesifik
    const districtPatterns = [
      /(\w+)\s+İlçesi/i,                          // "Kadıköy İlçesi"
      /(\w+)\s*\/\s*(\w+)/i,                      // "Kadıköy/İstanbul" 
      /(\w+)\s*,\s*(\w+)\s*İli?/i,               // "Kadıköy, İstanbul"
      /(\w+)\s*,\s*(\w+)\s*Province/i,           // "Kadıköy, Istanbul Province"
      /(\w+)\s+Mahallesi,?\s*(\w+)/i,            // "Merkez Mahallesi, Kadıköy"
    ];
    
    // Pattern'leri dene
    for (const pattern of districtPatterns) {
      const match = address.match(pattern);
      if (match) {
        console.log('🔍 [Extract] District pattern matched:', match);
        return match[1];
      }
    }
    
    // Google Places formatında genellikle: "Street, District, City, Country"
    if (parts.length >= 3) {
      const districtCandidate = parts[parts.length - 3];
      
      // İl ismi değilse ilçe olabilir
      const turkishProvinces = [
        'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
        'Gaziantep', 'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Urfa',
        'Malatya', 'Erzurum', 'Van', 'Batman', 'Elazığ', 'Tekirdağ', 'Samsun',
        'Denizli', 'Sakarya', 'Muğla', 'Balıkesir', 'Uşak', 'Tokat', 'Manisa',
        'Trabzon', 'Hatay', 'Kocaeli', 'Aydın', 'Mardin', 'Afyon', 'Isparta'
      ];
      
      if (!turkishProvinces.some(province => 
        districtCandidate.toLowerCase().includes(province.toLowerCase())
      )) {
        console.log('🔍 [Extract] District from parts:', districtCandidate);
        return districtCandidate;
      }
    }
    
    // Son çare: ikinci son parça
    if (parts.length >= 2) {
      const fallback = parts[parts.length - 2];
      console.log('🔍 [Extract] District fallback:', fallback);
      return fallback;
    }
    
    console.log('🔍 [Extract] No district found');
    return '';
  };

  // Extract province from address
  const extractProvince = (address) => {
    if (!address) return '';
    
    console.log('🔍 [Extract] Extracting province from:', address);
    
    // Google Places API formatında adres parçala
    const parts = address.split(',').map(part => part.trim());
    
    // Turkish province patterns - daha kapsamlı
    const provincePatterns = [
      /(\w+)\s+İli/i,                             // "İstanbul İli"
      /(\w+)\s+Province/i,                        // "Istanbul Province"
      /(\w+),?\s*Turkey/i,                        // "İstanbul, Turkey"
      /(\w+),?\s*Türkiye/i,                       // "İstanbul, Türkiye"
    ];
    
    // Pattern'leri dene
    for (const pattern of provincePatterns) {
      const match = address.match(pattern);
      if (match) {
        console.log('🔍 [Extract] Province pattern matched:', match);
        return match[1];
      }
    }
    
    // Türkiye'nin tüm illeri - güncel liste
    const turkishProvinces = [
      'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
      'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
      'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
      'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
      'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir',
      'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
      'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
      'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop',
      'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
      'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale',
      'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis',
      'Osmaniye', 'Düzce'
    ];
    
    // Her parçayı Türkiye illeri ile karşılaştır
    for (const part of parts) {
      for (const province of turkishProvinces) {
        if (part.toLowerCase().includes(province.toLowerCase()) || 
            province.toLowerCase().includes(part.toLowerCase())) {
          console.log('🔍 [Extract] Province found:', province);
          return province;
        }
      }
    }
    
    // Son çare: "Turkey" ve "Türkiye"den önceki parça
    const turkeyIndex = parts.findIndex(part => 
      part.toLowerCase().includes('turkey') || 
      part.toLowerCase().includes('türkiye')
    );
    
    if (turkeyIndex > 0) {
      const provinceCandidate = parts[turkeyIndex - 1];
      console.log('🔍 [Extract] Province from Turkey index:', provinceCandidate);
      return provinceCandidate;
    }
    
    console.log('🔍 [Extract] No province found');
    return '';
  };

  const handleSearchInput = (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      // Debounce search with setTimeout
      setTimeout(() => {
        if (text.length > 2) {
          searchPlaces(text);
        }
      }, 500);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  const selectPlace = (place) => {
    console.log('📍 [Select] Place selected:', place.name);
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setShowSuggestions(false);
    
    // Add to map markers
    setPlaces([place]);
    
    // Animate to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Handle Points of Interest (POI) click - Google Maps kendi mekanları
  const handlePoiClick = async (event) => {
    const { coordinate, name, placeId } = event.nativeEvent;
    console.log('🏢 [POI] POI clicked:', { name, placeId, coordinate });
    
    // Clear suggestions when tapping on POI
    setShowSuggestions(false);
    
    // Set tapped location immediately
    setTappedLocation(coordinate);
    setLoadingPlaceInfo(true);
    setTappedPlaceInfo(null);
    
    try {
      // POI için detaylı bilgi al
      let placeDetails;
      if (placeId) {
        console.log('🏢 [POI] Getting place details for:', placeId);
        placeDetails = await placesService.getPlaceDetails(placeId);
      }
      
      // Address bilgisini al
      const addressInfo = await placesService.getAddressFromCoordinates(
        coordinate.latitude, 
        coordinate.longitude
      );
      
      // POI için place info oluştur
      const address = placeDetails?.formatted_address || addressInfo.formatted_address || 'Adres bilgisi alınamadı';
      
      // Detaylı adres bilgisi oluştur
      const detailedAddress = createDetailedAddress(addressInfo);
      
      // Önce placesService'ten gelen hazır il/ilçe bilgilerini kullan
      let district = addressInfo.district || '';
      let province = addressInfo.province || '';
      
      // Google Places placeDetails'ten address_components kontrol et
      if (placeDetails?.address_components && (!district || !province)) {
        console.log('🏢 [POI] Address components:', placeDetails.address_components);
        
        for (const component of placeDetails.address_components) {
          const types = component.types;
          
          // İlçe bilgisi
          if (!district && (types.includes('administrative_area_level_2') || 
              types.includes('sublocality_level_1') ||
              types.includes('locality'))) {
            district = component.long_name;
          }
          
          // İl bilgisi
          if (!province && types.includes('administrative_area_level_1')) {
            province = component.long_name;
          }
        }
      }
      
      // Eğer hala alınamadıysa, extract fonksiyonlarını kullan
      if (!district) district = extractDistrict(address);
      if (!province) province = extractProvince(address);
      
      console.log('🏢 [POI] POI info - District:', district, 'Province:', province);
      
      const placeInfo = {
        name: name || placeDetails?.name || 'Mekan',
        address: detailedAddress,
        district: district,
        province: province,
        isEstablishment: true,
        placeTypes: placeDetails?.types || [],
        coordinate: coordinate
      };
      
      console.log('🏢 [POI] Created POI info:', placeInfo);
      
      // Place info'yu set et
      setTappedPlaceInfo(placeInfo);
      
      console.log('✅ [POI] POI info set successfully');
      
    } catch (error) {
      console.error('❌ [POI] Error getting POI info:', error);
      
      // Hata durumunda basit POI bilgisi oluştur
      setTappedPlaceInfo({
        name: name || 'Mekan',
        address: 'Adres bilgisi alınamadı',
        district: '',
        province: '',
        isEstablishment: true,
        coordinate: coordinate
      });
    } finally {
      setLoadingPlaceInfo(false);
    }
  };

  // Create detailed address from address components
  const createDetailedAddress = (addressInfo) => {
    if (!addressInfo) return 'Adres bilgisi alınamadı';
    
    const parts = [];
    
    // Sokak bilgisi
    if (addressInfo.street) {
      parts.push(addressInfo.street);
    }
    
    // Mahalle bilgisi
    if (addressInfo.neighborhood) {
      parts.push(addressInfo.neighborhood + ' Mahallesi');
    }
    
    // İlçe bilgisi
    if (addressInfo.district) {
      parts.push(addressInfo.district);
    }
    
    // İl bilgisi
    if (addressInfo.province) {
      parts.push(addressInfo.province);
    }
    
    // Ülke bilgisi
    if (addressInfo.country) {
      parts.push(addressInfo.country);
    }
    
    // Posta kodu varsa ekle
    if (addressInfo.postal_code) {
      parts.push('PK: ' + addressInfo.postal_code);
    }
    
    const detailedAddress = parts.length > 0 ? parts.join(', ') : addressInfo.formatted_address;
    
    console.log('📍 [Address] Created detailed address:', detailedAddress);
    return detailedAddress;
  };

  // Share address
  const copyAddressToClipboard = async () => {
    if (!tappedPlaceInfo?.address) {
      Alert.alert('Uyarı', 'Paylaşılacak adres bilgisi bulunamadı');
      return;
    }

    try {
      const result = await Share.share({
        message: `📍 ${tappedPlaceInfo.name}\n\n${tappedPlaceInfo.address}`,
        title: 'Adres Bilgisi'
      });

      if (result.action === Share.sharedAction) {
        console.log('📋 [Share] Address shared successfully:', tappedPlaceInfo.address);
      }
    } catch (error) {
      console.error('❌ [Share] Error sharing address:', error);
      Alert.alert('Hata', 'Adres paylaşılırken bir hata oluştu');
    }
  };

  const handleSearchModalPress = () => {
    setShowSearchModal(true);
  };

  // List management functions
  const handleAddToList = () => {
    console.log('⭐ [MapScreen] Star button pressed - handleAddToList called');
    console.log('📍 [MapScreen] tappedPlaceInfo:', tappedPlaceInfo);
    
    if (tappedPlaceInfo) {
      console.log('✅ [MapScreen] Setting place for list and showing modal');
      setSelectedPlace4List(tappedPlaceInfo);
      setShowAddToListModal(true);
    } else {
      console.log('❌ [MapScreen] No tappedPlaceInfo available');
    }
  };

  const handleCloseAddToListModal = () => {
    console.log('📱 [MapScreen] Add to List modal close - cameFromViewList:', cameFromViewList);
    setShowAddToListModal(false);
    
    // Reset place details
    setPlaceNote('');
    setPlaceRating(0);
    setPlacePhotos([]);
    
    if (cameFromViewList) {
      console.log('🔙 [MapScreen] Going back to ViewListModal');
      setCameFromViewList(false); // Reset the state
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    }
  };

  // Place photo management functions
  const addPlacePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPlacePhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      Alert.alert('Hata', 'Fotoğraf eklenirken bir hata oluştu');
    }
  };

  const removePlacePhoto = (index) => {
    setPlacePhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Photo preview functions
  const openPhotoPreview = (index) => {
    setPreviewPhotoIndex(index);
    setShowPhotoPreview(true);
  };

  const closePhotoPreview = () => {
    setShowPhotoPreview(false);
  };

  const deletePhotoFromPreview = () => {
    removePlacePhoto(previewPhotoIndex);
    closePhotoPreview();
  };

  const handleCreateNewList = () => {
    setShowAddToListModal(false);
    setShowCreateListModal(true);
  };

  const pickImageFromGallery = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Hata', 'Oturum açmanız gerekiyor');
        return;
      }

      // Generate a unique filename for the list image
      const timestamp = Date.now();
      const filename = `list_${timestamp}`;

      // Use the automatic upload function with updated Storage rules
      const result = await pickImageFromLibraryAndUpload('list-images', filename);
      
      if (!result.cancelled && result.downloadURL) {
        setNewListImage(result.downloadURL);
        setNewListImageType('photo');
        console.log('✅ List image uploaded successfully:', result.downloadURL);
      }
      
    } catch (error) {
      console.error('❌ [MapScreen] Error picking and uploading image:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu: ' + error.message);
    }
  };

  const handleAddToExistingList = async (listId) => {
    console.log('📝 [List] Adding place to list:', listId, selectedPlace4List?.name);
    
    if (!selectedPlace4List) {
      Alert.alert('Hata', 'Seçili mekan bulunamadı');
      return;
    }

    try {
      console.log('🔧 [List] Updating list in Firestore:', listId);
      
      // Upload photos first if any
      let uploadedPhotoUrls = [];
      if (placePhotos.length > 0) {
        try {
          const user = auth.currentUser;
          for (const photoUri of placePhotos) {
            const photoUrl = await StorageService.uploadListPlacePhoto(user.uid, listId, photoUri);
            uploadedPhotoUrls.push(photoUrl);
          }
        } catch (photoError) {
          console.warn('⚠️ [List] Error uploading photos:', photoError);
          // Continue without photos
        }
      }
      
      // Get current list data
      const listRef = doc(db, 'lists', listId);
      const listSnap = await getDoc(listRef);
      
      if (!listSnap.exists()) {
        Alert.alert('Hata', 'Liste bulunamadı');
        return;
      }

      const currentList = listSnap.data();
      const currentPlaces = currentList.places || [];

      // Check if place already exists in the list
      const placeExists = currentPlaces.some(place => 
        place.name === selectedPlace4List.name &&
        place.coordinate.latitude === selectedPlace4List.coordinate.latitude &&
        place.coordinate.longitude === selectedPlace4List.coordinate.longitude
      );

      if (placeExists) {
        Alert.alert('Bilgi', 'Bu mekan zaten listenizde bulunuyor');
        setShowAddToListModal(false);
        setSelectedPlace4List(null);
        return;
      }

      // Ortak liste mi kontrol et
      if (currentList.isCollaborative) {
        // Ortak liste için CollaborativeListService kullan
        const placeData = {
          ...selectedPlace4List,
          userContent: {
            note: placeNote.trim(),
            rating: placeRating,
            photos: uploadedPhotoUrls,
            addedAt: new Date(),
            addedBy: auth.currentUser.uid
          }
        };

        await CollaborativeListService.addPlaceToList(listId, placeData, auth.currentUser.uid);
        console.log('✅ [List] Place added to collaborative list successfully');
      } else {
        // Normal liste için eski yöntem
        const enhancedPlace = {
          ...selectedPlace4List,
          userContent: {
            note: placeNote.trim(),
            rating: placeRating,
            photos: uploadedPhotoUrls,
            addedAt: new Date(),
            addedBy: auth.currentUser.uid
          }
        };

        const updatedPlaces = [...currentPlaces, enhancedPlace];
        
        await updateDoc(listRef, {
          places: updatedPlaces,
          placesCount: updatedPlaces.length,
          updatedAt: serverTimestamp()
        });
        console.log('✅ [List] Place added to normal list successfully');
      }

      Alert.alert('Başarılı', `"${selectedPlace4List?.name}" listene eklendi!`);
      
      // Trigger global refresh
      forceRefresh();
      
      setShowAddToListModal(false);
      setSelectedPlace4List(null);
      
    } catch (error) {
      console.error('❌ [List] Error adding place to list:', error);
      Alert.alert('Hata', 'Mekan listeye eklenirken bir hata oluştu');
    }
  };

  const createNewList = async () => {
    console.log('📝 [MapScreen] createNewList fonksiyonu başlatıldı');
    console.log('📝 [MapScreen] Liste adı:', newListName.trim());
    console.log('📝 [MapScreen] Liste fotoğrafı:', newListImage ? 'var' : 'yok');
    console.log('📝 [MapScreen] Liste gizliliği:', newListPrivacy);
    
    if (!newListName.trim()) {
      Alert.alert('Uyarı', 'Liste adı boş olamaz');
      return;
    }

    if (!newListImage) {
      Alert.alert('Uyarı', 'Lütfen galeriden bir fotoğraf seçin');
      return;
    }

    try {
      const user = auth.currentUser;
      console.log('👤 [MapScreen] Kullanıcı kontrolü:', user ? user.uid : 'yok');
      
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
        return;
      }

      // Firebase Storage'da URL zaten mevcut, doğrudan kullan
      console.log('📤 [MapScreen] Using Firebase Storage URL');
      let imageURL = newListImage;
      
      // URL'nin Firebase Storage URL'si olup olmadığını kontrol et
      if (StorageService.isCacheFile(newListImage)) {
        console.log('🔄 [MapScreen] Cache dosyası tespit edildi, Firebase\'e yükleniyor...');
        const tempListId = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        imageURL = await StorageService.uploadListCoverImage(newListImage, tempListId);
        console.log('✅ [MapScreen] Resim Firebase\'e yüklendi:', imageURL);
      }

      // Seçili mekanı hazırla (eğer varsa)
      let processedPlace = null;
      if (selectedPlace4List) {
        // Mekan fotoğraflarını Firebase'e yükle
        let uploadedPhotoUrls = [];
        if (placePhotos.length > 0) {
          try {
            console.log('📸 [MapScreen] Uploading place photos:', placePhotos.length);
            const tempListId = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            for (const photoUri of placePhotos) {
              const photoUrl = await StorageService.uploadListPlacePhoto(user.uid, tempListId, photoUri);
              uploadedPhotoUrls.push(photoUrl);
              console.log('✅ [MapScreen] Photo uploaded:', photoUrl);
            }
          } catch (photoError) {
            console.warn('⚠️ [MapScreen] Error uploading place photos:', photoError);
            // Continue without photos
          }
        }
        
        processedPlace = {
          ...selectedPlace4List,
          userContent: {
            addedBy: user.uid,
            addedAt: new Date(),
            note: placeNote || '',
            rating: placeRating || 0,
            photos: uploadedPhotoUrls // Yüklenen fotoğraf URL'leri
          }
        };
        console.log('📝 [MapScreen] Mekan userContent ile hazırlandı:', processedPlace);
      }

      const newListData = {
        title: newListName.trim(), // 'name' yerine 'title' kullanıyoruz
        name: newListName.trim(),
        image: imageURL, // Artık Firebase URL
        imageType: newListImageType,
        isPrivate: newListPrivacy === 'private' || (newListPrivacy === 'collaborative' && isCollaborativePrivate),
        isCollaborative: newListPrivacy === 'collaborative',
        privacy: newListPrivacy, // Ek alan
        userId: user.uid,
        places: processedPlace ? [processedPlace] : [],
        placesCount: processedPlace ? 1 : 0, // Places count ekleyelim
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Eğer ortak liste ise, işbirlikçi bilgileri ve renk atamaları ekle
      if (newListPrivacy === 'collaborative') {
        // Liste sahibi her zaman ilk sırada olmalı (ilk rengi alır)
        const allParticipants = [user.uid, ...selectedCollaborators.map(c => c.id)];
        const colorAssignments = generateColorAssignments(allParticipants);
        
        newListData.collaborators = []; // Başlangıçta boş, davet kabul edilince eklenecek
        newListData.pendingCollaborators = selectedCollaborators.map(c => c.id); // Bekleyen davetler
        newListData.colorAssignments = colorAssignments;
        newListData.collaboratorDetails = {}; // Kabul edenlerin detayları sonra eklenecek
        
        // Liste sahibinin rengi (her zaman ilk renk)
        newListData.ownerColor = colorAssignments[user.uid];
        
        console.log('🎨 [MapScreen] Renk atamaları oluşturuldu:', colorAssignments);
        console.log('👑 [MapScreen] Liste sahibi rengi:', newListData.ownerColor);
      }

      console.log('💾 [MapScreen] Firebase\'e kaydedilecek veri:', newListData);

      // Firebase'e kaydet
      const docRef = await addDoc(collection(db, 'lists'), newListData);
      console.log('✅ [MapScreen] Liste Firebase\'e kaydedildi, ID:', docRef.id);

      // Local state'i güncelle
      const newList = {
        id: docRef.id,
        ...newListData,
        createdAt: new Date() // Local için timestamp
      };

      console.log('🔄 [MapScreen] Global state güncelleniyor:', newList);
      // Update global state instead of local state
      GlobalStateService.updateUserLists([...userLists, newList]);
      
      // Eğer işbirlikçi liste ise davet bildirimleri gönder
      if (newListPrivacy === 'collaborative' && selectedCollaborators.length > 0) {
        try {
          console.log('📤 [MapScreen] Davet bildirimleri gönderiliyor...');
          console.log('👥 [MapScreen] Seçilen işbirlikçi sayısı:', selectedCollaborators.length);
          console.log('👥 [MapScreen] Seçilen işbirlikçiler:', selectedCollaborators.map(c => c.firstName).join(', '));
          
          const currentUser = auth.currentUser;
          
          for (const collaborator of selectedCollaborators) {
            console.log('👤 [MapScreen] Collaborator bilgisi:', {
              id: collaborator.id,
              firstName: collaborator.firstName,
              username: collaborator.username
            });
            
            // NotificationService kullanarak bildirim gönder
            try {
              await sendInviteNotification({
                fromUserId: currentUser.uid,
                fromUserName: currentUser.displayName || 'Bir kullanıcı',
                fromUserAvatar: currentUser.photoURL || '👤',
                toUserId: collaborator.id,
                toUserName: collaborator.firstName || 'Kullanıcı',
                listId: docRef.id,
                listName: newListName.trim()
              });
              
              console.log('✅ [MapScreen] Invite notification sent to:', collaborator.firstName);
            } catch (notificationError) {
              console.warn('⚠️ [MapScreen] Error sending notification:', notificationError);
            }
            
            // Push notification gönder
            try {
              await sendListInvitationPushNotification(
                {
                  uid: currentUser.uid,
                  displayName: currentUser.displayName,
                  firstName: currentUser.displayName || 'Bir kullanıcı',
                  lastName: '',
                  avatar: currentUser.photoURL
                },
                collaborator.id,
                newListName.trim(),
                docRef.id
              );
              console.log('📱 [MapScreen] Push notification sent to:', collaborator.firstName);
            } catch (pushError) {
              console.error('❌ [MapScreen] Push notification error:', pushError);
              // Push notification hatası liste oluşturmayı engellememeli
            }
            
            console.log('📤 [MapScreen] Davet bildirimi gönderildi:', collaborator.firstName);
            
            // Push bildirimi gönder
            try {
              const fromUser = {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                firstName: currentUser.displayName?.split(' ')[0] || 'Kullanıcı',
                lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
                avatar: currentUser.photoURL || '👤'
              };
              
              await sendListInvitationPushNotification(
                fromUser,
                collaborator.id,
                newListName.trim(),
                docRef.id
              );
              console.log('✅ [MapScreen] Push bildirimi gönderildi:', collaborator.firstName);
            } catch (pushError) {
              console.error('❌ [MapScreen] Push bildirimi hatası:', pushError);
              // Push bildirimi hata verse bile devam et
            }
          }
          
          // Davet gönderme başarı mesajı
          const collaboratorNames = selectedCollaborators.map(c => c.firstName).join(', ');
          Alert.alert(
            'Davet Gönderildi!', 
            `${collaboratorNames} kullanıcılarına "${newListName.trim()}" listesi için davet gönderildi.\n\nDavet kabul veya reddedildiğinde bildirim alacaksınız.`,
            [{ text: 'Tamam' }]
          );
        } catch (error) {
          console.error('❌ [MapScreen] Davet bildirimi hatası:', error);
          Alert.alert('Uyarı', 'Liste oluşturuldu ancak davet bildirimleri gönderilemedi. Lütfen daha sonra tekrar deneyin.');
        }
      } else if (newListPrivacy === 'collaborative' && selectedCollaborators.length === 0) {
        // Collaborative liste ama kimse seçilmemiş
        console.log('⚠️ [MapScreen] Collaborative liste oluşturuldu ama kimse davet edilmedi');
        Alert.alert('Başarılı!', `"${newListName.trim()}" listesi oluşturuldu.\n\nDaha sonra kişileri davet edebilirsiniz.`);
      } else {
        // Normal liste oluşturuldu mesajı
        Alert.alert('Başarılı!', `"${newListName.trim()}" listesi başarıyla oluşturuldu.`);
      }
      
      // Reset states
      setShowCreateListModal(false);
      setNewListName('');
      setNewListPrivacy('public');
      setNewListImage(null);
      setNewListImageType('photo');
      setShowCollaboratorSearch(false);
      setCollaboratorQuery('');
      setSelectedPlace4List(null);
      setPlaceNote(''); // Place note'u temizle
      setPlaceRating(0); // Place rating'i temizle
      setPlacePhotos([]); // Place fotoğraflarını temizle
      setSelectedCollaborators([]);
      setFollowers([]);
      setFilteredFollowers([]);

      console.log('✅ [MapScreen] Liste oluşturma işlemi tamamlandı');

    } catch (error) {
      console.error('❌ [MapScreen] Liste oluşturma hatası:', error);
      console.error('❌ [MapScreen] Hata detayları:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Hata', 'Liste oluşturulurken bir hata oluştu: ' + error.message);
    }
  };

  const cancelCreateList = () => {
    setShowCreateListModal(false);
    setNewListName('');
    setNewListPrivacy('public');
    setNewListImage(null);
    setNewListImageType('photo');
    setShowCollaboratorSearch(false);
    setCollaboratorQuery('');
    setSelectedPlace4List(null); // Bu satırı ekledim
    setPlaceNote(''); // Place note'u temizle
    setPlaceRating(0); // Place rating'i temizle
    setPlacePhotos([]); // Place fotoğraflarını temizle
    setSelectedCollaborators([]);
    setFollowers([]);
    setFilteredFollowers([]);
  };

  // Takipçi listesini yükle
  const loadFollowers = async () => {
    try {
      console.log('📋 [MapScreen] Loading followers...');
      setLoadingFollowers(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('❌ [MapScreen] No current user found');
        return;
      }

      console.log('📋 [MapScreen] Current user ID:', currentUser.uid);

      // Her seferinde fresh takipçi listesi yükle
      setFollowers([]);
      setFilteredFollowers([]);

      // Mevcut kullanıcıyı takip eden kişileri bul (takipçileri)
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', currentUser.uid)
      );
      
      console.log('📋 [MapScreen] Executing followers query...');
      const followersSnapshot = await getDocs(followersQuery);
      const followerIds = followersSnapshot.docs.map(doc => doc.data().followerId);
      
      console.log('📋 [MapScreen] Found follower IDs:', followerIds.length, followerIds);
      
      if (followerIds.length === 0) {
        console.log('📋 [MapScreen] No followers found');
        setFollowers([]);
        setFilteredFollowers([]);
        return;
      }

      // Takipçi kullanıcı bilgilerini getir
      const followersData = [];
      console.log('📋 [MapScreen] Loading follower data...');
      
      for (const followerId of followerIds) {
        try {
          console.log('📋 [MapScreen] Loading data for follower:', followerId);
          const userDoc = await getDoc(doc(db, 'users', followerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const followerData = {
              id: followerId,
              username: userData.username || 'unknown',
              firstName: userData.firstName || 'İsimsiz',
              lastName: userData.lastName || 'Kullanıcı',
              avatar: userData.avatar || '👤'
            };
            followersData.push(followerData);
            console.log('✅ [MapScreen] Loaded follower:', followerData.firstName, followerData.username);
          } else {
            console.log('⚠️ [MapScreen] User document not found for:', followerId);
          }
        } catch (error) {
          console.warn('⚠️ [MapScreen] Error loading follower data for:', followerId, error);
        }
      }

      console.log('📋 [MapScreen] Setting followers data:', followersData.length);
      setFollowers(followersData);
      setFilteredFollowers(followersData);
      console.log('✅ [MapScreen] Followers loaded successfully:', followersData.length);
    } catch (error) {
      console.error('❌ [MapScreen] Error loading followers:', error);
      setFollowers([]);
      setFilteredFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Takipçileri filtrele
  const filterFollowers = (query) => {
    setCollaboratorQuery(query);
    
    if (!query.trim()) {
      setFilteredFollowers(followers);
      return;
    }

    const filtered = followers.filter(follower => 
      follower.username.toLowerCase().includes(query.toLowerCase()) ||
      follower.firstName.toLowerCase().includes(query.toLowerCase()) ||
      follower.lastName.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredFollowers(filtered);
  };

  // İşbirlikçi seç/seçimi kaldır
  const toggleCollaborator = (follower) => {
    const isSelected = selectedCollaborators.some(c => c.id === follower.id);
    
    if (isSelected) {
      const newSelected = selectedCollaborators.filter(c => c.id !== follower.id);
      setSelectedCollaborators(newSelected);
    } else {
      const newSelected = [...selectedCollaborators, follower];
      setSelectedCollaborators(newSelected);
    }
  };

  // Edit Mode Fonksiyonları
  const handleRemovePlaceFromEdit = (placeIndex) => {
    Alert.alert(
      'Mekan Sil',
      'Bu mekanı listeden kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            const updatedPlaces = editListPlaces.filter((_, index) => index !== placeIndex);
            setEditListPlaces(updatedPlaces);
            setPlaces(updatedPlaces);
            console.log('🗑️ [MapScreen] Place removed from edit list');
          }
        }
      ]
    );
  };

  const handlePlaceCardPress = (place) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
      console.log('🎯 [MapScreen] Map focused on place:', place.name);
    }
  };

  const saveEditChanges = async () => {
    try {
      console.log('💾 [MapScreen] Saving edit changes for list:', editingList.id);
      
      const listRef = doc(db, 'lists', editingList.id);
      await updateDoc(listRef, {
        places: editListPlaces,
        placesCount: editListPlaces.length,
        updatedAt: new Date()
      });

      Alert.alert('Başarılı', 'Liste güncellendi!', [
        {
          text: 'Tamam',
          onPress: () => {
            setIsEditMode(false);
            setShowEditBottomPanel(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }
        }
      ]);
      
    } catch (error) {
      console.error('❌ [MapScreen] Save edit failed:', error);
      Alert.alert('Hata', 'Liste güncellenirken bir hata oluştu');
    }
  };

  const cancelEdit = () => {
    Alert.alert(
      'Değişiklikleri İptal Et',
      'Yaptığınız değişiklikler kaydedilmeyecek. Devam etmek istediğinizden emin misiniz?',
      [
        { text: 'Kalın', style: 'cancel' },
        { 
          text: 'İptal Et', 
          style: 'destructive',
          onPress: () => {
            setIsEditMode(false);
            setShowEditBottomPanel(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }
        }
      ]
    );
  };

  // Handle Google Maps press
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const coordinate = { latitude, longitude };
    console.log('🗺️ [Map] Tapped at:', coordinate);
    
    // Clear suggestions when tapping on map
    setShowSuggestions(false);
    
    // Normal map press behavior
    // Set tapped location immediately
    setTappedLocation(coordinate);
    setLoadingPlaceInfo(true);
    setTappedPlaceInfo(null);
    
    try {
      // Önce tam olarak tıklanan koordinatın adres bilgisini al
      console.log('📍 [Map] Getting exact address for clicked coordinates...');
      const addressInfo = await placesService.getAddressFromCoordinates(
        coordinate.latitude, 
        coordinate.longitude
      );

      // Sonra yakında mekan var mı kontrol et (çok küçük radius ile)
      console.log('📍 [Map] Searching for nearby establishments...');
      const nearbyResults = await placesService.searchNearbyPlaces(
        coordinate.latitude, 
        coordinate.longitude, 
        50, // 50 metre radius
        'establishment|point_of_interest'
      );
      
      let placeInfo;
      
      if (nearbyResults.length > 0) {
        // Yakında mekan varsa, en yakın mekanı seç
        console.log('📍 [Map] Found', nearbyResults.length, 'nearby establishments');
        const nearestPlace = nearbyResults[0];
        
        // Detaylı mekan bilgisi al
        let placeDetails;
        if (nearestPlace.place_id) {
          placeDetails = await placesService.getPlaceDetails(nearestPlace.place_id);
        }
        
        // Address bilgisi
        const address = addressInfo.formatted_address || nearestPlace.vicinity || nearestPlace.formatted_address;
        
        // Önce placesService'ten gelen hazır il/ilçe bilgilerini kullan
        let district = addressInfo.district || '';
        let province = addressInfo.province || '';
        
        // Detaylı adres bilgisi oluştur
        const detailedAddress = createDetailedAddress(addressInfo);
        
        // Google Places placeDetails'ten address_components kontrol et
        if (placeDetails?.address_components && (!district || !province)) {
          console.log('📍 [Map] Address components:', placeDetails.address_components);
          
          for (const component of placeDetails.address_components) {
            const types = component.types;
            
            // İlçe bilgisi
            if (!district && (types.includes('administrative_area_level_2') || 
                types.includes('sublocality_level_1') ||
                types.includes('locality'))) {
              district = component.long_name;
            }
            
            // İl bilgisi
            if (!province && types.includes('administrative_area_level_1')) {
              province = component.long_name;
            }
          }
        }
        
        // Eğer hala alınamadıysa, extract fonksiyonlarını kullan
        if (!district) district = extractDistrict(address);
        if (!province) province = extractProvince(address);
        
        console.log('📍 [Map] Establishment info - District:', district, 'Province:', province);
        
        // İstablishment türünde mekan bilgisi oluştur
        placeInfo = {
          name: nearestPlace.name,
          address: detailedAddress,
          district: district,
          province: province,
          isEstablishment: true,
          placeTypes: nearestPlace.types || [],
          coordinate: coordinate
        };
        
        console.log('📍 [Map] Created establishment info:', placeInfo);
      } else {
        // Yakında mekan yoksa, sokak/konum bilgisi oluştur
        console.log('📍 [Map] No establishments found, creating location info');
        
        const address = addressInfo.formatted_address || 'Adres bilgisi alınamadı';
        
        // Detaylı adres bilgisi oluştur
        const detailedAddress = createDetailedAddress(addressInfo);
        
        // PlacesService'ten gelen hazır il/ilçe bilgilerini kullan
        let district = addressInfo.district || '';
        let province = addressInfo.province || '';
        
        // Eğer placesService'ten alınamadıysa, extract fonksiyonlarını kullan
        if (!district) district = extractDistrict(address);
        if (!province) province = extractProvince(address);
        
        console.log('📍 [Map] Location info - District:', district, 'Province:', province);
        
        placeInfo = {
          name: 'Seçilen Konum',
          address: detailedAddress,
          district: district,
          province: province,
          isEstablishment: false,
          coordinate: coordinate
        };
        
        console.log('📍 [Map] Created location info:', placeInfo);
      }
      
      // Place info'yu set et
      setTappedPlaceInfo(placeInfo);
      
      console.log('✅ [Map] Place info set successfully');
      
    } catch (error) {
      console.error('❌ [Map] Error getting location info:', error);
      
      // Hata durumunda basit konum bilgisi oluştur
      setTappedPlaceInfo({
        name: 'Seçilen Konum',
        address: 'Adres bilgisi alınamadı',
        district: '',
        province: '',
        isEstablishment: false,
        coordinate: coordinate
      });
    } finally {
      setLoadingPlaceInfo(false);
    }
  };

  if (errorMsg && !location) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStatusBar />
        <SoRitaHeader />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStatusBar />
        <SoRitaHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Konum alınıyor...</Text>
          <Text style={styles.loadingSubText}>
            {errorMsg ? errorMsg : 'GPS bekleniyor, lütfen bekleyin...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppStatusBar />
      
      {/* If we came from ViewList, don't show header and map */}
      {!cameFromViewList && (
        <>
          <SoRitaHeader 
            showMapControls={true}
            onSearchPress={handleSearchModalPress}
          />
          
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
            latitudeDelta: location.latitudeDelta || 0.0922,
            longitudeDelta: location.longitudeDelta || 0.0421,
          }}
          onPress={handleMapPress}
          onPoiClick={handlePoiClick}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={true}
          showsPointsOfInterest={true}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
          onMapReady={() => {
            console.log('🗺️ [MapScreen] Map is ready!');
            setMapReady(true);
          }}
        >
          {/* Search Result Markers */}
          {places.map((place, index) => (
            place.geometry?.location && (
              <Marker
                key={`search-${index}`}
                coordinate={{
                  latitude: place.geometry.location.lat,
                  longitude: place.geometry.location.lng,
                }}
                title={place.name}
                description={place.vicinity || place.formatted_address}
              >
                <View style={styles.customMarker}>
                  <Text style={styles.markerEmoji}>📍</Text>
                </View>
              </Marker>
            )
          ))}
          
          {/* Tapped Location Marker */}
          {tappedLocation && (
            <Marker
              coordinate={tappedLocation}
              title={tappedPlaceInfo?.name || 'Seçilen Konum'}
              description={tappedPlaceInfo?.address || 'Konum bilgisi'}
            >
              <View style={styles.customMarker}>
                <Text style={styles.markerEmoji}>📍</Text>
              </View>
            </Marker>
          )}
          
          {/* List Places Markers */}
          {currentListDetail && currentListDetail.places && currentListDetail.places.map((place, index) => {
            const latitude = place.coordinate?.latitude || place.latitude;
            const longitude = place.coordinate?.longitude || place.longitude;
            
            if (!latitude || !longitude) {
              return null;
            }

            // Kullanıcı rengini al
            const addedByUserId = place.userContent?.addedBy || place.addedBy || currentListDetail.userId; // Fallback: liste sahibi
            const userColor = currentListDetail.colorAssignments?.[addedByUserId] || '#FF6B6B';
            
            console.log('🗺️ [MapScreen] Marker color for', place.name, ':', {
              addedByUserId,
              userColor,
              colorAssignments: currentListDetail.colorAssignments,
              currentUserId: auth.currentUser?.uid,
              listOwnerId: currentListDetail.userId
            });

            return (
              <Marker
                key={`list-place-${index}`}
                coordinate={{
                  latitude: latitude,
                  longitude: longitude
                }}
                title={place.name}
                description={place.address}
              >
                <View style={[styles.listMarker, { backgroundColor: userColor }]}>
                  <Text style={styles.listMarkerEmoji}>📍</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
        
        {!mapReady && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapLoadingText}>Google Maps yükleniyor...</Text>
          </View>
        )}
      </View>
      
      {/* Close the conditional rendering for map */}
      </>
      )}

      {/* Bottom Panel for Tapped Location Info - only show if not from ViewList */}
      {!cameFromViewList && tappedLocation && (loadingPlaceInfo || tappedPlaceInfo) && (
        <View style={styles.bottomPanel}>
          <View style={styles.bottomPanelHeader}>
            <View style={styles.bottomPanelTitle}>
              <MaterialIcons 
                name={tappedPlaceInfo?.isEstablishment ? "business" : "location-on"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.bottomPanelTitleText} numberOfLines={2}>
                {tappedPlaceInfo?.name || (tappedPlaceInfo?.isEstablishment ? "Mekan Bilgisi" : "Konum Bilgisi")}
              </Text>
            </View>
            <View style={styles.bottomPanelActions}>
              <TouchableOpacity
                onPress={() => copyAddressToClipboard()}
                style={styles.bottomPanelAction}
              >
                <MaterialIcons name="content-copy" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddToList}
                style={styles.bottomPanelAction}
              >
                <MaterialIcons name="playlist-add" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setTappedLocation(null);
                  setTappedPlaceInfo(null);
                  setLoadingPlaceInfo(false);
                }}
                style={styles.bottomPanelClose}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.bottomPanelContent}>
            {loadingPlaceInfo ? (
              <View style={styles.bottomPanelLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.bottomPanelLoadingText}>Bilgiler alınıyor...</Text>
              </View>
            ) : tappedPlaceInfo ? (
              <ScrollView 
                style={styles.infoContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {/* Adres Bilgisi */}
                {tappedPlaceInfo.address && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <MaterialIcons name="place" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Adres</Text>
                      <Text style={styles.infoValue}>{tappedPlaceInfo.address}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      )}
      
      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Mekan Ara</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={24} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Türkiye'de mekan, restoran, kafe ara..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchInput}
                onFocus={() => setShowSuggestions(searchResults.length > 0)}
                returnKeyType="search"
                onSubmitEditing={() => searchPlaces(searchQuery)}
                autoFocus={true}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSuggestions(false);
                    setPlaces([]);
                  }}
                >
                  <MaterialIcons name="clear" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Suggestions */}
            {showSuggestions && searchResults.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={searchResults.slice(0, 10)}
                  keyExtractor={(item, index) => `suggestion-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => {
                        selectPlace(item);
                        setShowSearchModal(false);
                      }}
                    >
                      <MaterialIcons name="location-on" size={20} color={colors.primary} />
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionName}>{item.name}</Text>
                        <Text style={styles.suggestionAddress}>
                          {item.vicinity || item.formatted_address}
                        </Text>
                      </View>
                      <Text style={styles.suggestionRating}>
                        {item.rating ? `⭐ ${item.rating}` : ''}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.suggestionsList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Add to List Modal */}
      <Modal
        visible={showAddToListModal}
        animationType="slide"
        presentationStyle={cameFromViewList ? "fullScreen" : "pageSheet"}
        onRequestClose={() => {
          console.log('📱 [MapScreen] Add to List modal onRequestClose called');
          handleCloseAddToListModal();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              console.log('📱 [MapScreen] Add to List modal close button pressed');
              handleCloseAddToListModal();
            }}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Listeye Ekle</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshingLists}
                onRefresh={loadUserLists}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {/* Selected Place Info */}
            {selectedPlace4List && (
              <View style={styles.selectedPlaceInfo}>
                <MaterialIcons name="place" size={24} color={colors.primary} />
                <View style={styles.selectedPlaceText}>
                  <Text style={styles.selectedPlaceName}>{selectedPlace4List.name}</Text>
                  <Text style={styles.selectedPlaceAddress}>{selectedPlace4List.address}</Text>
                </View>
              </View>
            )}
            
            {/* Place Details Section - NEW */}
            <View style={styles.placeDetailsSection}>
              {/* Note Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📝 Not Ekle (Opsiyonel)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Bu mekan hakkında notlarınızı yazın..."
                  multiline
                  numberOfLines={3}
                  value={placeNote}
                  onChangeText={setPlaceNote}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{placeNote.length}/500</Text>
              </View>

              {/* Rating Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>⭐ Puan Ver (Opsiyonel)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => setPlaceRating(star)}
                    >
                      <MaterialIcons
                        name={star <= placeRating ? 'star' : 'star-border'}
                        size={32}
                        color={star <= placeRating ? '#FFD700' : '#ccc'}
                      />
                    </TouchableOpacity>
                  ))}
                  {placeRating > 0 && (
                    <TouchableOpacity
                      style={styles.clearRatingButton}
                      onPress={() => setPlaceRating(0)}
                    >
                      <Text style={styles.clearRatingText}>Temizle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Photo Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📸 Fotoğraf Ekle (Opsiyonel)</Text>
                <ScrollView horizontal style={styles.photoContainer} showsHorizontalScrollIndicator={false}>
                  {placePhotos.map((photo, index) => (
                    <View key={index} style={styles.photoItem}>
                      <TouchableOpacity onPress={() => openPhotoPreview(index)}>
                        <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePlacePhoto(index)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {placePhotos.length < 4 && (
                    <TouchableOpacity
                      style={styles.addPhotoButton}
                      onPress={addPlacePhoto}
                    >
                      <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
                      <Text style={styles.addPhotoText}>Ekle</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />
            
            {/* New List Button */}
            <TouchableOpacity 
              style={styles.newListButton}
              onPress={handleCreateNewList}
            >
              <View style={styles.newListIcon}>
                <MaterialIcons name="add" size={24} color={colors.primary} />
              </View>
              <Text style={styles.newListText}>Yeni Liste Oluştur</Text>
            </TouchableOpacity>
            
            {/* Existing Lists */}
            <Text style={styles.sectionTitle}>
              Mevcut Listeler
            </Text>
            
            {/* Filter Options */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterContainer}
            >
              {['Tümü', 'Herkese Açık', 'Ortak', 'Özel'].map((filter) => {
                const counts = getListCounts();
                let count = 0;
                
                switch(filter) {
                  case 'Tümü':
                    count = counts.total;
                    break;
                  case 'Herkese Açık':
                    count = counts.public;
                    break;
                  case 'Ortak':
                    count = counts.collaborative;
                    break;
                  case 'Özel':
                    count = counts.private;
                    break;
                }
                
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterButton,
                      listFilter === filter && styles.filterButtonActive
                    ]}
                    onPress={() => setListFilter(filter)}
                  >
                    <Text style={[
                      styles.filterText,
                      listFilter === filter && styles.filterTextActive
                    ]}>
                      {filter} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.listsContainer}>
              {modalUserLists.length > 0 ? (
                modalUserLists
                  .filter((list) => {
                    // Filtre mantığı - Öncelik sırası: Ortak > Özel > Herkese Açık
                    const currentUserId = auth.currentUser?.uid;
                    const isCollaborative = (list.collaborators && list.collaborators.includes(currentUserId)) || 
                                           list.isCollaborative === true;
                    const isPrivate = list.isPrivate === true || list.privacy === 'private';
                    
                    switch (listFilter) {
                      case 'Ortak':
                        // Sadece collaborative listeler
                        return isCollaborative;
                      case 'Özel':
                        // Collaborative olmayan + private olan listeler
                        return !isCollaborative && isPrivate;
                      case 'Herkese Açık':
                        // Collaborative olmayan + private olmayan listeler
                        return !isCollaborative && !isPrivate;
                      case 'Tümü':
                      default:
                        return true; // Hepsini göster
                    }
                  })
                  .map((list) => {
                  // Liste türünü belirle
                  const currentUserId = auth.currentUser?.uid;
                  const isOwner = list.userId === currentUserId;
                  const isCollaborator = list.collaborators?.includes(currentUserId);
                  
                  let listTypeLabel = '';
                  if (isOwner && !isCollaborator) {
                    listTypeLabel = ' (Kendi listem)';
                  } else if (isCollaborator && !isOwner) {
                    listTypeLabel = ' (Ortak liste)';
                  } else if (isOwner && isCollaborator) {
                    listTypeLabel = ' (Ortak - sahip)';
                  }
                  
                  // Liste bilgisini güncelle
                  const displayList = {
                    ...list,
                    name: list.name + listTypeLabel
                  };
                  
                  return (
                    <ListCard
                      key={list.id}
                      list={displayList}
                      onPress={() => handleAddToExistingList(list.id)}
                      showPrivacyIcon={true}
                      showArrow={true}
                      showDates={false}
                      style={styles.listCardStyle}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyListsContainer}>
                  <MaterialIcons name="list" size={48} color="#ccc" />
                  <Text style={styles.emptyListsText}>Henüz listeniz yok</Text>
                  <Text style={styles.emptyListsSubtext}>Yeni liste oluşturarak başlayın</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Create New List Modal */}
      <Modal
        visible={showCreateListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={cancelCreateList}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={cancelCreateList}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yeni Liste Oluştur</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* List Image Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Liste Fotoğrafı</Text>
              
              {/* Gallery Button */}
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImageFromGallery}
              >
                <MaterialIcons name="photo-library" size={24} color="#007AFF" />
                <Text style={styles.galleryButtonText}>Galeriden Seç</Text>
              </TouchableOpacity>
              
              {/* Selected Image Preview */}
              {newListImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: newListImage }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      setNewListImage(null);
                    }}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Liste için galeriden bir fotoğraf seçmeniz gerekmektedir.
                </Text>
              )}
            </View>
            
            {/* List Name */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Liste Adı</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Liste için bir isim girin..."
                value={newListName}
                onChangeText={setNewListName}
                maxLength={50}
              />
            </View>
            
            {/* Privacy Settings */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Gizlilik Ayarları</Text>
              
              <TouchableOpacity
                style={[styles.privacyOption, newListPrivacy === 'public' && styles.privacyOptionSelected]}
                onPress={() => {
                  setNewListPrivacy('public');
                  setShowCollaboratorSearch(false);
                }}
              >
                <MaterialIcons name="public" size={24} color={newListPrivacy === 'public' ? '#fff' : '#666'} />
                <Text style={[styles.privacyOptionText, newListPrivacy === 'public' && styles.privacyOptionTextSelected]}>
                  Herkese Açık
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.privacyOption, newListPrivacy === 'private' && styles.privacyOptionSelected]}
                onPress={() => {
                  setNewListPrivacy('private');
                  setShowCollaboratorSearch(false);
                }}
              >
                <MaterialIcons name="lock" size={24} color={newListPrivacy === 'private' ? '#fff' : '#666'} />
                <Text style={[styles.privacyOptionText, newListPrivacy === 'private' && styles.privacyOptionTextSelected]}>
                  Özel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.privacyOption, newListPrivacy === 'collaborative' && styles.privacyOptionSelected]}
                onPress={async () => {
                  console.log('👥 [MapScreen] Collaborative privacy selected');
                  setNewListPrivacy('collaborative');
                  setShowCollaboratorSearch(true);
                  console.log('👥 [MapScreen] Starting to load followers...');
                  await loadFollowers(); // Takipçileri yükle
                  console.log('👥 [MapScreen] Followers loading completed');
                }}
              >
                <MaterialIcons name="group" size={24} color={newListPrivacy === 'collaborative' ? '#fff' : '#666'} />
                <Text style={[styles.privacyOptionText, newListPrivacy === 'collaborative' && styles.privacyOptionTextSelected]}>
                  Ortak
                </Text>
              </TouchableOpacity>
              
              {/* Davet Et seçiliyse özel ve herkese açık seçenekleri göster */}
              {newListPrivacy === 'collaborative' && (
                <View style={styles.subPrivacyOptions}>
                  <Text style={styles.subPrivacyTitle}>Lista görünürlüğü:</Text>
                  <View style={styles.subPrivacyContainer}>
                    <TouchableOpacity
                      style={[
                        styles.subPrivacyOption, 
                        (newListPrivacy === 'collaborative' && !isCollaborativePrivate) && styles.subPrivacyOptionSelected
                      ]}
                      onPress={() => {
                        // Herkese açık collaborative liste
                        setNewListPrivacy('collaborative');
                        setIsCollaborativePrivate(false);
                      }}
                    >
                      <MaterialIcons name="public" size={20} color="#10B981" />
                      <Text style={styles.subPrivacyOptionText}>Herkese Açık</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.subPrivacyOption,
                        (newListPrivacy === 'collaborative' && isCollaborativePrivate) && styles.subPrivacyOptionSelected
                      ]}
                      onPress={() => {
                        // Özel collaborative liste
                        setNewListPrivacy('collaborative');
                        setIsCollaborativePrivate(true);
                      }}
                    >
                      <MaterialIcons name="lock" size={20} color="#6366F1" />
                      <Text style={styles.subPrivacyOptionText}>Özel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {(showCollaboratorSearch && newListPrivacy === 'collaborative') && (
                <View style={styles.collaboratorSearch}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Takipçi ara..."
                    value={collaboratorQuery}
                    onChangeText={filterFollowers}
                  />
                  
                  {/* Seçilen işbirlikçiler */}
                  {selectedCollaborators.length > 0 && (
                    <View style={styles.selectedCollaborators}>
                      <Text style={styles.selectedCollaboratorsTitle}>
                        Seçilen Kişiler ({selectedCollaborators.length}):
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedCollaborators.map(collaborator => (
                          <TouchableOpacity
                            key={collaborator.id}
                            style={styles.selectedCollaboratorChip}
                            onPress={() => toggleCollaborator(collaborator)}
                          >
                            <Text style={styles.selectedCollaboratorAvatar}>
                              {collaborator.avatar}
                            </Text>
                            <Text style={styles.selectedCollaboratorName}>
                              {collaborator.firstName}
                            </Text>
                            <MaterialIcons name="close" size={16} color="#666" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  
                  {/* Takipçi listesi */}
                  <View style={styles.followersList}>
                    <Text style={styles.followersListTitle}>
                      Takipçileriniz ({filteredFollowers.length})
                    </Text>
                    <ScrollView style={[styles.followersScrollView, { maxHeight: 200 }]} nestedScrollEnabled={true}>
                      {loadingFollowers ? (
                        <View style={styles.loadingFollowers}>
                          <ActivityIndicator size="small" color="#6366F1" />
                          <Text style={styles.loadingFollowersText}>Takipçiler yükleniyor...</Text>
                        </View>
                      ) : filteredFollowers.length > 0 ? (
                        filteredFollowers.map((item) => {
                          const isSelected = selectedCollaborators.some(c => c.id === item.id);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.followerItem,
                                isSelected && styles.followerItemSelected
                              ]}
                              onPress={() => toggleCollaborator(item)}
                            >
                              <Text style={styles.followerAvatar}>{item.avatar}</Text>
                              <View style={styles.followerInfo}>
                                <Text style={styles.followerName}>
                                  {item.firstName} {item.lastName}
                                </Text>
                                <Text style={styles.followerUsername}>@{item.username}</Text>
                              </View>
                              <MaterialIcons
                                name={isSelected ? "check-circle" : "radio-button-unchecked"}
                                size={24}
                                color={isSelected ? "#10B981" : "#999"}
                              />
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.emptyFollowers}>
                          <MaterialIcons name="search-off" size={48} color="#999" />
                          <Text style={styles.emptyFollowersText}>
                            {collaboratorQuery ? 'Arama sonucu bulunamadı' : 'Henüz takipçiniz yok'}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                  
                  <Text style={styles.collaboratorHint}>
                    Sadece takipçilerinizden davet edebilirsiniz
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          {/* Modal Footer */}
          <View style={styles.createListFooter}>
            <TouchableOpacity
              style={styles.cancelCreateButton}
              onPress={cancelCreateList}
              onLongPress={cancelCreateList}
            >
              <Text style={styles.cancelCreateButtonText}>İptal için 2sn basılı tutun</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.createListButton, (!newListName.trim() || !newListImage) && styles.createListButtonDisabled]}
              onPress={createNewList}
              disabled={!newListName.trim() || !newListImage}
            >
              <Text style={styles.createListButtonText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* List Detail Modal */}
      <Modal
        visible={showListDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowListDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowListDetailModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {currentListDetail?.name || 'Liste Detayı'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {currentListDetail && (
              <>
                {/* List Info */}
                <View style={styles.listDetailHeader}>
                  <View style={styles.listDetailImageContainer}>
                    {currentListDetail.image ? (
                      <Image 
                        source={{ uri: currentListDetail.image }} 
                        style={styles.listDetailImage} 
                      />
                    ) : (
                      <View style={styles.listDetailIcon}>
                        <MaterialIcons name="list" size={40} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.listDetailInfo}>
                    <Text style={styles.listDetailName}>
                      {currentListDetail.name}
                    </Text>
                    <View style={styles.listDetailMeta}>
                      <Text style={styles.listDetailPlaces}>
                        {currentListDetail.places?.length || 0} yer
                      </Text>
                      <Text style={styles.listDetailPrivacy}>
                        {currentListDetail.isPrivate ? '🔒 Özel' : '🌍 Herkese Açık'}
                      </Text>
                    </View>
                    <Text style={styles.listDetailDate}>
                      {currentListDetail.createdAt ? 
                        new Date(currentListDetail.createdAt.toDate ? currentListDetail.createdAt.toDate() : currentListDetail.createdAt)
                          .toLocaleDateString('tr-TR') 
                        : 'Tarih yok'
                      }
                    </Text>
                  </View>
                </View>

                {/* Places List */}
                <View style={styles.placesSection}>
                  <Text style={styles.sectionTitle}>Kayıtlı Yerler</Text>
                  {currentListDetail.places && currentListDetail.places.length > 0 ? (
                    currentListDetail.places.map((place, index) => (
                      <View key={index} style={styles.placeItem}>
                        <MaterialIcons name="place" size={24} color={colors.primary} />
                        <View style={styles.placeInfo}>
                          <Text style={styles.placeName}>{place.name}</Text>
                          <Text style={styles.placeAddress} numberOfLines={2}>
                            {place.address}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="location-off" size={48} color={colors.textSecondary} />
                      <Text style={styles.emptyTitle}>Henüz yer eklenmemiş</Text>
                      <Text style={styles.emptySubtitle}>
                        Bu listeye henüz hiç yer eklenmemiş.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        visible={showPhotoPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={closePhotoPreview}
      >
        <View style={styles.photoPreviewContainer}>
          <TouchableOpacity 
            style={styles.photoPreviewOverlay}
            onPress={closePhotoPreview}
          />
          
          {placePhotos[previewPhotoIndex] && (
            <View style={styles.photoPreviewContent}>
              {/* Header with close and delete buttons */}
              <View style={styles.photoPreviewHeader}>
                <TouchableOpacity 
                  style={styles.photoPreviewButton}
                  onPress={closePhotoPreview}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.photoPreviewButton}
                  onPress={deletePhotoFromPreview}
                >
                  <MaterialIcons name="delete" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Photo */}
              <Image 
                source={{ uri: placePhotos[previewPhotoIndex] }} 
                style={styles.photoPreviewImage}
                resizeMode="contain"
              />

              {/* Photo counter */}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {previewPhotoIndex + 1} / {placePhotos.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Edit Bottom Panel */}
      {showEditBottomPanel && isEditMode && (
        <View style={styles.editBottomPanel}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>"{editingList?.name}" Düzenleme</Text>
            <View style={styles.editHeaderButtons}>
              <TouchableOpacity 
                onPress={cancelEdit}
                style={[styles.editButton, styles.cancelButton]}
              >
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={saveEditChanges}
                style={[styles.editButton, styles.saveButton]}
              >
                <MaterialIcons name="save" size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.editPlacesList} showsVerticalScrollIndicator={false}>
            {editListPlaces.length === 0 ? (
              <View style={styles.emptyEditPlaces}>
                <Text style={styles.emptyEditText}>Bu listede henüz mekan yok</Text>
              </View>
            ) : (
              editListPlaces.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.editPlaceCard}
                  onPress={() => handlePlaceCardPress(place)}
                >
                  <View style={styles.editPlaceInfo}>
                    <Text style={styles.editPlaceName}>{place.name}</Text>
                    <Text style={styles.editPlaceAddress}>{place.address}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemovePlaceFromEdit(index)}
                    style={styles.editRemoveButton}
                  >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Search styles
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 250,
  },
  suggestionsList: {
    borderRadius: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#666',
  },
  suggestionRating: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Map styles
  mapContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  // Marker styles
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  markerEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  placeRating: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  placeTypes: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    textTransform: 'capitalize',
  },
  coordinatesInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Callout styles
  calloutContainer: {
    minWidth: 200,
    maxWidth: 280,
  },
  calloutContent: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  calloutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  calloutLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  calloutRating: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  calloutCoordinates: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  calloutTypes: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  // Bottom panel styles
  bottomPanel: {
    position: 'absolute',
    bottom: 0, // Ekranın en altına
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    maxHeight: '60%',
    minHeight: 'auto',
    paddingBottom: 80, // Alt navigasyon barı için boşluk
  },
  bottomPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from 'center' to allow text wrapping
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 60, // Minimum height to accommodate wrapped text
  },
  bottomPanelTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to align with top
    flex: 1, // Allow title to take available space
    paddingRight: 12, // Add spacing between title and actions
  },
  bottomPanelTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1, // Allow text to take available space
    lineHeight: 24, // Better line spacing for wrapped text
  },
  bottomPanelClose: {
    padding: 8,
  },
  bottomPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0, // Prevent actions from shrinking
  },
  bottomPanelAction: {
    padding: 8,
    marginRight: 8,
  },
  bottomPanelContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 0, // Alt boşluk yok - panel'in paddingBottom'u var
    maxHeight: 200, // Maximum yükseklik sınırı
  },
  bottomPanelLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  bottomPanelLoadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  // Yeni info container ve row stilleri
  infoContainer: {
    flexGrow: 1,
    paddingBottom: 20, // İçerik ile navigasyon barı arası boşluk
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontWeight: '500',
    flexWrap: 'wrap',
    flex: 1,
  },
  infoValueMono: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cancelHintContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // List management styles
  selectedPlaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedPlaceText: {
    flex: 1,
    marginLeft: 12,
  },
  selectedPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedPlaceAddress: {
    fontSize: 14,
    color: '#666',
  },
  newListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 20,
  },
  newListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  listsContainer: {
    paddingHorizontal: 0,
    marginTop: 8,
  },
  emptyListsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyListsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  privateIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  emojiSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  emojiText: {
    fontSize: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f8f9fa',
  },
  privacyOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  privacyOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  privacyOptionTextSelected: {
    color: '#fff',
  },
  collaboratorSearch: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  collaboratorHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedCollaborators: {
    marginTop: 12,
    marginBottom: 12,
  },
  selectedCollaboratorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedCollaboratorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  selectedCollaboratorAvatar: {
    fontSize: 16,
  },
  selectedCollaboratorName: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  followersList: {
    marginTop: 12,
  },
  followersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  followersScrollView: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'scroll',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  followerItemSelected: {
    backgroundColor: '#E8F5E8',
  },
  followerAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  followerUsername: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyFollowers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFollowersText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createListFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelCreateButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dc3545',
    alignItems: 'center',
  },
  cancelCreateButtonText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
    textAlign: 'center',
  },
  createListButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  createListButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createListButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Gallery and image selection styles
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  galleryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // List marker styles
  listMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  listMarkerEmoji: {
    fontSize: 16,
    color: '#fff',
  },
  // List detail modal styles
  listDetailHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.lightBackground,
    marginBottom: 20,
  },
  listDetailImageContainer: {
    marginRight: 16,
  },
  listDetailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  listDetailIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  listDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  listDetailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listDetailPlaces: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
  listDetailPrivacy: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listDetailDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  placesSection: {
    paddingHorizontal: 20,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Edit Panel Styles
  editBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    maxHeight: height * 0.4,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  editHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editPlacesList: {
    flex: 1,
    padding: 16,
  },
  emptyEditPlaces: {
    padding: 20,
    alignItems: 'center',
  },
  emptyEditText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  editPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editPlaceInfo: {
    flex: 1,
  },
  editPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  editPlaceAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editRemoveButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  listCardStyle: {
    marginHorizontal: 0,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  
  // Place details styles - NEW
  placeDetailsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  starButton: {
    padding: 4,
    marginRight: 8,
  },
  clearRatingButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  clearRatingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  photoContainer: {
    marginTop: 8,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  addPhotoText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  
  // Photo preview modal styles
  photoPreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoPreviewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  photoPreviewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewImage: {
    width: '90%',
    height: '70%',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Sub Privacy Options Styles
  subPrivacyOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  subPrivacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  subPrivacyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  subPrivacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  subPrivacyOptionSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  subPrivacyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  loadingFollowers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  loadingFollowersText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  filterScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
}); 

export default MapScreen;
