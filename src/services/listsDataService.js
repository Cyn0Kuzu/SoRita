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
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActivityService from './activityService';

export class ListsDataService {

  // Create comprehensive list with all metadata
  static async createList(listData) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('📝 [ListsDataService] Creating new list');

      // Generate unique ID
      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const completeListData = {
        // Basic List Info
        id: listId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: listData.userName || currentUser.displayName || currentUser.email,
        userAvatar: listData.userAvatar || '👤',
        
        // List Details
        title: listData.title || '',
        description: listData.description || '',
        category: listData.category || 'general',
        tags: listData.tags || [],
        
        // List Content
        places: listData.places || [],
        placeIds: listData.placeIds || [],
        placesCount: (listData.places || []).length,
        
        // Media
        coverImage: listData.coverImage || null,
        photos: listData.photos || [],
        
        // Privacy & Sharing
        isPublic: listData.isPublic !== false, // Default to public
        visibility: listData.visibility || 'public', // public, friends, private
        allowComments: listData.allowComments !== false,
        allowSharing: listData.allowSharing !== false,
        
        // Social Data
        likes: [],
        likesCount: 0,
        comments: [],
        commentsCount: 0,
        shares: [],
        sharesCount: 0,
        views: [],
        viewsCount: 0,
        
        // Collaboration
        collaborators: listData.collaborators || [],
        collaboratorIds: listData.collaboratorIds || [],
        canCollaborate: listData.canCollaborate || false,
        
        // Location Data (if list is location-based)
        location: listData.location || null,
        city: listData.city || '',
        country: listData.country || '',
        
        // Activity Tracking
        lastActivity: serverTimestamp(),
        lastViewed: null,
        
        // Metadata for Recovery
        deviceInfo: listData.deviceInfo || {
          platform: 'mobile',
          timestamp: new Date().toISOString()
        },
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Backup Info
        backupVersion: 1,
        lastBackup: serverTimestamp(),
        
        // Status
        isActive: true,
        isDeleted: false,
        isFeatured: false,
        
        // Additional Metadata
        language: listData.language || 'tr',
        region: listData.region || 'TR'
      };

      // Save to Firestore
      await setDoc(doc(db, 'lists', listId), completeListData);
      
      // Update user's lists count
      await this.updateUserListsCount(currentUser.uid, 1);
      
