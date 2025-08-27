import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import StorageService from '../services/storageService';
import PlaceCard from './PlaceCard';

export default function EditMapModal({ 
  visible, 
  onClose, 
  listData 
}) {
  const [editListPlaces, setEditListPlaces] = useState([]);
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [placesCollapsed, setPlacesCollapsed] = useState(false);
  
  const mapRef = useRef(null);

  useEffect(() => {
    if (visible && listData) {
      console.log('🗺️ [EditMapModal] Modal opened for list:', listData.name);
      initializeEditMode();
    }
  }, [visible, listData]);

  const initializeEditMode = async () => {
    console.log('🔧 [EditMapModal] Initializing edit mode...');
    console.log('📋 [EditMapModal] ListData:', listData);
    console.log('📍 [EditMapModal] Places data:', listData.places);
    
    // Set places
    if (listData.places && listData.places.length > 0) {
      // Initialize places with userContent if missing
      const initializedPlaces = listData.places.map(place => {
        console.log(`🔍 [EditMapModal] Original place data for ${place.name}:`, place);
        
        // If place doesn't have userContent, create empty one
        if (!place.userContent) {
          console.log(`🔄 [EditMapModal] Initializing userContent for place: ${place.name}`);
          const newPlace = {
            ...place,
            userContent: {
              note: place.note || '',
              rating: place.rating || 0,
              photos: place.photos || [],
              addedAt: place.addedAt || new Date(),
              addedBy: place.addedBy || auth.currentUser?.uid
            }
          };
          console.log(`✅ [EditMapModal] New place data for ${place.name}:`, newPlace);
          return newPlace;
        }
        console.log(`📋 [EditMapModal] Place ${place.name} already has userContent:`, place.userContent);
        return place;
      });
      
      console.log('✅ [EditMapModal] Setting places:', initializedPlaces.length);
      console.log('🔍 [EditMapModal] All initialized places:', initializedPlaces);
      setEditListPlaces(initializedPlaces);
      
      // Get location after setting places
      await getLocationPermission();
    } else {
      console.log('⚠️ [EditMapModal] No places found in listData');
      setEditListPlaces([]);
      
      // Get location even if no places
      await getLocationPermission();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeEditMode();
    setRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  };

  const getLocationPermission = async () => {
    try {
      console.log('📍 [EditMapModal] Requesting location permission...');
      
      // İlk önce mekanlar varsa onların koordinatlarını kullan
      if (editListPlaces.length > 0) {
        const firstValidPlace = editListPlaces.find(place => {
          const lat = place.coordinate?.latitude || place.latitude;
          const lng = place.coordinate?.longitude || place.longitude;
          return lat && lng;
        });
        
        if (firstValidPlace) {
          const lat = firstValidPlace.coordinate?.latitude || firstValidPlace.latitude;
          const lng = firstValidPlace.coordinate?.longitude || firstValidPlace.longitude;
          
          const region = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          
          console.log('✅ [EditMapModal] Using place location:', region);
          setLocation(region);
          return;
        }
      }
      
      // Konum izni iste
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('⚠️ [EditMapModal] Location permission denied, using default location');
        // İzin reddedildiyse varsayılan konum kullan (İstanbul)
        const defaultRegion = {
          latitude: 41.0082,
          longitude: 28.9784,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setLocation(defaultRegion);
        return;
      }

      console.log('📍 [EditMapModal] Getting current location...');
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      
      console.log('✅ [EditMapModal] Location set:', region);
      setLocation(region);
    } catch (error) {
      console.error('❌ [EditMapModal] Location error:', error);
      // Hata durumunda varsayılan konum kullan
      const defaultRegion = {
        latitude: 41.0082, // İstanbul
        longitude: 28.9784,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      console.log('🔧 [EditMapModal] Using default location due to error');
      setLocation(defaultRegion);
    }
  };

  const focusOnPlaces = () => {
    if (editListPlaces.length > 0 && mapRef.current) {
      console.log('🎯 [EditMapModal] Focusing on places...');
      
      const coordinates = editListPlaces.map(place => {
        const latitude = place.coordinate?.latitude || place.latitude;
        const longitude = place.coordinate?.longitude || place.longitude;
        return { latitude, longitude };
      }).filter(coord => coord.latitude && coord.longitude);

      console.log('📍 [EditMapModal] Valid coordinates:', coordinates);

      setTimeout(() => {
        if (coordinates.length === 1) {
          mapRef.current?.animateToRegion({
            latitude: coordinates[0].latitude,
            longitude: coordinates[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        } else if (coordinates.length > 1) {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }, 500);
    }
  };

  const handleRemovePlace = (placeToRemove) => {
    Alert.alert(
      'Mekan Kaldır',
      `"${placeToRemove.name}" mekanını listeden kaldırmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            const updatedPlaces = editListPlaces.filter(place => place.id !== placeToRemove.id);
            setEditListPlaces(updatedPlaces);
          }
        }
      ]
    );
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      console.log('💾 [EditMapModal] Saving changes for list:', listData.id);
      console.log('📋 [EditMapModal] Current editListPlaces:', editListPlaces);

      // Process places and upload photos
      const processedPlaces = await Promise.all(
        editListPlaces.map(async (place) => {
          if (place.userContent?.photos?.length > 0) {
            const uploadedPhotoUrls = [];
            
            for (const photo of place.userContent.photos) {
              if (typeof photo === 'string' && photo.startsWith('file://')) {
                try {
                  console.log('📸 [EditMapModal] Uploading photo for place:', place.name);
                  const downloadUrl = await StorageService.uploadImage(photo, `lists/${listData.id}/places/${place.name}/photos`);
                  uploadedPhotoUrls.push(downloadUrl);
                  console.log('✅ [EditMapModal] Photo uploaded:', downloadUrl);
                } catch (uploadError) {
                  console.error('❌ [EditMapModal] Photo upload error:', uploadError);
                  uploadedPhotoUrls.push(photo);
                }
              } else {
                uploadedPhotoUrls.push(photo);
              }
            }
            
            return {
              ...place,
              userContent: place.userContent ? {
                ...place.userContent,
                photos: uploadedPhotoUrls,
                updatedAt: new Date()
              } : undefined
            };
          }
          
          return {
            ...place,
            userContent: place.userContent ? {
              ...place.userContent,
              updatedAt: new Date()
            } : undefined
          };
        })
      );

      console.log('🔄 [EditMapModal] Processed places:', processedPlaces);

      const listRef = doc(db, 'lists', listData.id);
      await updateDoc(listRef, {
        places: processedPlaces,
        placesCount: processedPlaces.length,
        updatedAt: new Date()
      });

      console.log('✅ [EditMapModal] List updated successfully in Firestore');
      Alert.alert('Başarılı', 'Liste güncellendi!', [
        { text: 'Tamam', onPress: onClose }
      ]);
    } catch (error) {
      console.error('❌ [EditMapModal] Save error:', error);
      Alert.alert('Hata', 'Liste kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {listData?.name || 'Liste Düzenle'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={saveChanges}
            style={styles.saveButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Map */}
          <View style={[
            styles.mapContainer, 
            placesCollapsed && styles.mapContainerExpanded
          ]}>
            {location ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={location}
                onMapReady={() => {
                  setMapReady(true);
                  focusOnPlaces();
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {editListPlaces.map((place, index) => {
                  // Koordinat kontrolü
                  const latitude = place.coordinate?.latitude || place.latitude;
                  const longitude = place.coordinate?.longitude || place.longitude;
                  
                  if (!latitude || !longitude) {
                    console.warn('⚠️ [EditMapModal] Invalid coordinates for place:', place.name);
                    return null;
                  }

                  // Kullanıcı rengini al - sadece collaborative listeler için
                  const addedByUserId = place.userContent?.addedBy || place.addedBy || listData?.userId;
                  const isCollaborative = listData?.isCollaborative || false;
                  const userColor = isCollaborative ? (listData?.colorAssignments?.[addedByUserId] || '#FF6B6B') : '#FF6B6B';
                  
                  console.log('🗺️ [EditMapModal] Marker rengi:', {
                    placeName: place.name,
                    addedByUserId,
                    userColor
                  });

                  return (
                    <Marker
                      key={index}
                      coordinate={{
                        latitude: latitude,
                        longitude: longitude,
                      }}
                      title={place.name?.replace(/\n/g, ' ') || 'İsimsiz Mekan'}
                      description={place.address}
                    >
                      {isCollaborative ? (
                        <View style={[styles.listMarker, { backgroundColor: userColor }]}>
                          <Text style={styles.listMarkerEmoji}>📍</Text>
                        </View>
                      ) : (
                        <Text style={styles.simpleMarkerEmoji}>📍</Text>
                      )}
                    </Marker>
                  );
                })}
              </MapView>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Harita yükleniyor...</Text>
              </View>
            )}
          </View>

          {/* Places List */}
          <View style={[
            styles.placesContainer, 
            placesCollapsed && styles.placesContainerCollapsed
          ]}>
            <TouchableOpacity 
              style={styles.placesHeader}
              onPress={() => setPlacesCollapsed(!placesCollapsed)}
              activeOpacity={0.7}
            >
              <Text style={styles.placesTitle}>
                Mekanlar ({editListPlaces.length})
              </Text>
              <MaterialIcons 
                name={placesCollapsed ? "add" : "remove"} 
                size={24} 
                color={colors.text} 
              />
            </TouchableOpacity>

            {!placesCollapsed && (
              <ScrollView 
                style={styles.placesList} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              >
              {editListPlaces.length > 0 ? (
                editListPlaces.map((place, index) => {
                  // Güvenlik kontrolü
                  if (!listData) return null;
                  
                  // Kullanıcı bilgilerini al
                  const addedByUserId = place.userContent?.addedBy || place.addedBy || listData?.userId;
                  const isCollaborative = listData?.isCollaborative || false;
                  const userColor = isCollaborative ? (listData?.colorAssignments?.[addedByUserId] || '#FF6B6B') : null;
                  const collaboratorDetails = listData?.collaboratorDetails?.[addedByUserId];
                  
                  console.log('🎨 [EditMapModal] Renk bilgisi:', {
                    placeName: place.name,
                    addedByUserId,
                    userColor,
                    isCollaborative,
                    colorAssignments: listData?.colorAssignments,
                    currentUserId: auth.currentUser?.uid
                  });
                  
                  // Kullanıcı bilgilerini hazırla - sadece collaborative listelerde
                  const userData = isCollaborative && collaboratorDetails ? {
                    id: addedByUserId,
                    firstName: collaboratorDetails.firstName || '',
                    lastName: collaboratorDetails.lastName || '',
                    displayName: collaboratorDetails.displayName || `${collaboratorDetails.firstName || ''} ${collaboratorDetails.lastName || ''}`.trim() || collaboratorDetails.email?.split('@')[0] || 'Kullanıcı',
                    avatar: collaboratorDetails.avatar || '👤',
                    username: collaboratorDetails.username || collaboratorDetails.email?.split('@')[0] || '',
                    email: collaboratorDetails.email || '',
                    color: userColor
                  } : null; // collaboratorDetails yoksa null geç, PlaceCard kendi çeksin
                  
                  // Prepare place data for PlaceCard
                  const placeForCard = {
                    ...place,
                    // Ensure coordinate structure is correct
                    latitude: place.coordinate?.latitude || place.latitude,
                    longitude: place.coordinate?.longitude || place.longitude,
                    // Flatten userContent for PlaceCard compatibility
                    note: place.userContent?.note || place.note || '',
                    rating: place.userContent?.rating || place.rating || 0,
                    photos: place.userContent?.photos || place.photos || [],
                    // Kullanıcı bilgilerini ekle
                    userId: addedByUserId, // PlaceCard'ın Firebase'den veri çekebilmesi için
                    userData: userData,
                    userColor: userColor,
                    showUserInfo: true // PlaceCard'a kullanıcı bilgilerini göstermesini söyle
                  };
                  
                  console.log('📋 [EditMapModal] PlaceForCard oluşturuldu:', {
                    name: placeForCard.name,
                    userColor: placeForCard.userColor,
                    userId: placeForCard.userId,
                    hasUserData: !!placeForCard.userData
                  });
                  
                  console.log('🎨 [EditMapModal] PlaceCard data:', {
                    placeName: place.name,
                    addedByUserId,
                    userColor,
                    colorAssignments: listData.colorAssignments
                  });
                  
                  return (
                    <PlaceCard
                      key={`${place.id}-${index}`}
                      place={placeForCard}
                      refreshTrigger={refreshTrigger}
                      showMap={false} // Harita bölümünü kaldır
                      isEvent={false}
                      showFocusButton={true}
                      onFocus={() => {
                        // Focus on this specific place on the main map
                        if (mapRef.current) {
                          const latitude = place.coordinate?.latitude || place.latitude;
                          const longitude = place.coordinate?.longitude || place.longitude;
                          
                          if (latitude && longitude) {
                            mapRef.current.animateToRegion({
                              latitude: latitude,
                              longitude: longitude,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01,
                            }, 1000);
                          }
                        }
                      }}
                      onEdit={(place) => {
                        // Handle place editing
                        Alert.alert('Bilgi', 'Mekan düzenleme özelliği yakında eklenecek.');
                      }}
                      onDelete={(place) => {
                        Alert.alert(
                          'Mekanı Sil',
                          'Bu mekanı listeden çıkarmak istediğinizden emin misiniz?',
                          [
                            { text: 'İptal', style: 'cancel' },
                            { 
                              text: 'Sil', 
                              style: 'destructive',
                              onPress: () => handleRemovePlace(place)
                            }
                          ]
                        );
                      }}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="location-off" size={48} color={colors.placeholder} />
                  <Text style={styles.emptyText}>Bu listede henüz mekan yok</Text>
                </View>
              )}
            </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  mapContainerExpanded: {
    flex: 2, // Places collapsed olduğunda harita daha büyük olur
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.text,
  },
  placesContainer: {
    height: 350, // Daha büyük yapıldı
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placesContainerCollapsed: {
    height: 50, // Sadece header görünsün
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    // Tıklanabilir olduğunu belirtmek için hafif gölge
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  placesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.placeholder,
    textAlign: 'center',
  },
  // Marker stilleri
  listMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listMarkerEmoji: {
    fontSize: 14,
    textAlign: 'center',
  },
  simpleMarkerEmoji: {
    fontSize: 20,
    textAlign: 'center',
  },
});
