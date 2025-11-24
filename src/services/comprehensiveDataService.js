import UserDataService from './userDataService';
import PlacesDataService from './placesDataService';
import ListsDataService from './listsDataService';
import ActivityService from './activityService';
import { auth, db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ComprehensiveDataService {

  // Backup throttling to prevent multiple simultaneous backups
  static lastBackupTime = 0;
  static isBackupInProgress = false;
  static BACKUP_THROTTLE_TIME = 30000; // 30 seconds between backups

  // Complete app data initialization after login (fast mode)
  static async initializeUserData(userData = {}, fastMode = true) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log(' [ComprehensiveDataService] Initializing user data', fastMode ? '(fast mode)' : '(full mode)');

      // Fast mode: Only get user profile, skip other operations
      if (fastMode) {
        console.log(' [ComprehensiveDataService] Fast mode: Getting user profile only...');
        const userProfile = await UserDataService.getUserProfile();
        
        if (userProfile) {
          console.log(' [ComprehensiveDataService] Fast initialization complete');
          return {
            success: true,
            userProfile: userProfile,
            isNewUser: false
          };
        } else {
          console.log(' [ComprehensiveDataService] New user detected in fast mode');
          return {
            success: true,
            userProfile: null,
            isNewUser: true
          };
        }
      }

      // Full mode: Complete initialization (for background tasks)
      console.log(' [ComprehensiveDataService] Fetching user profile with timeout...');
      
      let userProfile;
      try {
        const profileWithTimeout = Promise.race([
          UserDataService.getUserProfile(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
          )
        ]);
        
        userProfile = await profileWithTimeout;
      } catch (profileError) {
        console.log(' [ComprehensiveDataService] Profile fetch failed/timeout:', profileError.message);
        userProfile = null; // Will be created below
      }
      
      if (!userProfile) {
        console.log(' [ComprehensiveDataService] Creating new user profile');
        userProfile = await UserDataService.createUserProfile(userData);
      } else {
        console.log(' [ComprehensiveDataService] User profile exists, updating last activity');
        try {
          const updateWithTimeout = Promise.race([
            UserDataService.updateLastActivity(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Update timeout')), 5000)
            )
          ]);
          await updateWithTimeout;
        } catch (updateError) {
          console.log(' [ComprehensiveDataService] Could not update last activity:', updateError.message);
        }
      }

      // Initialize data collections if they don't exist (background)
      setTimeout(() => {
        this.initializeUserCollections(currentUser.uid).catch(error => {
          console.warn(' [ComprehensiveDataService] Background collection init failed:', error);
        });
      }, 300);

      // Background backup and activity recording
      setTimeout(async () => {
        try {
          console.log(' [ComprehensiveDataService] Running background backup...');
          await this.createCompleteBackup();
          
          await ActivityService.recordActivity({
            action: 'app_data_initialized',
            data: {
              hasExistingProfile: !!userProfile,
              userId: currentUser.uid,
              timestamp: new Date().toISOString()
            }
          });
        } catch (bgError) {
          console.warn(' [ComprehensiveDataService] Background task failed:', bgError);
        }
      }, 500);

      console.log(' [ComprehensiveDataService] User data initialization complete');
      return {
        success: true,
        userProfile: userProfile,
        isNewUser: !userProfile
      };
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error initializing user data:', error);
      await ActivityService.recordError(error, 'initializeUserData');
      throw error;
    }
  }

  // Initialize empty collections for new user
  static async initializeUserCollections(userId) {
    try {
      console.log(' [ComprehensiveDataService] Initializing user collections');

      const collectionsToInit = [
        'userSettings',
        'userPreferences',
        'userStats',
        'socialConnections'
      ];

      for (const collectionName of collectionsToInit) {
        const docRef = doc(db, collectionName, userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          const defaultData = this.getDefaultCollectionData(collectionName);
          await setDoc(docRef, {
            ...defaultData,
            userId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(` Initialized ${collectionName} for user`);
        }
      }
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error initializing collections:', error);
    }
  }

  // Get default data for collections
  static getDefaultCollectionData(collectionName) {
    const defaults = {
      userSettings: {
        theme: 'light',
        language: 'tr',
        notifications: {
          push: true,
          email: false,
          inApp: true
        },
        privacy: {
          profileVisible: true,
          locationSharing: true,
          activityVisible: true
        }
      },
      userPreferences: {
        mapStyle: 'standard',
        units: 'metric',
        autoBackup: true,
        offlineMode: false,
        dataUsage: 'wifi'
      },
      userStats: {
        totalPlaces: 0,
        totalLists: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        joinDate: new Date().toISOString(),
        lastActive: new Date().toISOString()
      },
      socialConnections: {
        following: [],
        followers: [],
        blocked: [],
        muted: [],
        closeFriends: []
      }
    };

    return defaults[collectionName] || {};
  }

  // Create complete backup of all user data
  static async createCompleteBackup(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return null;

      const now = Date.now();
      
      // Check if backup is already in progress
      if (this.isBackupInProgress) {
        console.log(' [ComprehensiveDataService] Backup already in progress, skipping');
        return null;
      }
      
      // Check if we're within throttle time
      if (now - this.lastBackupTime < this.BACKUP_THROTTLE_TIME) {
        console.log(' [ComprehensiveDataService] Backup throttled, last backup too recent');
        return null;
      }
      
      // Set backup in progress flag
      this.isBackupInProgress = true;
      this.lastBackupTime = now;

      console.log(' [ComprehensiveDataService] Creating complete data backup');

      // Generate unique backup ID to prevent conflicts
      const uniqueBackupId = `${targetUserId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // Gather all user data
      const backupData = {
        // Core user data
        userProfile: await UserDataService.getUserProfile(targetUserId),
        
        // User content
        places: await PlacesDataService.getUserPlaces(targetUserId, null, 1000),
        lists: await ListsDataService.getUserLists(targetUserId, null, 1000),
        
        // Social data
        socialConnections: await this.getUserSocialData(targetUserId),
        
        // Settings and preferences
        settings: await this.getUserSettings(targetUserId),
        preferences: await this.getUserPreferences(targetUserId),
        stats: await this.getUserStats(targetUserId),
        
        // Activity data (last 30 days)
        recentActivity: await this.getRecentActivity(targetUserId, 30),
        
        // Metadata
        backupDate: new Date().toISOString(),
        backupVersion: '2.0',
        appVersion: '1.0.0',
        platform: 'mobile'
      };

      // Convert Firestore data to JSON-safe format
      const jsonSafeData = this.convertToJSONSafe(backupData);

      // Calculate backup size and stats
      const backupStats = {
        totalSize: JSON.stringify(jsonSafeData).length,
        placesCount: jsonSafeData.places?.length || 0,
        listsCount: jsonSafeData.lists?.length || 0,
        photosCount: this.countPhotosInData(jsonSafeData),
        activitiesCount: jsonSafeData.recentActivity?.length || 0
      };

      // Save main backup with unique ID to prevent conflicts
      const backupRef = await setDoc(doc(db, 'completeBackups', uniqueBackupId), {
        userId: targetUserId,
        backupData: jsonSafeData,
        backupStats: backupStats,
        createdAt: serverTimestamp()
      });

      // Return the unique ID for reference
      const backupDocRef = { id: uniqueBackupId };

      // Save backup metadata for quick reference (merge to avoid conflicts)
      await setDoc(doc(db, 'backupMetadata', targetUserId), {
        latestBackupId: backupDocRef.id,
        latestBackupDate: new Date().toISOString(),
        backupStats: backupStats,
        backupHistory: [{
          backupId: backupDocRef.id,
          date: new Date().toISOString(),
          stats: backupStats
        }],
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Record activity
      await ActivityService.recordActivity({
        action: 'complete_backup_created',
        data: {
          backupId: backupDocRef.id,
          backupStats: backupStats
        }
      });

      console.log(' [ComprehensiveDataService] Complete backup created:', backupDocRef.id);
      
      // Clear backup in progress flag
      this.isBackupInProgress = false;
      
      return {
        backupId: backupDocRef.id,
        stats: backupStats
      };
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error creating complete backup:', error);
      
      // Clear backup in progress flag on error
      this.isBackupInProgress = false;
      
      await ActivityService.recordError(error, 'createCompleteBackup');
      return null;
    }
  }

  // Restore complete user data from backup
  static async restoreCompleteData(backupId = null, userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      console.log(' [ComprehensiveDataService] Starting complete data restore');

      let backupData;

      if (backupId) {
        // Restore from specific backup
        const backupDoc = await getDoc(doc(db, 'completeBackups', backupId));
        if (!backupDoc.exists()) {
          throw new Error('Backup not found');
        }
        backupData = backupDoc.data().backupData;
      } else {
        // Get latest backup
        const backupQuery = query(
          collection(db, 'completeBackups'),
          where('userId', '==', targetUserId),
          orderBy('createdAt', 'desc')
        );
        const backupSnapshot = await getDocs(backupQuery);
        
        if (backupSnapshot.empty) {
          throw new Error('No backup found for user');
        }
        
        backupData = backupSnapshot.docs[0].data().backupData;
        backupId = backupSnapshot.docs[0].id;
      }

      console.log(' [ComprehensiveDataService] Backup data loaded, starting restore...');

      const restoreResults = {
        profile: false,
        places: false,
        lists: false,
        social: false,
        settings: false,
        errors: []
      };

      // Restore user profile
      try {
        if (backupData.userProfile) {
          await setDoc(doc(db, 'users', targetUserId), {
            ...backupData.userProfile,
            restoredAt: serverTimestamp(),
            restoredFrom: backupId
          });
          restoreResults.profile = true;
          console.log(' Profile restored');
        }
      } catch (error) {
        console.error(' Error restoring profile:', error);
        restoreResults.errors.push({ component: 'profile', error: error.message });
      }

      // Restore places
      try {
        if (backupData.places && backupData.places.length > 0) {
          for (const place of backupData.places) {
            await setDoc(doc(db, 'posts', place.id), {
              ...place,
              restoredAt: serverTimestamp(),
              restoredFrom: backupId
            });
          }
          restoreResults.places = true;
          console.log(` ${backupData.places.length} places restored`);
        }
      } catch (error) {
        console.error(' Error restoring places:', error);
        restoreResults.errors.push({ component: 'places', error: error.message });
      }

      // Restore lists
      try {
        if (backupData.lists && backupData.lists.length > 0) {
          for (const list of backupData.lists) {
            await setDoc(doc(db, 'lists', list.id), {
              ...list,
              restoredAt: serverTimestamp(),
              restoredFrom: backupId
            });
          }
          restoreResults.lists = true;
          console.log(` ${backupData.lists.length} lists restored`);
        }
      } catch (error) {
        console.error(' Error restoring lists:', error);
        restoreResults.errors.push({ component: 'lists', error: error.message });
      }

      // Restore social connections
      try {
        if (backupData.socialConnections) {
          await setDoc(doc(db, 'socialConnections', targetUserId), {
            ...backupData.socialConnections,
            restoredAt: serverTimestamp(),
            restoredFrom: backupId
          });
          restoreResults.social = true;
          console.log(' Social connections restored');
        }
      } catch (error) {
        console.error(' Error restoring social data:', error);
        restoreResults.errors.push({ component: 'social', error: error.message });
      }

      // Restore settings and preferences
      try {
        if (backupData.settings) {
          await setDoc(doc(db, 'userSettings', targetUserId), {
            ...backupData.settings,
            restoredAt: serverTimestamp(),
            restoredFrom: backupId
          });
        }
        if (backupData.preferences) {
          await setDoc(doc(db, 'userPreferences', targetUserId), {
            ...backupData.preferences,
            restoredAt: serverTimestamp(),
            restoredFrom: backupId
          });
        }
        restoreResults.settings = true;
        console.log(' Settings and preferences restored');
      } catch (error) {
        console.error(' Error restoring settings:', error);
        restoreResults.errors.push({ component: 'settings', error: error.message });
      }

      // Clear all caches to force fresh data
      await this.clearAllCaches(targetUserId);

      // Record restore activity
      await ActivityService.recordActivity({
        action: 'complete_data_restored',
        data: {
          backupId: backupId,
          restoreResults: restoreResults,
          timestamp: new Date().toISOString()
        }
      });

      const successCount = Object.values(restoreResults).filter(result => result === true).length;
      console.log(` [ComprehensiveDataService] Data restore complete: ${successCount}/5 components restored`);

      return {
        success: restoreResults.errors.length === 0,
        results: restoreResults,
        backupId: backupId
      };
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error restoring complete data:', error);
      await ActivityService.recordError(error, 'restoreCompleteData');
      throw error;
    }
  }

  // Get user social data
  static async getUserSocialData(userId) {
    try {
      const socialDoc = await getDoc(doc(db, 'socialConnections', userId));
      return socialDoc.exists() ? socialDoc.data() : {};
    } catch (error) {
      console.error(' Error getting social data:', error);
      return {};
    }
  }

  // Get user settings
  static async getUserSettings(userId) {
    try {
      const settingsDoc = await getDoc(doc(db, 'userSettings', userId));
      return settingsDoc.exists() ? settingsDoc.data() : {};
    } catch (error) {
      console.error(' Error getting settings:', error);
      return {};
    }
  }

  // Get user preferences
  static async getUserPreferences(userId) {
    try {
      const prefsDoc = await getDoc(doc(db, 'userPreferences', userId));
      return prefsDoc.exists() ? prefsDoc.data() : {};
    } catch (error) {
      console.error(' Error getting preferences:', error);
      return {};
    }
  }

  // Get user stats
  static async getUserStats(userId) {
    try {
      const statsDoc = await getDoc(doc(db, 'userStats', userId));
      return statsDoc.exists() ? statsDoc.data() : {};
    } catch (error) {
      console.error(' Error getting stats:', error);
      return {};
    }
  }

  // Get recent activity
  static async getRecentActivity(userId, days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      // Query from user-specific activities subcollection (consistent with ActivityService)
      const activityQuery = query(
        collection(db, 'users', userId, 'activities'),
        where('timestamp', '>=', since.getTime()), // Use timestamp in milliseconds
        orderBy('timestamp', 'desc'),
        limit(50) // Limit to avoid large queries
      );
      
      const activitySnapshot = await getDocs(activityQuery);
      return activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(' Error getting recent activity:', error);
      return [];
    }
  }

  // Count photos in backup data
  static countPhotosInData(backupData) {
    let photoCount = 0;
    
    // Count photos in places
    if (backupData.places) {
      backupData.places.forEach(place => {
        if (place.photos && Array.isArray(place.photos)) {
          photoCount += place.photos.length;
        }
      });
    }
    
    // Count photos in lists
    if (backupData.lists) {
      backupData.lists.forEach(list => {
        if (list.photos && Array.isArray(list.photos)) {
          photoCount += list.photos.length;
        }
      });
    }
    
    return photoCount;
  }

  // Clear all caches for user
  static async clearAllCaches(userId) {
    try {
      console.log(' [ComprehensiveDataService] Clearing all caches');

      // Clear user data cache
      await UserDataService.clearCache(userId);
      
      // Clear other caches
      const allKeys = await AsyncStorage.getAllKeys();
      const userCacheKeys = allKeys.filter(key => 
        key.includes(`_${userId}`) || 
        key.startsWith('placeData_') || 
        key.startsWith('listData_')
      );
      
      if (userCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(userCacheKeys);
      }
      
      console.log(` [ComprehensiveDataService] Cleared ${userCacheKeys.length} cache entries`);
      
    } catch (error) {
      console.warn(' [ComprehensiveDataService] Error clearing caches:', error);
    }
  }

  // Sync all user data (manual sync)
  static async syncAllUserData() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      console.log(' [ComprehensiveDataService] Starting manual data sync');

      // Update last activity
      await UserDataService.updateLastActivity();

      // Clear caches to force fresh data
      await this.clearAllCaches(currentUser.uid);

      // Create new backup
      await this.createCompleteBackup();

      // Record sync activity
      await ActivityService.recordActivity({
        action: 'manual_data_sync',
        data: {
          timestamp: new Date().toISOString()
        }
      });

      console.log(' [ComprehensiveDataService] Manual sync complete');
      return true;
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error during manual sync:', error);
      await ActivityService.recordError(error, 'syncAllUserData');
      return false;
    }
  }

  // Get data recovery status
  static async getDataRecoveryStatus(userId = null) {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) return null;

      // Get backup metadata
      const backupMetaDoc = await getDoc(doc(db, 'backupMetadata', targetUserId));
      
      if (!backupMetaDoc.exists()) {
        return {
          hasBackup: false,
          message: 'No backup found for this account'
        };
      }

      const metadata = backupMetaDoc.data();
      
      return {
        hasBackup: true,
        latestBackupDate: metadata.latestBackupDate,
        backupStats: metadata.backupStats,
        canRestore: true,
        message: `Latest backup from ${new Date(metadata.latestBackupDate).toLocaleDateString()}`
      };
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error checking recovery status:', error);
      return {
        hasBackup: false,
        error: error.message
      };
    }
  }

  // Prepare for app reinstall (create final backup)
  static async prepareForReinstall() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      console.log(' [ComprehensiveDataService] Preparing for app reinstall');

      // Create final comprehensive backup
      const backupResult = await this.createCompleteBackup();
      
      if (backupResult) {
        // Record reinstall preparation
        await ActivityService.recordActivity({
          action: 'app_reinstall_preparation',
          data: {
            backupId: backupResult.backupId,
            preparationDate: new Date().toISOString()
          }
        });

        console.log(' [ComprehensiveDataService] Reinstall preparation complete');
        return {
          success: true,
          backupId: backupResult.backupId,
          message: 'All data has been backed up. You can safely reinstall the app.'
        };
      }
      
      return false;
      
    } catch (error) {
      console.error(' [ComprehensiveDataService] Error preparing for reinstall:', error);
      return false;
    }
  }

  // Convert Firestore data to JSON-safe format
  static convertToJSONSafe(data) {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertToJSONSafe(item));
    }

    if (typeof data === 'object') {
      // Handle Firestore Timestamp objects
      if (data.toDate && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
      }

      // Handle other Firestore objects
      if (data.constructor && data.constructor.name !== 'Object') {
        return data.toString();
      }

      // Handle regular objects
      const converted = {};
      for (const [key, value] of Object.entries(data)) {
        converted[key] = this.convertToJSONSafe(value);
      }
      return converted;
    }

    return data;
  }
}

export default ComprehensiveDataService;