      // Cache list data locally
      await this.cacheListData(listId, completeListData);
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'list_created',
        data: {
          listId: listId,
          listTitle: completeListData.title,
          placesCount: completeListData.placesCount,
          isPublic: completeListData.isPublic,
          category: completeListData.category
        }
      });

      console.log('✅ [ListsDataService] List created successfully:', listId);
      return { success: true, listId, listData: completeListData };
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error creating list:', error);
      await ActivityService.recordError(error, 'createList');
      throw error;
    }
  }

  // Get list with all data
  static async getList(listId) {
    try {
      console.log('📖 [ListsDataService] Getting list:', listId);

      // Try cache first
      const cached = await this.getCachedListData(listId);
      if (cached) {
        console.log('📋 [ListsDataService] Using cached list data');
        return cached;
      }

      // Get from Firestore
      const listDoc = await getDoc(doc(db, 'lists', listId));
      
      if (!listDoc.exists()) {
        console.warn('⚠️ [ListsDataService] List not found:', listId);
        return null;
      }

      const listData = { id: listDoc.id, ...listDoc.data() };
      
      // Cache the data
      await this.cacheListData(listId, listData);
      
      // Update view count and last viewed
      await this.incrementListViews(listId);
      
      console.log('✅ [ListsDataService] List retrieved');
      return listData;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error getting list:', error);
      await ActivityService.recordError(error, 'getList');
      throw error;
    }
  }

  // Get user's lists with pagination
  static async getUserLists(userId = null, lastDoc = null, limitCount = 20) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      console.log(`📝 [ListsDataService] Getting lists for user: ${targetUserId}`);

      let listsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', targetUserId),
        where('isDeleted', '==', false),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        listsQuery = query(
          collection(db, 'lists'),
          where('userId', '==', targetUserId),
          where('isDeleted', '==', false),
          orderBy('updatedAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const listsSnapshot = await getDocs(listsQuery);
      const lists = listsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _doc: doc // Keep for pagination
      }));

      console.log(`✅ [ListsDataService] Retrieved ${lists.length} lists`);
      return lists;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error getting user lists:', error);
      await ActivityService.recordError(error, 'getUserLists');
      return [];
    }
  }

  // Update list data
  static async updateList(listId, updates) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('✏️ [ListsDataService] Updating list:', listId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        backupVersion: increment(1),
        lastBackup: serverTimestamp()
      };

      // Update in Firestore
      await updateDoc(doc(db, 'lists', listId), updateData);
      
      // Update cache
      const currentData = await this.getCachedListData(listId);
      if (currentData) {
        const updatedData = { ...currentData, ...updateData };
        await this.cacheListData(listId, updatedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'list_updated',
        data: {
          listId: listId,
          updatedFields: Object.keys(updates)
        }
      });

      console.log('✅ [ListsDataService] List updated');
      return true;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error updating list:', error);
      await ActivityService.recordError(error, 'updateList');
      throw error;
    }
  }

  // Add place to list
  static async addPlaceToList(listId, placeData) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('➕ [ListsDataService] Adding place to list:', listId);

      const placeEntry = {
        id: placeData.id,
        name: placeData.name || '',
        latitude: placeData.latitude || null,
        longitude: placeData.longitude || null,
        address: placeData.address || '',
        photo: placeData.mainPhoto || placeData.photo || null,
        addedAt: new Date().toISOString(),
        addedBy: currentUser.uid,
        notes: placeData.notes || ''
      };

      // Update list
      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        places: arrayUnion(placeEntry),
        placeIds: arrayUnion(placeData.id),
        placesCount: increment(1),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });

      // Update cache
      const cachedData = await this.getCachedListData(listId);
      if (cachedData) {
        cachedData.places = [...(cachedData.places || []), placeEntry];
        cachedData.placeIds = [...(cachedData.placeIds || []), placeData.id];
        cachedData.placesCount = (cachedData.placesCount || 0) + 1;
        await this.cacheListData(listId, cachedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'place_added_to_list',
        data: {
          listId: listId,
          placeId: placeData.id,
          placeName: placeData.name
        }
      });

      console.log('✅ [ListsDataService] Place added to list');
      return true;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error adding place to list:', error);
      await ActivityService.recordError(error, 'addPlaceToList');
      throw error;
    }
  }

  // Remove place from list
  static async removePlaceFromList(listId, placeId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('➖ [ListsDataService] Removing place from list:', listId);

      // Get current list to find the place entry
      const listDoc = await getDoc(doc(db, 'lists', listId));
      if (!listDoc.exists()) {
        throw new Error('List not found');
      }

      const listData = listDoc.data();
      const places = listData.places || [];
      const placeEntry = places.find(place => place.id === placeId);
      
      if (!placeEntry) {
        console.warn('⚠️ [ListsDataService] Place not found in list');
        return false;
      }

      // Update list
      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        places: arrayRemove(placeEntry),
        placeIds: arrayRemove(placeId),
        placesCount: increment(-1),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });

      // Update cache
      const cachedData = await this.getCachedListData(listId);
      if (cachedData) {
        cachedData.places = (cachedData.places || []).filter(place => place.id !== placeId);
        cachedData.placeIds = (cachedData.placeIds || []).filter(id => id !== placeId);
        cachedData.placesCount = Math.max(0, (cachedData.placesCount || 0) - 1);
        await this.cacheListData(listId, cachedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'place_removed_from_list',
        data: {
          listId: listId,
          placeId: placeId,
          placeName: placeEntry.name
        }
      });

      console.log('✅ [ListsDataService] Place removed from list');
      return true;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error removing place from list:', error);
      await ActivityService.recordError(error, 'removePlaceFromList');
      throw error;
    }
  }

  // Soft delete list (mark as deleted but keep data)
  static async deleteList(listId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('🗑️ [ListsDataService] Soft deleting list:', listId);

      // Mark as deleted instead of actually deleting
      await updateDoc(doc(db, 'lists', listId), {
        isDeleted: true,
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // Update user's lists count
      await this.updateUserListsCount(currentUser.uid, -1);
      
      // Remove from cache
      await this.removeCachedListData(listId);
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'list_deleted',
        data: { listId: listId }
      });

      console.log('✅ [ListsDataService] List soft deleted');
      return true;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error deleting list:', error);
      await ActivityService.recordError(error, 'deleteList');
      throw error;
    }
  }

  // Like/Unlike list
  static async toggleListLike(listId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('❤️ [ListsDataService] Toggling like for list:', listId);

      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('List not found');
      }

      const listData = listDoc.data();
      const likes = listData.likes || [];
      const userLiked = likes.includes(currentUser.uid);

      let updatedLikes;
      let action;

      if (userLiked) {
        // Unlike
        updatedLikes = likes.filter(uid => uid !== currentUser.uid);
        action = 'list_unliked';
      } else {
        // Like
        updatedLikes = [...likes, currentUser.uid];
        action = 'list_liked';
      }

      // Update list
      await updateDoc(listRef, {
        likes: updatedLikes,
        likesCount: updatedLikes.length,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedData = await this.getCachedListData(listId);
      if (cachedData) {
        cachedData.likes = updatedLikes;
        cachedData.likesCount = updatedLikes.length;
        await this.cacheListData(listId, cachedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: action,
        data: {
          listId: listId,
          listOwnerId: listData.userId,
          totalLikes: updatedLikes.length
        }
      });

      console.log(`✅ [ListsDataService] List ${userLiked ? 'unliked' : 'liked'}`);
      return { liked: !userLiked, totalLikes: updatedLikes.length };
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error toggling like:', error);
      await ActivityService.recordError(error, 'toggleListLike');
      throw error;
    }
  }

  // Add comment to list
  static async addListComment(listId, commentText) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('💬 [ListsDataService] Adding comment to list:', listId);

      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: commentText,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        userAvatar: '👤', // This should come from user profile
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('List not found');
      }

      const listData = listDoc.data();
      const comments = listData.comments || [];
      const updatedComments = [...comments, comment];

      // Update list
      await updateDoc(listRef, {
        comments: updatedComments,
        commentsCount: updatedComments.length,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedData = await this.getCachedListData(listId);
      if (cachedData) {
        cachedData.comments = updatedComments;
        cachedData.commentsCount = updatedComments.length;
        await this.cacheListData(listId, cachedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'list_comment_added',
        data: {
          listId: listId,
          commentId: comment.id,
          listOwnerId: listData.userId,
          commentLength: commentText.length
        }
      });

      console.log('✅ [ListsDataService] Comment added');
      return comment;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error adding comment:', error);
      await ActivityService.recordError(error, 'addListComment');
      throw error;
    }
  }

  // Share list
  static async shareList(listId, shareData) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log('📤 [ListsDataService] Sharing list:', listId);

      const share = {
        id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        platform: shareData.platform || 'app',
        method: shareData.method || 'direct',
        sharedAt: new Date().toISOString()
      };

      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        shares: arrayUnion(share),
        sharesCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedData = await this.getCachedListData(listId);
      if (cachedData) {
        cachedData.shares = [...(cachedData.shares || []), share];
        cachedData.sharesCount = (cachedData.sharesCount || 0) + 1;
        await this.cacheListData(listId, cachedData);
      }
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'list_shared',
        data: {
          listId: listId,
          shareId: share.id,
          platform: share.platform,
          method: share.method
        }
      });

      console.log('✅ [ListsDataService] List shared');
      return share;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error sharing list:', error);
      await ActivityService.recordError(error, 'shareList');
      throw error;
    }
  }

  // Get public lists with filtering
  static async getPublicLists(filters = {}, lastDoc = null, limitCount = 20) {
    try {
      console.log('🌍 [ListsDataService] Getting public lists');

      let listsQuery = query(
        collection(db, 'lists'),
        where('isPublic', '==', true),
        where('isDeleted', '==', false),
        where('isActive', '==', true)
      );

      // Add category filter if provided
      if (filters.category) {
        listsQuery = query(listsQuery, where('category', '==', filters.category));
      }

      // Add location filter if provided
      if (filters.city) {
        listsQuery = query(listsQuery, where('city', '==', filters.city));
      }

      // Add ordering and limit
      listsQuery = query(listsQuery, orderBy('updatedAt', 'desc'), limit(limitCount));

      if (lastDoc) {
        listsQuery = query(listsQuery, startAfter(lastDoc));
      }

      const listsSnapshot = await getDocs(listsQuery);
      const lists = listsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _doc: doc // Keep for pagination
      }));

      console.log(`✅ [ListsDataService] Retrieved ${lists.length} public lists`);
      return lists;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error getting public lists:', error);
      return [];
    }
  }

  // Cache list data locally
  static async cacheListData(listId, listData) {
    try {
      const cacheKey = `listData_${listId}`;
      const cacheData = {
        ...listData,
        lastCacheUpdate: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ [ListsDataService] Cache write error:', error);
    }
  }

  // Get cached list data
  static async getCachedListData(listId) {
    try {
      const cacheKey = `listData_${listId}`;
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
      console.warn('⚠️ [ListsDataService] Cache read error:', error);
      return null;
    }
  }

  // Remove cached list data
  static async removeCachedListData(listId) {
    try {
      const cacheKey = `listData_${listId}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('⚠️ [ListsDataService] Cache remove error:', error);
    }
  }

  // Update user's lists count
  static async updateUserListsCount(userId, incrementValue) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        listsCount: increment(incrementValue),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('⚠️ [ListsDataService] Error updating lists count:', error);
    }
  }

  // Increment list views
  static async incrementListViews(listId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        views: arrayUnion(currentUser.uid),
        viewsCount: increment(1),
        lastViewed: serverTimestamp()
      });
    } catch (error) {
      console.warn('⚠️ [ListsDataService] Error updating views:', error);
    }
  }

  // Backup all user lists
  static async backupUserLists(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return null;

      console.log('💾 [ListsDataService] Backing up all user lists');

      const lists = await this.getUserLists(targetUserId, null, 1000); // Get all lists
      
      const backup = {
        userId: targetUserId,
        lists: lists,
        listCount: lists.length,
        backupDate: new Date().toISOString(),
        version: '1.0'
      };

      // Save backup
      const backupRef = await addDoc(collection(db, 'listsBackups'), {
        ...backup,
        createdAt: serverTimestamp()
      });

      console.log(`✅ [ListsDataService] Backed up ${lists.length} lists`);
      return backupRef.id;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error backing up lists:', error);
      return null;
    }
  }

  // Search lists
  static async searchLists(searchTerm, filters = {}) {
    try {
      console.log('🔍 [ListsDataService] Searching lists:', searchTerm);

      // For now, get all public lists and filter locally
      // In production, use Elasticsearch or Algolia for better search
      const allLists = await this.getPublicLists(filters, null, 100);
      
      const searchResults = allLists.filter(list => {
        const titleMatch = list['title']?.toLowerCase().includes(searchTerm.toLowerCase());
        const descMatch = list['description']?.toLowerCase().includes(searchTerm.toLowerCase());
        const tagsMatch = list['tags']?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return titleMatch || descMatch || tagsMatch;
      });

      console.log(`✅ [ListsDataService] Found ${searchResults.length} matching lists`);
      return searchResults;
      
    } catch (error) {
      console.error('❌ [ListsDataService] Error searching lists:', error);
      return [];
    }
  }
}

export default ListsDataService;
