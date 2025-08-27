import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

export class ActivityService {
  
  // Recent activities cache to prevent duplicates
  static recentActivities = new Map();
  static DUPLICATE_PREVENTION_WINDOW = 5000; // 5 seconds
  
  // Record user activity with full details
  static async recordActivity({
    action,
    entity = null,
    entityId = null,
    entityType = null,
    data = {},
    location = null,
    sessionId = null
  }) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // Silent return for non-critical activities when user is not authenticated
        if (action === 'app_launched' || action === 'app_state_change') {
          console.log('ℹ️ [ActivityService] Skipping activity recording - user not authenticated:', action);
          return null;
        }
        console.warn('⚠️ [ActivityService] No authenticated user for activity recording:', action);
        return null;
      }

      // Create a unique key for duplicate detection
      const activityKey = `${currentUser.uid}_${action}_${entityId || 'none'}`;
      const now = Date.now();
      
      // Check if we've recorded this activity recently to prevent duplicates
      if (this.recentActivities.has(activityKey)) {
        const lastRecorded = this.recentActivities.get(activityKey);
        if (now - lastRecorded < this.DUPLICATE_PREVENTION_WINDOW) {
          console.log('⏭️ [ActivityService] Skipping duplicate activity:', action);
          return null;
        }
      }
      
      // Update recent activities cache
      this.recentActivities.set(activityKey, now);
      
      // Clean up old entries periodically
      if (this.recentActivities.size > 100) {
        const cutoffTime = now - this.DUPLICATE_PREVENTION_WINDOW;
        for (const [key, timestamp] of this.recentActivities.entries()) {
          if (timestamp < cutoffTime) {
            this.recentActivities.delete(key);
          }
        }
      }

      // Generate unique activity ID to prevent duplicates
      const uniqueId = `${action}_${now}_${Math.random().toString(36).substr(2, 9)}`;
      
      const activityData = {
        activityId: uniqueId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        action: action,
        entity: entity,
        entityId: entityId,
        entityType: entityType,
        data: data,
        location: location,
        sessionId: sessionId,
        timestamp: now,
        createdAt: serverTimestamp(),
        deviceInfo: {
          platform: 'mobile',
          userAgent: navigator.userAgent || 'unknown'
        }
      };

      console.log('📊 [ActivityService] Recording activity:', {
        action,
        entityType,
        entityId: entityId ? (entityId.length > 10 ? entityId.substring(0, 8) + '...' : entityId) : 'none'
      });

      // Use user-specific activities subcollection instead of global
      const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'activities'), activityData);
      
      console.log('✅ [ActivityService] Activity recorded:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      // If the error is about document already existing, it's likely a race condition
      if (error.code === 'already-exists') {
        console.log('⏭️ [ActivityService] Activity already exists (race condition), skipping:', action);
        return null;
      }
      console.error('❌ [ActivityService] Error recording activity:', error);
      return null;
    }
  }

  // App launch tracking
  static async recordAppLaunch() {
    return this.recordActivity({
      action: 'app_launch',
      data: {
        launchTime: new Date().toISOString()
      }
    });
  }

  // App background/foreground tracking
  static async recordAppStateChange(state) {
    return this.recordActivity({
      action: 'app_state_change',
      data: {
        state: state, // 'background', 'foreground'
        timestamp: new Date().toISOString()
      }
    });
  }

  // User login/logout tracking
  static async recordUserAuth(action) {
    return this.recordActivity({
      action: action, // 'login', 'logout', 'register'
      data: {
        timestamp: new Date().toISOString()
      }
    });
  }

  // Location access tracking
  static async recordLocationAccess(location, purpose) {
    return this.recordActivity({
      action: 'location_access',
      location: location,
      data: {
        purpose: purpose, // 'map_view', 'place_add', 'search'
        accuracy: location?.accuracy || null,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Place interactions
  static async recordPlaceView(place) {
    return this.recordActivity({
      action: 'place_view',
      entity: place.name,
      entityId: place.id,
      entityType: 'place',
      location: {
        latitude: place.latitude,
        longitude: place.longitude
      },
      data: {
        placeName: place.name,
        placeAddress: place.address,
        category: place.category,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordPlaceAdd(place) {
    return this.recordActivity({
      action: 'place_add',
      entity: place.name,
      entityId: place.id,
      entityType: 'place',
      location: {
        latitude: place.latitude,
        longitude: place.longitude
      },
      data: {
        placeName: place.name,
        placeAddress: place.address,
        category: place.category,
        rating: place.userContent?.rating || null,
        note: place.userContent?.note || null,
        photos: place.userContent?.photos?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordPlaceEdit(place, changes) {
    return this.recordActivity({
      action: 'place_edit',
      entity: place.name,
      entityId: place.id,
      entityType: 'place',
      data: {
        placeName: place.name,
        changes: changes,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordPlaceDelete(place) {
    return this.recordActivity({
      action: 'place_delete',
      entity: place.name,
      entityId: place.id,
      entityType: 'place',
      data: {
        placeName: place.name,
        placeAddress: place.address,
        timestamp: new Date().toISOString()
      }
    });
  }

  // List interactions
  static async recordListCreate(list) {
    return this.recordActivity({
      action: 'list_create',
      entity: list.name,
      entityId: list.id,
      entityType: 'list',
      data: {
        listName: list.name,
        description: list.description,
        placesCount: list.places?.length || 0,
        isPublic: list.isPublic || false,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordListView(list) {
    return this.recordActivity({
      action: 'list_view',
      entity: list.name,
      entityId: list.id,
      entityType: 'list',
      data: {
        listName: list.name,
        placesCount: list.places?.length || 0,
        ownList: list.userId === auth.currentUser?.uid,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordListEdit(list, changes) {
    return this.recordActivity({
      action: 'list_edit',
      entity: list.name,
      entityId: list.id,
      entityType: 'list',
      data: {
        listName: list.name,
        changes: changes,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordListDelete(list) {
    return this.recordActivity({
      action: 'list_delete',
      entity: list.name,
      entityId: list.id,
      entityType: 'list',
      data: {
        listName: list.name,
        placesCount: list.places?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordListShare(list, shareMethod) {
    return this.recordActivity({
      action: 'list_share',
      entity: list.name,
      entityId: list.id,
      entityType: 'list',
      data: {
        listName: list.name,
        shareMethod: shareMethod, // 'link', 'social', 'invite'
        timestamp: new Date().toISOString()
      }
    });
  }

  // Social interactions
  static async recordUserFollow(targetUser) {
    return this.recordActivity({
      action: 'user_follow',
      entity: `${targetUser.firstName} ${targetUser.lastName}`,
      entityId: targetUser.id,
      entityType: 'user',
      data: {
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserEmail: targetUser.email,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordUserUnfollow(targetUser) {
    return this.recordActivity({
      action: 'user_unfollow',
      entity: `${targetUser.firstName} ${targetUser.lastName}`,
      entityId: targetUser.id,
      entityType: 'user',
      data: {
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserEmail: targetUser.email,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordProfileView(targetUser) {
    return this.recordActivity({
      action: 'profile_view',
      entity: `${targetUser.firstName} ${targetUser.lastName}`,
      entityId: targetUser.id,
      entityType: 'user',
      data: {
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        ownProfile: targetUser.id === auth.currentUser?.uid,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Content interactions
  static async recordLike(entityType, entity, entityId) {
    return this.recordActivity({
      action: 'like',
      entity: entity,
      entityId: entityId,
      entityType: entityType,
      data: {
        likedEntity: entity,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordUnlike(entityType, entity, entityId) {
    return this.recordActivity({
      action: 'unlike',
      entity: entity,
      entityId: entityId,
      entityType: entityType,
      data: {
        unlikedEntity: entity,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordComment(entityType, entity, entityId, comment) {
    return this.recordActivity({
      action: 'comment',
      entity: entity,
      entityId: entityId,
      entityType: entityType,
      data: {
        commentText: comment,
        commentLength: comment?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Search activities
  static async recordSearch(query, results, searchType) {
    return this.recordActivity({
      action: 'search',
      data: {
        query: query,
        searchType: searchType, // 'places', 'users', 'lists'
        resultsCount: results?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Map interactions
  static async recordMapView(region) {
    return this.recordActivity({
      action: 'map_view',
      location: {
        latitude: region.latitude,
        longitude: region.longitude
      },
      data: {
        region: region,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordMapInteraction(interactionType, data) {
    return this.recordActivity({
      action: 'map_interaction',
      data: {
        interactionType: interactionType, // 'zoom', 'pan', 'marker_tap'
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Photo activities
  static async recordPhotoUpload(entityType, entityId, photoCount) {
    return this.recordActivity({
      action: 'photo_upload',
      entityId: entityId,
      entityType: entityType,
      data: {
        photoCount: photoCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async recordPhotoView(photoUrl, entityType, entityId) {
    return this.recordActivity({
      action: 'photo_view',
      entityId: entityId,
      entityType: entityType,
      data: {
        photoUrl: photoUrl,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Navigation tracking
  static async recordScreenView(screenName, params = {}) {
    return this.recordActivity({
      action: 'screen_view',
      entity: screenName,
      data: {
        screenName: screenName,
        params: params,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Error tracking
  static async recordError(error, context) {
    return this.recordActivity({
      action: 'error',
      data: {
        errorMessage: error.message,
        errorStack: error.stack,
        context: context,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Session management
  static generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Performance tracking
  static async recordPerformance(action, duration, details = {}) {
    return this.recordActivity({
      action: 'performance',
      data: {
        performanceAction: action,
        duration: duration,
        details: details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Update user's last activity timestamp
  static async updateUserLastActivity() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        lastActivity: serverTimestamp(),
        lastSeen: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [ActivityService] Error updating user last activity:', error);
    }
  }
}

export default ActivityService;
