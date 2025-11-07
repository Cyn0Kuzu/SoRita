import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { db, storage, auth } from '../config/firebase';

import ActivityService from './activityService';

export class PlacesDataService {
  // Save complete place data with all metadata
  static async savePlace(placeData) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('📍 [PlacesDataService] Saving place data');

      // Generate unique ID if not provided
      const placeId =
        placeData.id || `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const completePlaceData = {
        // Basic Place Info
        id: placeId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: placeData.userName || currentUser.displayName || currentUser.email,
        userAvatar: placeData.userAvatar || '👤',

        // Location Data
        name: placeData.name || '',
        address: placeData.address || '',
        description: placeData.description || '',
        category: placeData.category || 'other',

        // Geographic Coordinates (ESSENTIAL for recovery)
        latitude: placeData.latitude || null,
        longitude: placeData.longitude || null,
        coordinates: {
          latitude: placeData.latitude || null,
          longitude: placeData.longitude || null,
        },

        // Location Details
        city: placeData.city || '',
        district: placeData.district || '',
        country: placeData.country || '',
        postalCode: placeData.postalCode || '',

        // Google Places Data (for recovery)
        googlePlaceId: placeData.googlePlaceId || '',
        googleMapsData: placeData.googleMapsData || null,

        // Media
        photos: placeData.photos || [],
        mainPhoto: placeData.mainPhoto || null,
        photoCount: (placeData.photos || []).length,

        // Social Data
        likes: placeData.likes || [],
        likesCount: (placeData.likes || []).length,
        comments: placeData.comments || [],
        commentsCount: (placeData.comments || []).length,
        shares: placeData.shares || [],
        sharesCount: (placeData.shares || []).length,

        // Visit Information
        visitDate: placeData.visitDate || new Date().toISOString(),
        rating: placeData.rating || null,
        review: placeData.review || '',
        tags: placeData.tags || [],

        // Privacy & Visibility
        isPublic: placeData.isPublic !== false, // Default to public
        visibility: placeData.visibility || 'public', // public, friends, private

        // Lists (which lists this place belongs to)
        listIds: placeData.listIds || [],
        listNames: placeData.listNames || [],

        // Metadata for Recovery
        deviceInfo: placeData.deviceInfo || {
          platform: 'mobile',
          timestamp: new Date().toISOString(),
        },

        // Activity Tracking
        viewsCount: 0,
        lastViewed: null,

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Backup Info
        backupVersion: 1,
        lastBackup: serverTimestamp(),

        // Status
        isActive: true,
        isDeleted: false,
      };

      // Save to Firestore
      await setDoc(doc(db, 'posts', placeId), completePlaceData);

      // Update user's places count
      await this.updateUserPlacesCount(currentUser.uid, 1);

      // Cache place data locally
      await this.cachePlaceData(placeId, completePlaceData);

      // Record activity
      await ActivityService.recordActivity({
        action: 'place_saved',
        data: {
          placeId,
          placeName: completePlaceData.name,
          hasPhotos: completePlaceData.photoCount > 0,
          hasLocation: !!(completePlaceData.latitude && completePlaceData.longitude),
          isPublic: completePlaceData.isPublic,
          category: completePlaceData.category,
        },
      });

      console.log('✅ [PlacesDataService] Place saved successfully:', placeId);
      return { success: true, placeId, placeData: completePlaceData };
    } catch (error) {
      console.error('❌ [PlacesDataService] Error saving place:', error);
      await ActivityService.recordError(error, 'savePlace');
      throw error;
    }
  }

  // Upload place photos with metadata
  static async uploadPlacePhotos(placeId, photos) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log(`📸 [PlacesDataService] Uploading ${photos.length} photos for place:`, placeId);

      const uploadedPhotos = [];

      for (const photo of photos) {
        try {
          // Create unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const filename = `places/${currentUser.uid}/${placeId}/${timestamp}_${randomId}.jpg`;

          // Convert URI to blob
          const response = await fetch(photo.uri);
          const blob = await response.blob();

          // Upload to Firebase Storage
          const storageRef = ref(storage, filename);
          const uploadResult = await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(uploadResult.ref);

          const photoData = {
            id: `photo_${timestamp}_${randomId}`,
            url: downloadURL,
            storagePath: filename,
            originalUri: photo.uri,
            width: photo.width || null,
            height: photo.height || null,
            size: photo.size || blob.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser.uid,
          };

          uploadedPhotos.push(photoData);
          console.log('✅ Photo uploaded:', photoData.id);
        } catch (photoError) {
          console.error('❌ Error uploading photo:', photoError);
          await ActivityService.recordError(photoError, 'uploadPlacePhoto');
        }
      }

      // Update place with photo URLs
      if (uploadedPhotos.length > 0) {
        const placeRef = doc(db, 'posts', placeId);
        await updateDoc(placeRef, {
          photos: uploadedPhotos,
          photoCount: uploadedPhotos.length,
          mainPhoto: uploadedPhotos[0].url,
          updatedAt: serverTimestamp(),
        });

        // Record activity
        await ActivityService.recordActivity({
          action: 'place_photos_uploaded',
          data: {
            placeId,
            photoCount: uploadedPhotos.length,
            totalSize: uploadedPhotos.reduce((total, photo) => total + (photo.size || 0), 0),
          },
        });
      }

      console.log(`✅ [PlacesDataService] ${uploadedPhotos.length} photos uploaded successfully`);
      return uploadedPhotos;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error uploading photos:', error);
      await ActivityService.recordError(error, 'uploadPlacePhotos');
      throw error;
    }
  }

  // Get place with all data
  static async getPlace(placeId) {
    try {
      console.log('📖 [PlacesDataService] Getting place:', placeId);

      // Try cache first
      const cached = await this.getCachedPlaceData(placeId);
      if (cached) {
        console.log('📋 [PlacesDataService] Using cached place data');
        return cached;
      }

      // Get from Firestore
      const placeDoc = await getDoc(doc(db, 'posts', placeId));

      if (!placeDoc.exists()) {
        console.warn('⚠️ [PlacesDataService] Place not found:', placeId);
        return null;
      }

      const placeData = { id: placeDoc.id, ...placeDoc.data() };

      // Cache the data
      await this.cachePlaceData(placeId, placeData);

      // Update view count
      await this.incrementPlaceViews(placeId);

      console.log('✅ [PlacesDataService] Place retrieved');
      return placeData;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error getting place:', error);
      await ActivityService.recordError(error, 'getPlace');
      throw error;
    }
  }

  // Get user's places with pagination
  static async getUserPlaces(userId = null, lastDoc = null, limitCount = 20) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      console.log(`📍 [PlacesDataService] Getting places for user: ${targetUserId}`);

      let placesQuery = query(
        collection(db, 'posts'),
        where('userId', '==', targetUserId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        placesQuery = query(
          collection(db, 'posts'),
          where('userId', '==', targetUserId),
          where('isDeleted', '==', false),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const placesSnapshot = await getDocs(placesQuery);
      const places = placesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        _doc: doc, // Keep for pagination
      }));

      console.log(`✅ [PlacesDataService] Retrieved ${places.length} places`);
      return places;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error getting user places:', error);
      await ActivityService.recordError(error, 'getUserPlaces');
      return [];
    }
  }

  // Update place data
  static async updatePlace(placeId, updates) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('✏️ [PlacesDataService] Updating place:', placeId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        backupVersion: increment(1),
        lastBackup: serverTimestamp(),
      };

      // Update in Firestore
      await updateDoc(doc(db, 'posts', placeId), updateData);

      // Update cache
      const currentData = await this.getCachedPlaceData(placeId);
      if (currentData) {
        const updatedData = { ...currentData, ...updateData };
        await this.cachePlaceData(placeId, updatedData);
      }

      // Record activity
      await ActivityService.recordActivity({
        action: 'place_updated',
        data: {
          placeId,
          updatedFields: Object.keys(updates),
        },
      });

      console.log('✅ [PlacesDataService] Place updated');
      return true;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error updating place:', error);
      await ActivityService.recordError(error, 'updatePlace');
      throw error;
    }
  }

  // Soft delete place (mark as deleted but keep data)
  static async deletePlace(placeId) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('🗑️ [PlacesDataService] Soft deleting place:', placeId);

      // Mark as deleted instead of actually deleting
      await updateDoc(doc(db, 'posts', placeId), {
        isDeleted: true,
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      // Update user's places count
      await this.updateUserPlacesCount(currentUser.uid, -1);

      // Remove from cache
      await this.removeCachedPlaceData(placeId);

      // Record activity
      await ActivityService.recordActivity({
        action: 'place_deleted',
        data: { placeId },
      });

      console.log('✅ [PlacesDataService] Place soft deleted');
      return true;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error deleting place:', error);
      await ActivityService.recordError(error, 'deletePlace');
      throw error;
    }
  }

  // Like/Unlike place
  static async togglePlaceLike(placeId) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('❤️ [PlacesDataService] Toggling like for place:', placeId);

      const placeRef = doc(db, 'posts', placeId);
      const placeDoc = await getDoc(placeRef);

      if (!placeDoc.exists()) {
        throw new Error('Place not found');
      }

      const placeData = placeDoc.data();
      const likes = placeData.likes || [];
      const userLiked = likes.includes(currentUser.uid);

      let updatedLikes;
      let action;

      if (userLiked) {
        // Unlike
        updatedLikes = likes.filter((uid) => uid !== currentUser.uid);
        action = 'place_unliked';
      } else {
        // Like
        updatedLikes = [...likes, currentUser.uid];
        action = 'place_liked';
      }

      // Update place
      await updateDoc(placeRef, {
        likes: updatedLikes,
        likesCount: updatedLikes.length,
        updatedAt: serverTimestamp(),
      });

      // Update cache
      const cachedData = await this.getCachedPlaceData(placeId);
      if (cachedData) {
        cachedData.likes = updatedLikes;
        cachedData.likesCount = updatedLikes.length;
        await this.cachePlaceData(placeId, cachedData);
      }

      // Record activity
      await ActivityService.recordActivity({
        action,
        data: {
          placeId,
          placeOwnerId: placeData.userId,
          totalLikes: updatedLikes.length,
        },
      });

      console.log(`✅ [PlacesDataService] Place ${userLiked ? 'unliked' : 'liked'}`);
      return { liked: !userLiked, totalLikes: updatedLikes.length };
    } catch (error) {
      console.error('❌ [PlacesDataService] Error toggling like:', error);
      await ActivityService.recordError(error, 'togglePlaceLike');
      throw error;
    }
  }

  // Add comment to place
  static async addPlaceComment(placeId, commentText) {
    try {
      const { currentUser } = auth;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('💬 [PlacesDataService] Adding comment to place:', placeId);

      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: commentText,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        userAvatar: '👤', // This should come from user profile
        createdAt: new Date().toISOString(),
        isDeleted: false,
      };

      const placeRef = doc(db, 'posts', placeId);
      const placeDoc = await getDoc(placeRef);

      if (!placeDoc.exists()) {
        throw new Error('Place not found');
      }

      const placeData = placeDoc.data();
      const comments = placeData.comments || [];
      const updatedComments = [...comments, comment];

      // Update place
      await updateDoc(placeRef, {
        comments: updatedComments,
        commentsCount: updatedComments.length,
        updatedAt: serverTimestamp(),
      });

      // Update cache
      const cachedData = await this.getCachedPlaceData(placeId);
      if (cachedData) {
        cachedData.comments = updatedComments;
        cachedData.commentsCount = updatedComments.length;
        await this.cachePlaceData(placeId, cachedData);
      }

      // Record activity
      await ActivityService.recordActivity({
        action: 'place_comment_added',
        data: {
          placeId,
          commentId: comment.id,
          placeOwnerId: placeData.userId,
          commentLength: commentText.length,
        },
      });

      console.log('✅ [PlacesDataService] Comment added');
      return comment;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error adding comment:', error);
      await ActivityService.recordError(error, 'addPlaceComment');
      throw error;
    }
  }

  // Cache place data locally
  static async cachePlaceData(placeId, placeData) {
    try {
      const cacheKey = `placeData_${placeId}`;
      const cacheData = {
        ...placeData,
        lastCacheUpdate: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ [PlacesDataService] Cache write error:', error);
    }
  }

  // Get cached place data
  static async getCachedPlaceData(placeId) {
    try {
      const cacheKey = `placeData_${placeId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        // Use cached data if it's recent (less than 10 minutes old)
        if (Date.now() - (cachedData.lastCacheUpdate || 0) < 10 * 60 * 1000) {
          return cachedData;
        }
      }
      return null;
    } catch (error) {
      console.warn('⚠️ [PlacesDataService] Cache read error:', error);
      return null;
    }
  }

  // Remove cached place data
  static async removeCachedPlaceData(placeId) {
    try {
      const cacheKey = `placeData_${placeId}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('⚠️ [PlacesDataService] Cache remove error:', error);
    }
  }

  // Update user's places count
  static async updateUserPlacesCount(userId, increment) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        placesCount: increment > 0 ? increment(increment) : increment(increment),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('⚠️ [PlacesDataService] Error updating places count:', error);
    }
  }

  // Increment place views
  static async incrementPlaceViews(placeId) {
    try {
      const placeRef = doc(db, 'posts', placeId);
      await updateDoc(placeRef, {
        viewsCount: increment(1),
        lastViewed: serverTimestamp(),
      });
    } catch (error) {
      console.warn('⚠️ [PlacesDataService] Error updating views:', error);
    }
  }

  // Get places for specific location (nearby places)
  static async getPlacesNearLocation(latitude, longitude, radiusKm = 10) {
    try {
      console.log(`🗺️ [PlacesDataService] Getting places near ${latitude}, ${longitude}`);

      // Simple bounding box search (for better performance, use geohash)
      const latDelta = radiusKm / 111; // Rough conversion
      const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;

      const placesQuery = query(
        collection(db, 'posts'),
        where('latitude', '>=', minLat),
        where('latitude', '<=', maxLat),
        where('isDeleted', '==', false),
        where('isPublic', '==', true),
        orderBy('latitude')
      );

      const placesSnapshot = await getDocs(placesQuery);
      const places = [];

      placesSnapshot.docs.forEach((doc) => {
        const placeData = { id: doc.id, ...doc.data() };
        // Check if place has coordinates and is within radius
        if (placeData['longitude'] && placeData['latitude']) {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            placeData['latitude'],
            placeData['longitude']
          );
          if (distance <= radiusKm) {
            places.push(placeData);
          }
        }
      });

      console.log(`✅ [PlacesDataService] Found ${places.length} nearby places`);
      return places;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error getting nearby places:', error);
      return [];
    }
  }

  // Calculate distance between two coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  // Backup all user places
  static async backupUserPlaces(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return null;

      console.log('💾 [PlacesDataService] Backing up all user places');

      const places = await this.getUserPlaces(targetUserId, null, 1000); // Get all places

      const backup = {
        userId: targetUserId,
        places,
        placeCount: places.length,
        backupDate: new Date().toISOString(),
        version: '1.0',
      };

      // Save backup
      const backupRef = await addDoc(collection(db, 'placesBackups'), {
        ...backup,
        createdAt: serverTimestamp(),
      });

      console.log(`✅ [PlacesDataService] Backed up ${places.length} places`);
      return backupRef.id;
    } catch (error) {
      console.error('❌ [PlacesDataService] Error backing up places:', error);
      return null;
    }
  }
}

export default PlacesDataService;
