import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc as firebaseDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import SearchModal from '../components/SearchModal';
import PlaceCard from '../components/PlaceCard';
import SoRitaHeader from '../components/SoRitaHeader';
import ViewListModal from '../components/ViewListModal';
import { AppStatusBar } from '../components/AppStatusBar';
import { AuthService } from '../services/authService';
import CollaborativeListService from '../services/collaborativeListService';
import { EdgeToEdgeScreen } from '../components/EdgeToEdgeContainer';

// Import data services
import { ActivityService } from '../services/activityService';
import GlobalStateService from '../services/globalStateService';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import PlacesDataService from '../services/placesDataService';
import UserDataService from '../services/userDataService';

// Avatar render component
const UserAvatar = ({ user, size = 40 }) => {
  if (user?.avatar && user.avatar.startsWith('data:image')) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginRight: 12,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#E5E5E5',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E5E5',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: size * 0.5,
          textAlign: 'center',
          color: '#333333',
        }}
      >
        {user?.avatar || '👤'}
      </Text>
    </View>
  );
};

// Helper function to get user's own lists
const getUserOwnLists = async (userId) => {
  try {
    const userListsQuery = query(collection(db, 'lists'), where('userId', '==', userId));

    const userListsSnap = await getDocs(userListsQuery);
    return userListsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('❌ [HomeScreen] Error fetching user own lists:', error);
    return [];
  }
};

