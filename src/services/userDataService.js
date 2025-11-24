import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActivityService from './activityService';

export class UserDataService {

  // Comprehensive user profile creation with all data
  static async createUserProfile(userData) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log(' [UserDataService] Creating user profile:', currentUser.uid);

      const completeUserData = {
        // Basic Info
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || currentUser.email.split('@')[0],
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        
        // Profile Details
        avatar: userData.avatar || '',
        bio: userData.bio || '',
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth || null,
        gender: userData.gender || '',
        
        // Location
        city: userData.city || '',
        country: userData.country || '',
        location: userData.location || null,
        
        // Privacy & Settings
        isPublic: userData.isPublic !== false, // Default to true
        allowLocationSharing: userData.allowLocationSharing !== false,
        allowNotifications: userData.allowNotifications !== false,
        allowFollowRequests: userData.allowFollowRequests !== false,
        
        // Social Stats
        followersCount: 0,
        followingCount: 0,
        listsCount: 0,
        placesCount: 0,
        postsCount: 0,
        
        // Activity Tracking
        lastActivity: serverTimestamp(),
        lastSeen: new Date().toISOString(),
        signupDate: serverTimestamp(),
        
        // Notification Settings
        unreadNotifications: 0,
        pushToken: null,
        notificationSettings: {
          follows: true,
          likes: true,
          comments: true,
          listShares: true,
          mentions: true,
          weeklyDigest: true
        },
        
        // App Usage
        appVersion: userData.appVersion || '1.0.0',
        platform: userData.platform || 'mobile',
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUser.uid), completeUserData);
      
      // Cache locally
      await AsyncStorage.setItem(
        `userData_${currentUser.uid}`, 
        JSON.stringify(completeUserData)
      );
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'user_profile_created',
        data: {
          hasAvatar: !!userData.avatar,
          hasPhone: !!userData.phone,
          isPublic: completeUserData.isPublic
        }
      });

      console.log(' [UserDataService] User profile created successfully');
      return completeUserData;
      
    } catch (error) {
      console.error(' [UserDataService] Error creating user profile:', error);
      await ActivityService.recordError(error, 'createUserProfile');
      throw error;
    }
  }

  // Get complete user profile with caching
  static async getUserProfile(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      console.log(' [UserDataService] Getting user profile:', targetUserId);

      // Try cache first for own profile
      if (!userId || userId === auth.currentUser?.uid) {
        try {
          const cached = await AsyncStorage.getItem(`userData_${targetUserId}`);
          if (cached) {
            const cachedData = JSON.parse(cached);
            // Use cached data if it's recent (less than 5 minutes old)
            if (Date.now() - (cachedData.lastCacheUpdate || 0) < 5 * 60 * 1000) {
              console.log(' [UserDataService] Using cached user data');
              return cachedData;
            }
          }
        } catch (cacheError) {
          console.warn(' [UserDataService] Cache read error:', cacheError);
        }
      }

      // Get from Firestore
      const userDocRef = doc(db, 'users', targetUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.warn(' [UserDataService] User profile not found:', targetUserId);
        return null;
      }

      const userData = userDoc.data();
      
      // Add cache timestamp for own profile
      if (!userId || userId === auth.currentUser?.uid) {
        userData.lastCacheUpdate = Date.now();
        
        // Update cache
        try {
          await AsyncStorage.setItem(
            `userData_${targetUserId}`, 
            JSON.stringify(userData)
          );
        } catch (cacheError) {
          console.warn(' [UserDataService] Cache write error:', cacheError);
        }
      }

      console.log(' [UserDataService] User profile retrieved');
      return userData;
      
    } catch (error) {
      console.error(' [UserDataService] Error getting user profile:', error);
      
      // Offline durumunda cache'den veya varsayılan değerler döndür
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log(' [UserDataService] Offline mode - returning cached or default user data');
        
        try {
          const targetUserId = userId || auth.currentUser?.uid;
          if (targetUserId) {
            const cachedData = await AsyncStorage.getItem(`userData_${targetUserId}`);
            if (cachedData) {
              return JSON.parse(cachedData);
            }
          }
        } catch (cacheError) {
          console.warn(' [UserDataService] Cache read error in offline mode:', cacheError);
        }
        
        // Son çare: Firebase Auth'tan temel bilgiler
        if (auth.currentUser) {
          return {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            firstName: auth.currentUser.displayName?.split(' ')[0] || 'Kullanıcı',
            lastName: auth.currentUser.displayName?.split(' ')[1] || '',
            username: auth.currentUser.email?.split('@')[0] || 'user',
            avatar: '',
            isOfflineMode: true
          };
        }
      }
      
      await ActivityService.recordError(error, 'getUserProfile');
      throw error;
    }
  }

  // Update user profile with activity tracking
  static async updateUserProfile(updates) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log(' [UserDataService] Updating user profile');

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        version: (updates.version || 0) + 1
      };

      // Update in Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, updateData);

      // Update cache
      try {
        const current = await this.getUserProfile();
        const updated = { ...current, ...updateData, lastCacheUpdate: Date.now() };
        await AsyncStorage.setItem(
          `userData_${currentUser.uid}`, 
          JSON.stringify(updated)
        );
      } catch (cacheError) {
        console.warn(' [UserDataService] Cache update error:', cacheError);
      }

      // Record activity
      await ActivityService.recordActivity({
        action: 'user_profile_updated',
        data: {
          updatedFields: Object.keys(updates),
          updateCount: Object.keys(updates).length
        }
      });

      console.log(' [UserDataService] User profile updated');
      return true;
      
    } catch (error) {
      console.error(' [UserDataService] Error updating user profile:', error);
      
      // Offline durumunda cache'i güncelle ve sonra sync planlayabilir
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log(' [UserDataService] Offline mode - updating cache only');
        
        try {
          // Cache'deki veriyi güncelle
          const current = await AsyncStorage.getItem(`userData_${auth.currentUser.uid}`);
          if (current) {
            const currentData = JSON.parse(current);
            const updated = { 
              ...currentData, 
              ...updates, 
              lastCacheUpdate: Date.now(),
              pendingSync: true // Sync gerektiğini işaretle
            };
            await AsyncStorage.setItem(
              `userData_${auth.currentUser.uid}`, 
              JSON.stringify(updated)
            );
            console.log(' [UserDataService] Profile updated in cache (offline mode)');
            return true;
          }
        } catch (cacheError) {
          console.warn(' [UserDataService] Cache update failed in offline mode:', cacheError);
        }
        
        throw new Error('Şu anda çevrimdışısınız. Değişiklikler internet bağlantısı sağlandığında sync edilecek.');
      }
      
      await ActivityService.recordError(error, 'updateUserProfile');
      throw error;
    }
  }

  // Complete user data backup for reinstall recovery
  static async backupUserData() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      console.log(' [UserDataService] Creating user data backup');

      // Get all user-related data
      const userData = await this.getUserProfile();
      const userLists = await this.getUserLists();
      const userPlaces = await this.getUserPlaces();
      const userFollows = await this.getUserFollows();
      const userSettings = await this.getUserSettings();

      const backup = {
        profile: userData,
        lists: userLists,
        places: userPlaces,
        follows: userFollows,
        settings: userSettings,
        backupDate: new Date().toISOString(),
        version: '1.0'
      };

      // Save backup to Firestore
      const backupRef = await addDoc(collection(db, 'userBackups'), {
        userId: currentUser.uid,
        backup: backup,
        createdAt: serverTimestamp()
      });

      // Record activity
      await ActivityService.recordActivity({
        action: 'user_data_backup',
        data: {
          backupId: backupRef.id,
          dataSize: JSON.stringify(backup).length
        }
      });

      console.log(' [UserDataService] User data backup created:', backupRef.id);
      return backupRef.id;
      
    } catch (error) {
      console.error(' [UserDataService] Error creating backup:', error);
      await ActivityService.recordError(error, 'backupUserData');
      return null;
    }
  }

  // Restore user data from backup
  static async restoreUserData(backupId = null) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      console.log(' [UserDataService] Restoring user data');

      let backup;
      
      if (backupId) {
        // Restore from specific backup
        const backupDoc = await getDoc(doc(db, 'userBackups', backupId));
        if (!backupDoc.exists()) {
          throw new Error('Backup not found');
        }
        backup = backupDoc.data().backup;
      } else {
        // Get latest backup
        const backupsQuery = query(
          collection(db, 'userBackups'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const backupsSnapshot = await getDocs(backupsQuery);
        
        if (backupsSnapshot.empty) {
          console.log(' [UserDataService] No backup found for user');
          return false;
        }
        
        backup = backupsSnapshot.docs[0].data().backup;
      }

      // Restore profile (merge with current to preserve authentication data)
      if (backup.profile) {
        const currentProfile = await this.getUserProfile();
        const restoredProfile = {
          ...backup.profile,
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          restoredAt: serverTimestamp(),
          restoredFrom: backupId || 'latest'
        };
        
        await setDoc(doc(db, 'users', currentUser.uid), restoredProfile);
        console.log(' [UserDataService] Profile restored');
      }

      // Note: Lists, places, follows are restored through their respective services
      
      // Record activity
      await ActivityService.recordActivity({
        action: 'user_data_restored',
        data: {
          backupId: backupId || 'latest',
          restoredComponents: Object.keys(backup)
        }
      });

      console.log(' [UserDataService] User data restored successfully');
      return true;
      
    } catch (error) {
      console.error(' [UserDataService] Error restoring user data:', error);
      await ActivityService.recordError(error, 'restoreUserData');
      return false;
    }
  }

  // Get user lists with caching
  static async getUserLists(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return [];

      const listsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
      
      const listsSnapshot = await getDocs(listsQuery);
      const lists = listsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(` [UserDataService] Retrieved ${lists.length} lists for user`);
      return lists;
      
    } catch (error) {
      console.error(' [UserDataService] Error getting user lists:', error);
      return [];
    }
  }

  // Get user places
  static async getUserPlaces(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return [];

      const placesQuery = query(
        collection(db, 'posts'),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
      
      const placesSnapshot = await getDocs(placesQuery);
      const places = placesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(` [UserDataService] Retrieved ${places.length} places for user`);
      return places;
      
    } catch (error) {
      console.error(' [UserDataService] Error getting user places:', error);
      return [];
    }
  }

  // Get user follows/followers
  static async getUserFollows(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return { following: [], followers: [] };

      // Get following
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', targetUserId)
      );
      const followingSnapshot = await getDocs(followingQuery);
      const following = followingSnapshot.docs.map(doc => doc.data());

      // Get followers
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', targetUserId)
      );
      const followersSnapshot = await getDocs(followersQuery);
      const followers = followersSnapshot.docs.map(doc => doc.data());

      console.log(` [UserDataService] Retrieved ${following.length} following, ${followers.length} followers`);
      return { following, followers };
      
    } catch (error) {
      console.error(' [UserDataService] Error getting user follows:', error);
      return { following: [], followers: [] };
    }
  }

  // Get user settings
  static async getUserSettings(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return {};

      const settingsDoc = await getDoc(doc(db, 'userSettings', targetUserId));
      if (settingsDoc.exists()) {
        return settingsDoc.data();
      }

      return {};
      
    } catch (error) {
      console.error(' [UserDataService] Error getting user settings:', error);
      return {};
    }
  }

  // Clear cache
  static async clearCache(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return;

      await AsyncStorage.removeItem(`userData_${targetUserId}`);
      console.log(' [UserDataService] Cache cleared');
      
    } catch (error) {
      console.warn(' [UserDataService] Error clearing cache:', error);
    }
  }

  // Update last activity
  static async updateLastActivity() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await updateDoc(doc(db, 'users', currentUser.uid), {
        lastActivity: serverTimestamp(),
        lastSeen: new Date().toISOString()
      });
      
    } catch (error) {
      console.warn(' [UserDataService] Error updating last activity:', error);
    }
  }

  // Check if user profile is complete
  static isProfileComplete(userData) {
    const required = ['firstName', 'lastName', 'username'];
    const recommended = ['bio', 'avatar', 'city'];
    
    const hasRequired = required.every(field => userData[field]);
    const hasRecommended = recommended.filter(field => userData[field]).length;
    
    return {
      isComplete: hasRequired,
      completionScore: hasRequired ? (hasRecommended / recommended.length) * 100 : 0,
      missingRequired: required.filter(field => !userData[field]),
      missingRecommended: recommended.filter(field => !userData[field])
    };
  }
}

export default UserDataService;
