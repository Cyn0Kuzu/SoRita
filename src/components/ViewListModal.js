// @ts-nocheck
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

import { auth } from '../config/firebase';

import PlaceCard from './PlaceCard';
import CollaboratorsModal from './CollaboratorsModal';

const ViewListModal = ({ visible, onClose, listData, navigation }) => {
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
        placeTypes: place.placeTypes || ['point_of_interest', 'establishment'],
        userContent: place.userContent,
      };

      console.log('🚀 [ViewListModal] Navigating to MapScreen with place data:', placeData);

      // Navigate to MapScreen with the correct parameter names
      navigation.navigate('Map', {
        selectedPlace4List: placeData, // MapScreen expects this name
        fromViewList: true, // MapScreen expects this name (not cameFromViewList)
        showAddToListModal: true,
      });
    } else {
      Alert.alert(
        'Listeye Ekle',
        `${place.name} seçildi. Listeye ekleme ekranına yönlendiriliyorsunuz.`
      );
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
      mapReady,
    });

    if (mapRef.current && listPlaces.length > 0) {
      const coordinates = listPlaces
        .map((place) => {
          const latitude = place.coordinate?.latitude || place.latitude;
          const longitude = place.coordinate?.longitude || place.longitude;

          if (latitude && longitude) {
            return { latitude, longitude };
          }
          return null;
        })
        .filter((coord) => coord !== null);

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
          mapRef.current.animateToRegion(
            {
              latitude: coordinates[0].latitude,
              longitude: coordinates[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
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
        placesCount: listPlaces.length,
      });
    }
  };

  const handleFocusPlace = (place) => {
    const latitude = place.coordinate?.latitude || place.latitude;
    const longitude = place.coordinate?.longitude || place.longitude;

    if (!latitude || !longitude || !mapRef.current || !mapReady) {
      console.warn(
        '⚠️ [ViewListModal] Cannot focus on place - missing coordinates or map not ready',
        {
          hasLatitude: !!latitude,
          hasLongitude: !!longitude,
          hasMapRef: !!mapRef.current,
          mapReady,
          placeName: place.name,
        }
      );
      return;
    }

    console.log('🎯 [ViewListModal] Focusing on place:', place.name);

    // Haritayı o mekana odakla
    mapRef.current.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.005, // Daha yakın zoom
        longitudeDelta: 0.005,
      },
      1000
    );
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
                  console.log(
                    '🗺️ [ViewListModal] Map ready, mapReady:',
                    mapReady,
                    'listPlaces count:',
                    listPlaces.length
                  );
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
                        latitude,
                        longitude,
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
              <Text style={styles.placesTitle}>Mekanlar ({listPlaces.length})</Text>
            </View>

            <ScrollView style={styles.placesList} showsVerticalScrollIndicator={false}>
              {listPlaces.length > 0 ? (
                listPlaces.map((place, index) => {
                  // PlaceCard için veri formatını düzelt
                  const formattedPlace = {
                    ...place,
                    note: place.userContent?.note || '',
                    photos: place.userContent?.photos || [],
                    rating: place.userContent?.rating || 0,
                    latitude: place.coordinate?.latitude || place.latitude,
                    longitude: place.coordinate?.longitude || place.longitude,
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
                            mapRef.current.animateToRegion(
                              {
                                latitude,
                                longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                              },
                              1000
                            );
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
                            color={
                              star <= selectedPlaceDetail.userContent.rating ? '#F59E0B' : '#E5E7EB'
                            }
                          />
                        ))}
                        <Text style={styles.detailRatingText}>
                          {selectedPlaceDetail.userContent.rating}/5
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Note */}
                  {selectedPlaceDetail.userContent.note &&
                    selectedPlaceDetail.userContent.note.length > 0 && (
                      <View style={styles.detailNoteContainer}>
                        <Text style={styles.detailSectionTitle}>Notum</Text>
                        <Text style={styles.detailNoteText}>
                          {selectedPlaceDetail.userContent.note}
                        </Text>
                      </View>
                    )}

                  {/* Photos */}
                  {selectedPlaceDetail.userContent.photos &&
                    selectedPlaceDetail.userContent.photos.length > 0 && (
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
                              <Image source={{ uri: photo }} style={styles.detailPhoto} />
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
          isOwner={listData?.userId === auth.currentUser?.uid}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modernPlaceCard: {
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 6,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  closeButton: {
    marginRight: 8,
    padding: 8,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text,
    marginTop: 8,
  },
  placesContainer: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 250,
  },
  placesHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placesTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  placesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  placeCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  placeIconContainer: {
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    height: 60,
    justifyContent: 'center',
    marginRight: 16,
    width: 60,
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  placeAddress: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  userContentPreview: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  compactItem: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  ratingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  placeActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    padding: 10,
    width: 40,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    padding: 10,
    width: 40,
  },

  // User Content Bottom Section Styles
  userContentBottomSection: {
    backgroundColor: '#F9FAFB',
    height: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userContentScrollContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    height: 104,
    paddingRight: 16,
  },
  notePreviewCard: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: '#6366F1',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    width: 200,
  },
  ratingPreviewCard: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    width: 140,
  },
  photosPreviewCard: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginRight: 12,
    padding: 12,
    width: 280,
  },
  previewCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  previewCardTitle: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  previewCardContent: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },
  ratingStarsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  ratingValue: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  photoPreviewContainer: {
    height: 50,
    marginTop: 8,
  },
  photoPreviewScrollContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
  },
  singlePhotoContainer: {
    borderRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  photoPreviewImage: {
    borderRadius: 8,
    height: 45,
    width: 45,
  },
  focusButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.placeholder,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },

  // New horizontal styles
  placeHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  placeMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    padding: 10,
    width: 40,
  },
  userContentSection: {
    backgroundColor: '#F9FAFB',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  horizontalContentScroll: {
    marginTop: 8,
  },
  horizontalContentContainer: {
    gap: 12,
    paddingHorizontal: 4,
  },
  horizontalNoteSection: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: '#6366F1',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 12,
    width: 200,
  },
  horizontalRatingSection: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 12,
    width: 140,
  },
  horizontalPhotosSection: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 12,
    width: 240,
  },
  horizontalSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  horizontalSectionLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  horizontalNoteText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },
  horizontalRatingDisplay: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  horizontalRatingValue: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  horizontalPhotosContainer: {
    marginTop: 4,
  },
  horizontalPhotoItem: {
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  horizontalPhotoImage: {
    borderRadius: 8,
    height: 50,
    width: 50,
  },

  // Place Detail Modal Styles
  placeDetailModalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
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
    alignSelf: 'center',
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 40,
  },
  placeDetailHeader: {
    alignItems: 'center',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  placeDetailHeaderTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
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
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  placeDetailUserContent: {
    gap: 16,
  },
  detailRatingContainer: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailSectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailRatingText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  detailNoteContainer: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: '#6366F1',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailNoteText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },
  detailPhotosContainer: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailPhotosScroll: {
    marginTop: 8,
  },
  detailPhotoContainer: {
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  detailPhoto: {
    borderRadius: 8,
    height: 120,
    width: 120,
  },

  // Photo Modal Styles
  photoModalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    flex: 1,
    justifyContent: 'center',
  },
  photoModalBackground: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  photoModalCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 12,
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 1,
  },
  photoModalImage: {
    backgroundColor: 'transparent',
    height: '85%',
    width: '95%',
  },
  collaboratorsButton: {
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  collaboratorsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ViewListModal;