export default function HomeScreen({ navigation }) {
  // Real-time sync hook
  const realtimeSync = useRealtimeSync('Home');

  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState('following'); // Start with 'following' for better UX
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(
    realtimeSync.unreadCount || 0
  );
  const [showEmailVerificationBanner, setShowEmailVerificationBanner] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(realtimeSync.refreshTrigger || 0); // PlaceCard refresh trigger

  // ViewListModal states
  const [selectedList, setSelectedList] = useState(null);
  const [viewListModalVisible, setViewListModalVisible] = useState(false);

  // console.log('🏠 [HomeScreen] Component initializing...');

  const loadPosts = useCallback(async () => {
    // console.log('🏠 [HomeScreen] =================== LOAD POSTS BAŞLIYOR ===================');
    // console.log('🏠 [HomeScreen] Mevcut sortType:', sortType);

    setLoading(true);
    try {
      const user = auth.currentUser;
      // console.log('🏠 [HomeScreen] Mevcut kullanıcı:', user ? user.uid : 'YOK');

      if (!user) {
        console.log('❌ [HomeScreen] Kullanıcı oturum açmamış!');
        setLoading(false);
        return;
      }

      let loadedPosts = [];

      if (sortType === 'following') {
        console.log('🔍 [HomeScreen] ========== TAKİP ETTİKLERİM MODU ==========');
        try {
          // Takip edilen kişilerin listesini al
          const followingQuery = query(
            collection(db, 'follows'),
            where('followerId', '==', user.uid) // DÜZELTME: followerId field kullan
          );
          console.log('🔍 [HomeScreen] Takip edilenler sorgusu hazırlandı');

          const followingSnap = await getDocs(followingQuery);
          console.log('🔍 [HomeScreen] Takip edilen kişi sayısı:', followingSnap.docs.length);

          const followedUserIds = followingSnap.docs.map((doc) => {
            const data = doc.data();
            console.log('🔍 [HomeScreen] Takip edilen kişi ID:', data.followedUserId);
            return data.followedUserId;
          });

          // Takip Ettiklerim sekmesi: SADECE takip edilen kullanıcıları göster (kendi mekanlarını gösterme)
          console.log(
            '🔍 [HomeScreen] Toplam kontrol edilecek kullanıcı sayısı:',
            followedUserIds.length
          );

          if (followedUserIds.length === 0) {
            // Hiç kimseyi takip etmiyorsa
            console.log('ℹ️ [HomeScreen] Henüz kimseyi takip etmiyor');
          }

          // Her kullanıcının listelerini ve mekanlarını al
          const userPlacePromises = followedUserIds.slice(0, 15).map(async (userId) => {
            // console.log('� [HomeScreen] Kullanıcının mekanları kontrol ediliyor:', userId);
            try {
              // Bu kullanıcının listelerini al
              const userListsQuery = query(collection(db, 'lists'), where('userId', '==', userId));
              const userListsSnap = await getDocs(userListsQuery);
              // console.log('� [HomeScreen] Kullanıcı', userId, 'için bulunan liste sayısı:', userListsSnap.docs.length);

              const userPlaces = [];

              // Her listeden mekanları çıkar
              for (const listDoc of userListsSnap.docs) {
                const listData = listDoc.data();

                if (listData.places && listData.places.length > 0) {
                  // Kullanıcı bilgilerini al
                  const userDocRef = firebaseDoc(db, 'users', userId);
                  const userDoc = await getDoc(userDocRef);
                  const userData = userDoc.data();

                  listData.places.forEach((place, index) => {
                    if (place && place.name) {
                      const placeItem = {
                        // Tutarlı ID oluştur - PlaceCard ile aynı mantık
                        id:
                          place.id ||
                          `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || place.latitude || 0}_${place.coordinate?.longitude || place.longitude || 0}_${userId}`,
                        name: place.name || 'İsimsiz Mekan',
                        address: place.address || 'Adres belirtilmemiş',
                        latitude: place.coordinate?.latitude || place.latitude,
                        longitude: place.coordinate?.longitude || place.longitude,
                        photos: place.userContent?.photos || place.photos || [],
                        rating: place.userContent?.rating || place.rating || 0,
                        note: place.userContent?.note || place.note || '',
                        userName:
                          `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                          'Bilinmeyen Kullanıcı',
                        userAvatar: userData?.avatar || '👤',
                        listName: listData.name,
                        listId: listDoc.id,
                        userId,
                        createdAt: listData.createdAt || new Date(),
                        isFollowingPost: userId !== user.uid,
                        showMap: true,
                        mapCondition: true,
                      };
                      userPlaces.push(placeItem);
                      // console.log('✅ [HomeScreen] Takip edilen kullanıcının mekanı eklendi:', placeItem.name);
                    }
                  });
                }
              }

              // console.log('� [HomeScreen] Kullanıcı', userId, 'için toplam eklenen mekan:', userPlaces.length);
              return userPlaces;
            } catch (error) {
              console.error(
                '❌ [HomeScreen] Kullanıcı mekanları alınırken hata:',
                userId,
                error.message
              );
              return [];
            }
          });

          const allUserPlaces = await Promise.all(userPlacePromises);
          const flattenedPlaces = allUserPlaces.flat();
          // console.log('🔍 [HomeScreen] Tüm kullanıcılardan toplanan mekan sayısı:', flattenedPlaces.length);

          // Tekrarları kaldır - aynı koordinat ve isimde olan mekanları filtreleyebilirsin
          const uniquePlaces = [];
          const seenPlaces = new Set();

          flattenedPlaces.forEach((place) => {
            const placeKey = `${place.name}_${place.latitude}_${place.longitude}_${place.userId}`;
            if (!seenPlaces.has(placeKey)) {
              seenPlaces.add(placeKey);
              uniquePlaces.push(place);
            }
          });

          // console.log('🔍 [HomeScreen] Tekrarları kaldırıldıktan sonra mekan sayısı:', uniquePlaces.length);

          // Tarih sıralama
          loadedPosts = uniquePlaces
            .sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
              return timeB - timeA;
            })
            .slice(0, 25);

          // console.log('🔍 [HomeScreen] Sıralanmış ve sınırlandırılmış mekan sayısı:', loadedPosts.length);
        } catch (error) {
          console.error('❌ [HomeScreen] Takip ettiklerim modunda hata:', error.message);
          loadedPosts = [];
        }
      } else if (sortType === 'lists') {
        console.log('📋 [HomeScreen] ========== LİSTELERİM MODU ==========');
        try {
          // Kullanıcının kendi listelerini ve davet edildiği ortak listeleri al
          const userOwnLists = await getUserOwnLists(user.uid);
          let collaborativeLists = await CollaborativeListService.getUserCollaborativeLists(
            user.uid
          );

          // Ortak listeler için senkronize verileri yükle
          if (collaborativeLists.length > 0) {
            console.log('📊 [HomeScreen] Syncing collaborative list counts...');
            collaborativeLists = await Promise.all(
              collaborativeLists.map(async (list) => {
                try {
                  const syncedList = await CollaborativeListService.getListWithSyncedCounts(
                    list.id
                  );
                  return syncedList;
                } catch (error) {
                  console.warn('⚠️ [HomeScreen] Error syncing list:', list.id, error.message);
                  return list; // Fallback to original data
                }
              })
            );
          }

          console.log('📋 [HomeScreen] Kendi listeler:', userOwnLists.length);
          console.log('📋 [HomeScreen] Ortak listeler:', collaborativeLists.length);

          const allLists = [...userOwnLists, ...collaborativeLists];
          console.log('📋 [HomeScreen] Bulunan toplam liste sayısı:', allLists.length);

          if (allLists.length === 0) {
            console.log('📋 [HomeScreen] Hiç liste bulunamadı!');
            loadedPosts = [];
          } else {
            const allMyPlaces = [];

            // Her listeden mekanları çıkar
            for (const listData of allLists) {
              const isMyOwnList = listData.userId === user.uid;
              const { isCollaborative } = listData;
              console.log(
                '📋 [HomeScreen] Liste işleniyor:',
                listData.name,
                '(Kendi liste:',
                isMyOwnList,
                ', Ortak:',
                isCollaborative,
                ')'
              );

              if (listData.places && listData.places.length > 0) {
                // Liste sahibinin bilgilerini al
                const ownerDocRef = firebaseDoc(db, 'users', listData.userId);
                const ownerDoc = await getDoc(ownerDocRef);
                const ownerData = ownerDoc.data();

                listData.places.forEach((place, index) => {
                  if (place && place.name) {
                    // Kullanıcı rengini colorAssignments'tan al
                    const addedByUserId =
                      place.userContent?.addedBy || place.addedBy || listData.userId;
                    const userColor = listData.colorAssignments?.[addedByUserId] || '#FF6B6B';

                    const placeItem = {
                      // Tutarlı ID oluştur - PlaceCard ile aynı mantık
                      id:
                        place.id ||
                        `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || place.latitude || 0}_${place.coordinate?.longitude || place.longitude || 0}_${listData.userId}`,
                      name: place.name || 'İsimsiz Mekan',
                      address: place.address || 'Adres belirtilmemiş',
                      latitude: place.coordinate?.latitude || place.latitude,
                      longitude: place.coordinate?.longitude || place.longitude,
                      photos: place.userContent?.photos || place.photos || [],
                      rating: place.userContent?.rating || place.rating || 0,
                      note: place.userContent?.note || place.note || '',
                      userName: isMyOwnList
                        ? `${ownerData?.firstName || ''} ${ownerData?.lastName || ''}`.trim() ||
                          'Benim Listelerim'
                        : `${ownerData?.firstName || ''} ${ownerData?.lastName || ''}`.trim() ||
                          'İsim belirtilmemiş',
                      userAvatar: ownerData?.avatar || '👤',
                      listName: listData.name,
                      listId: listData.id,
                      userId: listData.userId, // Liste sahibinin ID'si
                      isCollaborative,
                      userColor, // colorAssignments'tan alınan kullanıcı rengi
                      createdAt: listData.createdAt || new Date(),
                      isMyList: isMyOwnList,
                      showMap: true,
                      mapCondition: true,
                    };
                    allMyPlaces.push(placeItem);
                    console.log(
                      '✅ [HomeScreen] Listeden mekan eklendi:',
                      placeItem.name,
                      'Liste:',
                      listData.name,
                      'Sahibi:',
                      isMyOwnList ? 'Ben' : 'İşbirlikçi'
                    );
                  }
                });
              }
            }

            console.log('📋 [HomeScreen] Toplam bulunan mekan sayısı:', allMyPlaces.length);

            // Tekrarları kaldır ve tarihe göre sırala
            const uniquePlaces = [];
            const seenPlaces = new Set();

            allMyPlaces.forEach((place) => {
              const placeKey = `${place.name}_${place.latitude}_${place.longitude}`;
              if (!seenPlaces.has(placeKey)) {
                seenPlaces.add(placeKey);
                uniquePlaces.push(place);
              }
            });

            loadedPosts = uniquePlaces
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
                return timeB - timeA;
              })
              .slice(0, 30);

            console.log(
              '📋 [HomeScreen] Tekrarları kaldırılmış ve sıralanmış mekan sayısı:',
              loadedPosts.length
            );
          }
        } catch (error) {
          console.error('❌ [HomeScreen] Listelerim modunda hata:', error.message);
          loadedPosts = [];
        }
      } else {
        console.log('🌍 [HomeScreen] ========== TÜMÜ MODU ==========');
        try {
          // Tüm kullanıcıların listelerinden mekanları getir
          const allListsQuery = query(
            collection(db, 'lists'),
            limit(20) // Performans için daha düşük limit
          );
          console.log('🌍 [HomeScreen] Tüm listeler sorgulanıyor...');
          const allListsSnap = await getDocs(allListsQuery);
          console.log(
            '🌍 [HomeScreen] Veritabanında bulunan toplam liste sayısı:',
            allListsSnap.docs.length
          );

          const allPublicPlaces = [];

          // Her listeden mekanları çıkar
          for (const listDoc of allListsSnap.docs) {
            const listData = listDoc.data();

            // Sadece public listeleri göster
            if (listData.privacy === 'public' || !listData.privacy) {
              console.log('🌍 [HomeScreen] Public liste işleniyor:', listData.name);

              if (listData.places && listData.places.length > 0) {
                try {
                  // Liste sahibinin bilgilerini al
                  const userDocRef = firebaseDoc(db, 'users', listData.userId);
                  const userDoc = await getDoc(userDocRef);
                  const userData = userDoc.data();

                  listData.places.forEach((place, index) => {
                    if (place && place.name) {
                      const placeItem = {
                        id: `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || place.latitude || 0}_${place.coordinate?.longitude || place.longitude || 0}_${listData.userId}`,
                        name: place.name || 'İsimsiz Mekan',
                        address: place.address || 'Adres belirtilmemiş',
                        latitude: place.coordinate?.latitude || place.latitude,
                        longitude: place.coordinate?.longitude || place.longitude,
                        photos: place.userContent?.photos || place.photos || [],
                        rating: place.userContent?.rating || place.rating || 0,
                        note: place.userContent?.note || place.note || '',
                        userName:
                          `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                          'Bilinmeyen Kullanıcı',
                        userAvatar: userData?.avatar || '👤',
                        listName: listData.name,
                        listId: listDoc.id,
                        userId: listData.userId,
                        createdAt: listData.createdAt || new Date(),
                        isPublicPost: true,
                        showMap: true,
                        mapCondition: true,
                      };
                      allPublicPlaces.push(placeItem);
                      console.log(
                        '✅ [HomeScreen] Public mekan eklendi:',
                        placeItem.name,
                        'Liste:',
                        listData.name
                      );
                    }
                  });
                } catch (userError) {
                  console.warn(
                    '⚠️ [HomeScreen] Public liste kullanıcı verisi hatası:',
                    userError.message
                  );
                  // Kullanıcı verisi olmasa da mekanları ekle
                  listData.places.forEach((place, index) => {
                    if (place && place.name) {
                      const placeItem = {
                        id: `${String(place.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}_${place.coordinate?.latitude || place.latitude || 0}_${place.coordinate?.longitude || place.longitude || 0}_${listData.userId}`,
                        name: place.name || 'İsimsiz Mekan',
                        address: place.address || 'Adres belirtilmemiş',
                        latitude: place.coordinate?.latitude || place.latitude,
                        longitude: place.coordinate?.longitude || place.longitude,
                        photos: place.userContent?.photos || place.photos || [],
                        rating: place.userContent?.rating || place.rating || 0,
                        note: place.userContent?.note || place.note || '',
                        userName: 'Bilinmeyen Kullanıcı',
                        userAvatar: '👤',
                        listName: listData.name,
                        listId: listDoc.id,
                        userId: listData.userId,
                        createdAt: listData.createdAt || new Date(),
                        isPublicPost: true,
                        showMap: true,
                        mapCondition: true,
                      };
                      allPublicPlaces.push(placeItem);
                    }
                  });
                }
              }
            } else {
              console.log('🔒 [HomeScreen] Private liste atlandı:', listData.name);
            }
          }

          console.log('🌍 [HomeScreen] Toplam bulunan public mekan:', allPublicPlaces.length);

          // Tekrarları kaldır ve tarih sıralaması
          const uniquePlaces = [];
          const seenPlaces = new Set();

          allPublicPlaces.forEach((place) => {
            const placeKey = `${place.name}_${place.latitude}_${place.longitude}`;
            if (!seenPlaces.has(placeKey)) {
              seenPlaces.add(placeKey);
              uniquePlaces.push(place);
            }
          });

          // Tarih sıralama ve limit
          loadedPosts = uniquePlaces
            .sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
              return timeB - timeA;
            })
            .slice(0, 30);

          console.log(
            '🌍 [HomeScreen] Sıralanmış ve sınırlandırılmış public mekan sayısı:',
            loadedPosts.length
          );
        } catch (error) {
          console.error('❌ [HomeScreen] Tümü modunda hata:', error.message);
          loadedPosts = [];
        }
      }

      console.log('🏠 [HomeScreen] ========== SON SONUÇ ==========');
      console.log('🏠 [HomeScreen] Toplam yüklenecek paylaşım sayısı:', loadedPosts.length);

      // Post'ları set et
      setPosts(loadedPosts);
      console.log("🏠 [HomeScreen] Paylaşımlar state'e set edildi");
    } catch (error) {
      console.error('❌ [HomeScreen] GENEL HATA - Post yükleme hatası:', error);
      console.error('❌ [HomeScreen] Hata detayları:', error.message);
      console.error('❌ [HomeScreen] Stack trace:', error.stack);

      // Boş state göster
      setPosts([]);
    } finally {
      console.log('🏠 [HomeScreen] Loading durumu kapatılıyor...');
      setLoading(false);
      console.log('🏠 [HomeScreen] =================== LOAD POSTS BİTTİ ===================');
    }
  }, [sortType]); // useCallback dependency array

  // FlatList optimized callbacks
  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 400, // Ortalama PlaceCard yüksekliği
      offset: 400 * index,
      index,
    }),
    []
  );

  // PlaceCard callback functions
  const handleViewList = useCallback(async (placeOrList) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Eğer doğrudan liste objesi geldiyse (SearchModal'dan)
      if (placeOrList.places && placeOrList.name && !placeOrList.listId) {
        console.log("📋 [HomeScreen] SearchModal'dan liste görüntüleme:", placeOrList.name);
        setSelectedList(placeOrList);
        setViewListModalVisible(true);
        return;
      }

      // Eğer place objesi geldiyse (PlaceCard'dan)
      if (placeOrList.listId) {
        console.log(
          "📋 [HomeScreen] PlaceCard'dan liste görüntüleme:",
          placeOrList.listName,
          'ID:',
          placeOrList.listId
        );
        const listDoc = await getDoc(firebaseDoc(db, 'lists', placeOrList.listId));
        if (listDoc.exists()) {
          const listData = { id: listDoc.id, ...listDoc.data() };
          setSelectedList(listData);
          setViewListModalVisible(true);
        } else {
          Alert.alert('Hata', 'Liste bulunamadı.');
        }
      }
    } catch (error) {
      console.error('❌ [HomeScreen] Liste görüntüleme hatası:', error);
      Alert.alert('Hata', 'Liste açılırken bir sorun oluştu.');
    }
  }, []);

  const handleEditPlace = useCallback((place) => {
    console.log('✏️ [HomeScreen] Mekan düzenleme:', place.name);
    // Bu fonksiyon PlaceCard içinde zaten handle ediliyor
    // İleride burada ek işlemler yapılabilir
  }, []);

  const handleDeletePlace = useCallback(async (place) => {
    console.log('🗑️ [HomeScreen] Mekan silme:', place.name);
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
              // Liste güncelleme işlemi burada yapılacak
              console.log('🗑️ [HomeScreen] Mekan siliniyor:', place.name);
              // Refresh trigger to reload the posts
              setRefreshTrigger((prev) => prev + 1);
            } catch (error) {
              console.error('❌ [HomeScreen] Mekan silme hatası:', error);
              Alert.alert('Hata', 'Mekan silinirken bir sorun oluştu.');
            }
          },
        },
      ]
    );
  }, []);

  const handleAddToList = useCallback((place) => {
    console.log('⭐ [HomeScreen] Favori ekleme:', place.name);
    // Bu butonu star/favorite olarak kullanabiliriz
    // İleride favoriler özelliği eklenebilir
    Alert.alert('Bilgi', 'Favori özelliği yakında eklenecek!');
  }, []);

  const renderItem = useCallback(
    ({ item: post }) => {
      const user = auth.currentUser;
      const isMyPlace = user && post.userId === user.uid;

      return (
        <PlaceCard
          place={post}
          refreshTrigger={refreshTrigger}
          onFocus={() => {}}
          showFocusButton={true}
          onViewList={post.listId ? handleViewList : null}
          onEdit={isMyPlace ? handleEditPlace : null}
          onDelete={isMyPlace ? handleDeletePlace : null}
          onAddToList={!isMyPlace ? handleAddToList : null}
          navigation={navigation}
        />
      );
    },
    [
      refreshTrigger,
      handleViewList,
      handleEditPlace,
      handleDeletePlace,
      handleAddToList,
      navigation,
    ]
  );

  const loadNotificationCount = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(firebaseDoc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const count = userData.unreadNotifications || 0;
        setUnreadNotificationCount(Math.max(0, count));
      }
    } catch (error) {
      // Offline durumunda sessizce geç
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log('📱 [HomeScreen] Offline mode - keeping current notification count');
      } else {
        console.error('❌ [HomeScreen] Error loading notification count:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadNotificationCount();

    // Global state listeners
    const handleUnreadCountUpdate = (count) => {
      console.log('🔄 [HomeScreen] Received unread count update from GlobalState:', count);
      setUnreadNotificationCount(count);
    };

    const handleHomeRefresh = (trigger) => {
      console.log('🔄 [HomeScreen] Received refresh trigger from GlobalState');
      setRefreshTrigger(trigger);
    };

    // Subscribe to global state changes
    GlobalStateService.on('unreadCountUpdated', handleUnreadCountUpdate);
    GlobalStateService.on('refresh_home', handleHomeRefresh);

    // Real-time notification count listener
    const user = auth.currentUser;
    if (user) {
      const userDocRef = firebaseDoc(db, 'users', user.uid);
      const unsubscribeNotificationCount = onSnapshot(
        userDocRef,
        (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            const count = userData.unreadNotifications || 0;
            setUnreadNotificationCount(Math.max(0, count));
            console.log('🔔 [HomeScreen] Real-time notification count updated:', count);
          }
        },
        (error) => {
          // Offline durumunda sessizce geç
          if (error.code === 'unavailable' || error.message.includes('offline')) {
            console.log('📱 [HomeScreen] Offline mode - using cached notification count');
          } else if (
            error.message?.includes('WebChannelConnection') ||
            error.message?.includes('transport errored') ||
            error.code === 'failed-precondition'
          ) {
            console.log('🔄 [HomeScreen] WebChannel connection error - will retry automatically');
          } else {
            console.error('❌ [HomeScreen] Real-time notification count error:', error);
          }
        }
      );

      // Email verification check
      if (!user.emailVerified) {
        setShowEmailVerificationBanner(true);
      }

      return () => {
        unsubscribeNotificationCount();
        // Clean up global state listeners
        GlobalStateService.off('unreadCountUpdated', handleUnreadCountUpdate);
        GlobalStateService.off('refresh_home', handleHomeRefresh);
      };
    }
  }, [sortType, loadPosts, loadNotificationCount]);

  // Screen focus olduğunda bildirim sayısını güncelle
  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      loadNotificationCount();
    });

    return unsubscribe;
  }, [navigation, loadNotificationCount]);

  const cleanupTestPosts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get all posts by current user
      const userPostsQuery = query(collection(db, 'posts'), where('userId', '==', user.uid));
      const userPostsSnap = await getDocs(userPostsQuery);

      // Delete test posts (posts with test content)
      const deletePromises = userPostsSnap.docs
        .filter((doc) => {
          const data = doc.data();
          return (
            data.content?.includes('Test') ||
            data.placeName?.includes('Test') ||
            data.address?.includes('Test')
          );
        })
        .map((doc) => deleteDoc(doc.ref));

      await Promise.all(deletePromises);

      // Reload posts
      loadPosts();
    } catch (error) {
      console.error('❌ Error cleaning up test posts:', error);
    }
  };

  // Cleanup test posts on component mount
  useEffect(() => {
    cleanupTestPosts();
  }, []);

  const onRefresh = async () => {
    console.log('🔄 [HomeScreen] Manual refresh triggered');

    // Record refresh activity
    await ActivityService.recordActivity({
      action: 'home_screen_refreshed',
      data: {
        sortType,
        timestamp: new Date().toISOString(),
      },
    });

    setRefreshing(true);
    await loadPosts();
    // Use hook for refresh trigger
    realtimeSync.forceRefresh();
    setRefreshing(false);

    console.log('✅ [HomeScreen] Manual refresh completed');
  };

  const handleNotificationsPress = () => {
    setUnreadNotificationCount(0); // Sayacı hemen sıfırla
    navigation.navigate('Notifications');
  };

  const handleSearchPress = () => {
    setSearchModalVisible(true);
  };

  const handleSendVerificationEmail = async () => {
    try {
      await AuthService.sendEmailVerification();
      Alert.alert(
        '✅ E-posta Gönderildi',
        'Doğrulama e-postası gönderildi. E-posta kutunuzu kontrol edin.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      Alert.alert('❌ Hata', 'E-posta gönderilemedi. Tekrar deneyin.');
    }
  };

  const dismissVerificationBanner = () => {
    setShowEmailVerificationBanner(false);
  };

  const handleSortChange = async (newSortType) => {
    console.log('📊 [HomeScreen] Tab changed from', sortType, 'to', newSortType);

    // Record tab change activity
    await ActivityService.recordActivity({
      action: 'home_tab_changed',
      data: {
        previousTab: sortType,
        newTab: newSortType,
        timestamp: new Date().toISOString(),
      },
    });

    setSortType(newSortType);
    setLoading(true);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Bilinmiyor';

    const now = new Date();
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} saat önce`;
    return `${Math.floor(diffInMinutes / 1440)} gün önce`;
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name={
          sortType === 'following' ? 'people' : sortType === 'lists' ? 'location-on' : 'explore'
        }
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        {sortType === 'following'
          ? 'Henüz Takip Edilen Mekan Yok'
          : sortType === 'lists'
            ? 'Listelerinde Mekan Yok'
            : 'Henüz Mekan Yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {sortType === 'following'
          ? 'Takip ettiğin kişilerin henüz listelerinde mekan yok. Yeni kişileri keşfetmek için arama yapabilirsin!'
          : sortType === 'lists'
            ? 'Listelerinde henüz mekan yok. Harita üzerinden yeni mekanlar keşfet ve listelerine ekle!'
            : 'Henüz hiç public mekan paylaşımı yok. Keşfet sekmesinden mekanları incele!'}
      </Text>

      {/* Action Buttons */}
      <View style={styles.emptyActions}>
        {sortType === 'lists' ? (
          <>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('MapScreen')}
            >
              <MaterialIcons name="add-location" size={20} color="#fff" />
              <Text style={styles.primaryActionText}>İlk Listeni Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate('MapScreen')}
            >
              <MaterialIcons name="explore" size={20} color={colors.primary} />
              <Text style={styles.secondaryActionText}>Haritayı Keşfet</Text>
            </TouchableOpacity>
          </>
        ) : sortType === 'following' ? (
          <TouchableOpacity style={styles.primaryActionButton} onPress={handleSearchPress}>
            <MaterialIcons name="person-add" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Kişi Ara ve Takip Et</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('MapScreen')}
          >
            <MaterialIcons name="explore" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Haritayı Keşfet</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppStatusBar />
      {/* Header */}
      <SoRitaHeader
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleSearchPress}>
              <MaterialIcons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotificationsPress}>
              <View style={styles.notificationButtonContainer}>
                <MaterialIcons name="notifications-none" size={24} color={colors.textPrimary} />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Email Verification Banner */}
      {showEmailVerificationBanner && (
        <View style={styles.verificationBanner}>
          <View style={styles.verificationContent}>
            <MaterialIcons name="warning" size={20} color="#FF9500" />
            <Text style={styles.verificationText}>E-posta adresinizi doğrulayın</Text>
          </View>
          <View style={styles.verificationActions}>
            <TouchableOpacity
              style={styles.verificationButton}
              onPress={handleSendVerificationEmail}
            >
              <Text style={styles.verificationButtonText}>Gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={dismissVerificationBanner}>
              <MaterialIcons name="close" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sort Tabs */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortTab, sortType === 'following' && styles.activeSortTab]}
          onPress={() => handleSortChange('following')}
        >
          <Text style={[styles.sortText, sortType === 'following' && styles.activeSortText]}>
            Takip Ettiklerim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortTab, sortType === 'lists' && styles.activeSortTab]}
          onPress={() => handleSortChange('lists')}
        >
          <Text style={[styles.sortText, sortType === 'lists' && styles.activeSortText]}>
            Listelerim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortTab, sortType === 'all' && styles.activeSortTab]}
          onPress={() => handleSortChange('all')}
        >
          <Text style={[styles.sortText, sortType === 'all' && styles.activeSortText]}>Tümü</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Paylaşımlar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          style={styles.feed}
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={3}
          updateCellsBatchingPeriod={100}
          getItemLayout={getItemLayout}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Floating Action Button for Lists Tab */}
      {sortType === 'lists' && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MapScreen')}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        navigation={navigation}
        onListSelect={handleViewList}
      />

      {/* View List Modal */}
      {selectedList && (
        <ViewListModal
          visible={viewListModalVisible}
          onClose={() => {
            setViewListModalVisible(false);
            setSelectedList(null);
          }}
          listData={selectedList}
          navigation={navigation}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Slightly gray background to make cards stand out
    paddingTop: 0, // StatusBar için yer
  },
  sortContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  sortTab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: 15,
  },
  activeSortTab: {
    borderBottomColor: colors.primary,
  },
  sortText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeSortText: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  feed: {
    flex: 1,
    paddingBottom: 20,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
  notificationButtonContainer: {
    position: 'relative',
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -2,
    top: -2,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Email verification banner styles
  verificationBanner: {
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderBottomColor: '#FFD700',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verificationContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  verificationText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  verificationActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  verificationButton: {
    backgroundColor: '#FF9500',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verificationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  // Empty state action styles
  emptyActions: {
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minWidth: 200,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minWidth: 200,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Floating Action Button
  fab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    bottom: 30,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    width: 56,
  },
});
