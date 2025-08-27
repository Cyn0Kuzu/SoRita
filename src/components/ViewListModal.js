import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  ScrollView,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/theme';
import PlaceCard from './PlaceCard';
import CollaboratorsModal from './CollaboratorsModal';

const ViewListModal = ({ 
  visible, 
  onClose, 
  listData,
  navigation 
}) => {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listPlaces, setListPlaces] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [isTemporaryHidden, setIsTemporaryHidden] = useState(false);
  
  // Place detail modal states
  const [showPlaceDetailModal, setShowPlaceDetailModal] = useState(false);
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState(null);
  
  // Photo modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Collaborators modal states
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);

  useEffect(() => {
    if (visible && listData) {
      console.log('🗺️ [ViewListModal] Modal opened for list:', listData.name);
      setIsTemporaryHidden(false); // Reset temporary hidden state
      initializeViewMode();
    }
  }, [visible, listData]);

  // Listen for navigation focus to show modal again when returning
  useEffect(() => {
    if (!navigation) return;

    const unsubscribe = navigation.addListener('focus', () => {
      if (isTemporaryHidden) {
        console.log('🔄 [ViewListModal] Navigation focused, showing modal again');
        setIsTemporaryHidden(false);
      }
    });

    return unsubscribe;
  }, [navigation, isTemporaryHidden]);

  const initializeViewMode = async () => {
    console.log('🔧 [ViewListModal] Initializing view mode...');
    console.log('📋 [ViewListModal] ListData:', listData);
    console.log('📍 [ViewListModal] Places data:', listData.places);
    
    // Set places
    if (listData.places && listData.places.length > 0) {
      console.log('✅ [ViewListModal] Setting places:', listData.places.length);
      setListPlaces([...listData.places]);
    } else {
      console.log('⚠️ [ViewListModal] No places found in listData');
      setListPlaces([]);
    }

    // Get location
    await getLocationPermission();
  };

  const getLocationPermission = async () => {
    try {
      console.log('📍 [ViewListModal] Requesting location permissions...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDefaultLocation();
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (locationResult) {
        const coords = {
          latitude: locationResult.coords.latitude,
          longitude: locationResult.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        
        setLocation(coords);
        console.log('✅ [ViewListModal] Location set');
      }
    } catch (error) {
      console.log('⚠️ [ViewListModal] Location error:', error.message);
      setDefaultLocation();
    }
  };

  const setDefaultLocation = () => {
    const defaultCoords = {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
    setLocation(defaultCoords);
    console.log('🌍 [ViewListModal] Default location set');
  };

  const handlePlaceCardPress = (place) => {
    console.log('🔍 [ViewListModal] Place card pressed:', place.name);
    setSelectedPlaceDetail(place);
    setShowPlaceDetailModal(true);
  };

  // Handle add to list (star functionality)
  const handleAddToList = (place) => {
    console.log('⭐ [ViewListModal] Add to list pressed:', place.name);
    
    // Navigate to map screen to add this place to a list
    if (navigation) {
      // Temporarily hide this modal
      setIsTemporaryHidden(true);
      
      // Set the place data exactly as MapScreen expects
      const placeData = {
        name: place.name,
        address: place.address,
        coordinate: place.coordinate || { latitude: place.latitude, longitude: place.longitude },
        district: place.district,
        province: place.province,
        isEstablishment: place.isEstablishment || true,
        placeTypes: place.placeTypes || ["point_of_interest", "establishment"],
        userContent: place.userContent
      };
      
      console.log('🚀 [ViewListModal] Navigating to MapScreen with place data:', placeData);
      
      // Navigate to MapScreen with the correct parameter names
      navigation.navigate('Map', {
        selectedPlace4List: placeData,  // MapScreen expects this name
        fromViewList: true,             // MapScreen expects this name (not cameFromViewList)
        showAddToListModal: true
      });
    } else {
      Alert.alert('Listeye Ekle', `${place.name} seçildi. Listeye ekleme ekranına yönlendiriliyorsunuz.`);
    }
  };

  // Handle photo press
  const handlePhotoPress = (photo) => {
    console.log('📸 [ViewListModal] Photo pressed:', photo);
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const focusOnPlaces = () => {
    console.log('🎯 [ViewListModal] focusOnPlaces called', {
      hasMapRef: !!mapRef.current,
      placesCount: listPlaces.length,
      mapReady
    });
    
    if (mapRef.current && listPlaces.length > 0) {
      const coordinates = listPlaces
        .map(place => {
          const latitude = place.coordinate?.latitude || place.latitude;
          const longitude = place.coordinate?.longitude || place.longitude;
          
          if (latitude && longitude) {
            return { latitude, longitude };
          }
          return null;
        })
        .filter(coord => coord !== null);

      console.log('📍 [ViewListModal] Valid coordinates found:', coordinates.length);

      if (coordinates.length === 0) {
        console.log('⚠️ [ViewListModal] No valid coordinates found for focusing');
        return;
      }

      setTimeout(() => {
        if (!mapRef.current) {
          console.log('⚠️ [ViewListModal] MapRef lost during timeout');
          return;
        }
        
        if (coordinates.length === 1) {
          console.log('🎯 [ViewListModal] Focusing on single place');
          mapRef.current.animateToRegion({
            latitude: coordinates[0].latitude,
            longitude: coordinates[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        } else if (coordinates.length > 1) {
          console.log('🎯 [ViewListModal] Fitting multiple places');
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }, 500);
    } else {
      console.log('⚠️ [ViewListModal] Cannot focus - no mapRef or places', {
        hasMapRef: !!mapRef.current,
        placesCount: listPlaces.length
      });
    }
  };

  const handleFocusPlace = (place) => {
    const latitude = place.coordinate?.latitude || place.latitude;
    const longitude = place.coordinate?.longitude || place.longitude;
    
    if (!latitude || !longitude || !mapRef.current || !mapReady) {
      console.warn('⚠️ [ViewListModal] Cannot focus on place - missing coordinates or map not ready', {
        hasLatitude: !!latitude,
        hasLongitude: !!longitude,
        hasMapRef: !!mapRef.current,
        mapReady,
        placeName: place.name
      });
      return;
    }

    console.log('🎯 [ViewListModal] Focusing on place:', place.name);
    
    // Haritayı o mekana odakla
    mapRef.current.animateToRegion({
      latitude: latitude,
      longitude: longitude,
      latitudeDelta: 0.005, // Daha yakın zoom
      longitudeDelta: 0.005,
    }, 1000);
  };

  if (!visible || !listData) return null;

  return (
    <Modal
      visible={visible && !isTemporaryHidden}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#FF0000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{listData.name} - Görüntüle</Text>
          </View>
          
          {/* Ortak liste butonu */}
          {listData.isCollaborative && (
            <TouchableOpacity 
              onPress={() => setShowCollaboratorsModal(true)}
              style={styles.collaboratorsButton}
            >
              <MaterialIcons name="group" size={18} color="#007AFF" />
              <Text style={styles.collaboratorsButtonText}>Üyeler</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* Map */}
          <View style={styles.mapContainer}>
            {location ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={location}
                onMapReady={() => {
                  console.log('🗺️ [ViewListModal] Map ready, mapReady:', mapReady, 'listPlaces count:', listPlaces.length);
                  setMapReady(true);
                  // Add a small delay to ensure modal is fully rendered
                  setTimeout(() => {
                    focusOnPlaces();
                  }, 300);
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {listPlaces.map((place, index) => {
                  const latitude = place.coordinate?.latitude || place.latitude;
                  const longitude = place.coordinate?.longitude || place.longitude;
                  
                  if (!latitude || !longitude) {
                    console.log('⚠️ [ViewListModal] Invalid coordinates for place:', place.name);
                    return null;
                  }

                  return (
                    <Marker
                      key={`${place.id}-${index}`}
                      coordinate={{
                        latitude: latitude,
                        longitude: longitude,
                      }}
                      title={place.name}
                      description={place.address}
                      pinColor={colors.primary}
                    />
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
          <View style={styles.placesContainer}>
            <View style={styles.placesHeader}>
              <Text style={styles.placesTitle}>
                Mekanlar ({listPlaces.length})
              </Text>
            </View>

            <ScrollView 
              style={styles.placesList} 
              showsVerticalScrollIndicator={false}
            >
              {listPlaces.length > 0 ? (
                listPlaces.map((place, index) => {
                  // PlaceCard için veri formatını düzelt
                  const formattedPlace = {
                    ...place,
                    note: place.userContent?.note || '',
                    photos: place.userContent?.photos || [],
                    rating: place.userContent?.rating || 0,
                    latitude: place.coordinate?.latitude || place.latitude,
                    longitude: place.coordinate?.longitude || place.longitude
                  };
                  
                  return (
                    <PlaceCard
                      key={`${place.id}-${index}`}
                      place={formattedPlace}
                      onFocus={() => {
                        // Focus on this specific place on map
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
                      onPress={null} // Mekan kartları tıklanamaz
                      onAddToList={handleAddToList}
                      showFocusButton={true}
                      showMap={false} // Küçük harita gözükmesin
                      isEvent={false}
                      style={styles.modernPlaceCard}
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
          </View>
        </View>
      </SafeAreaView>

      {/* Place Detail Modal */}
      <Modal
        visible={showPlaceDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaceDetailModal(false)}
      >
        <View style={styles.placeDetailModalOverlay}>
          <TouchableOpacity 
            style={styles.placeDetailModalBackground}
            activeOpacity={1}
            onPress={() => setShowPlaceDetailModal(false)}
          />
          <View style={styles.placeDetailModalContainer}>
            <View style={styles.placeDetailModalHandle} />
            <View style={styles.placeDetailHeader}>
              <Text style={styles.placeDetailHeaderTitle} numberOfLines={2}>
                {selectedPlaceDetail?.name || 'Mekan Detayı'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPlaceDetailModal(false)}
                style={styles.placeDetailCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.placeDetailContent} showsVerticalScrollIndicator={false}>
              {selectedPlaceDetail?.address && (
                <View style={styles.placeDetailInfo}>
                  <Text style={styles.placeDetailAddress}>📍 {selectedPlaceDetail.address}</Text>
                </View>
              )}

              {/* User Content Details */}
              {selectedPlaceDetail?.userContent && (
                <View style={styles.placeDetailUserContent}>
                  {/* Rating */}
                  {selectedPlaceDetail.userContent.rating > 0 && (
                    <View style={styles.detailRatingContainer}>
                      <Text style={styles.detailSectionTitle}>Puanım</Text>
                      <View style={styles.horizontalRatingDisplay}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialIcons 
                            key={star}
                            name="star" 
                            size={20} 
                            color={star <= selectedPlaceDetail.userContent.rating ? "#F59E0B" : "#E5E7EB"} 
                          />
                        ))}
                        <Text style={styles.detailRatingText}>
                          {selectedPlaceDetail.userContent.rating}/5
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Note */}
                  {selectedPlaceDetail.userContent.note && selectedPlaceDetail.userContent.note.length > 0 && (
                    <View style={styles.detailNoteContainer}>
                      <Text style={styles.detailSectionTitle}>Notum</Text>
                      <Text style={styles.detailNoteText}>{selectedPlaceDetail.userContent.note}</Text>
                    </View>
                  )}

                  {/* Photos */}
                  {selectedPlaceDetail.userContent.photos && selectedPlaceDetail.userContent.photos.length > 0 && (
                    <View style={styles.detailPhotosContainer}>
                      <Text style={styles.detailSectionTitle}>
                        Fotoğraflarım ({selectedPlaceDetail.userContent.photos.length})
                      </Text>
                      <ScrollView 
                        horizontal 
                        style={styles.detailPhotosScroll}
                        showsHorizontalScrollIndicator={false}
                      >
                        {selectedPlaceDetail.userContent.photos.map((photo, photoIndex) => (
                          <TouchableOpacity
                            key={photoIndex}
                            style={styles.detailPhotoContainer}
                            onPress={() => handlePhotoPress(photo)}
                          >
                            <Image 
                              source={{ uri: photo }} 
                              style={styles.detailPhoto}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
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
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity 
            style={styles.photoModalBackground}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          />
          <TouchableOpacity 
            onPress={() => setShowPhotoModal(false)}
            style={styles.photoModalCloseButton}
          >
            <MaterialIcons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image 
              source={{ uri: selectedPhoto }} 
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Collaborators Modal */}
      {listData?.isCollaborative && (
        <CollaboratorsModal
          visible={showCollaboratorsModal}
          onClose={() => setShowCollaboratorsModal(false)}
          listId={listData?.id}
          listTitle={listData?.name}
          isOwner={listData?.userId === require('../config/firebase').auth.currentUser?.uid}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modernPlaceCard: {
    marginBottom: 18,
    backgroundColor: colors.white,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
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
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
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
    height: 250,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  placeIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#10B981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  placeAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  userContentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  saveButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  
  // User Content Bottom Section Styles
  userContentBottomSection: {
    height: 120,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  userContentScrollContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 16,
    height: 104,
  },
  notePreviewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    width: 200,
    marginRight: 12,
  },
  ratingPreviewCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    width: 140,
    marginRight: 12,
  },
  photosPreviewCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    width: 280,
    marginRight: 12,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  previewCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  previewCardContent: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  photoPreviewContainer: {
    marginTop: 8,
    height: 50,
  },
  photoPreviewScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 8,
  },
  singlePhotoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  photoPreviewImage: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  focusButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
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
  
  // New horizontal styles
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  placeMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  userContentSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  horizontalContentScroll: {
    marginTop: 8,
  },
  horizontalContentContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  horizontalNoteSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    width: 200,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  horizontalRatingSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    width: 140,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  horizontalPhotosSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    width: 240,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  horizontalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  horizontalSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  horizontalNoteText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  horizontalRatingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  horizontalRatingValue: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  horizontalPhotosContainer: {
    marginTop: 4,
  },
  horizontalPhotoItem: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  horizontalPhotoImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  
  // Place Detail Modal Styles
  placeDetailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  placeDetailModalBackground: {
    flex: 1,
  },
  placeDetailModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    minHeight: '40%',
    paddingBottom: 20,
  },
  placeDetailModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  placeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  placeDetailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  placeDetailCloseButton: {
    padding: 4,
  },
  placeDetailContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  placeDetailInfo: {
    marginBottom: 16,
  },
  placeDetailAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  placeDetailUserContent: {
    gap: 16,
  },
  detailRatingContainer: {
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  detailRatingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  detailNoteContainer: {
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  detailNoteText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  detailPhotosContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  detailPhotosScroll: {
    marginTop: 8,
  },
  detailPhotoContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailPhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  
  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 12,
  },
  photoModalImage: {
    width: '95%',
    height: '85%',
    backgroundColor: 'transparent',
  },
  collaboratorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  collaboratorsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ViewListModal;
