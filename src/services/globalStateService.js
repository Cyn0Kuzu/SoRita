// Global State Management Service
// Tüm ekranlar ve bileşenler arasında veri senkronizasyonu sağlar

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

class GlobalStateService extends SimpleEventEmitter {
  constructor() {
    super();
    this.state = {
      userData: null,
      userLists: [],
      userPlaces: [],
      userStats: {
        followers: 0,
        following: 0,
        posts: 0,
        lists: 0
      },
      notifications: [],
      unreadNotificationCount: 0,
      refreshTriggers: {
        profile: 0,
        home: 0,
        maps: 0,
        notifications: 0
      },
      // PlaceCard cache for real-time synchronization
      placeCardCache: new Map() // placeId -> { likes: [], comments: [], likesCount: 0, commentsCount: 0, lastUpdate: timestamp }
    };
    
    this.isInitialized = false;
    this.lastUpdate = null;
  }

  // Initialize global state
  async initialize() {
    try {
      console.log('🌐 [GlobalState] Initializing global state...');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ [GlobalState] No authenticated user');
        return false;
      }

      // Load cached data
      await this.loadCachedData(user.uid);
      
      this.isInitialized = true;
      this.lastUpdate = Date.now();
      
      console.log('✅ [GlobalState] Global state initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('❌ [GlobalState] Error initializing:', error);
      return false;
    }
  }

  // Load cached data
  async loadCachedData(userId) {
    try {
      const keys = [
        `userData_${userId}`,
        `userLists_${userId}`,
        `userPlaces_${userId}`,
        `userStats_${userId}`,
        `notifications_${userId}`
      ];

      const results = await AsyncStorage.multiGet(keys);
      
      results.forEach(([key, value]) => {
        if (value) {
          const data = JSON.parse(value);
          
          if (key.includes('userData')) {
            this.state.userData = data;
          } else if (key.includes('userLists')) {
            this.state.userLists = data;
          } else if (key.includes('userPlaces')) {
            this.state.userPlaces = data;
          } else if (key.includes('userStats')) {
            this.state.userStats = data;
          } else if (key.includes('notifications')) {
            this.state.notifications = data;
            this.state.unreadNotificationCount = data.filter(n => !n.read).length;
          }
        }
      });

      console.log('✅ [GlobalState] Cached data loaded');
    } catch (error) {
      console.warn('⚠️ [GlobalState] Error loading cached data:', error);
    }
  }

  // Update user data globally
  async updateUserData(newData) {
    try {
      this.state.userData = { ...this.state.userData, ...newData };
      
      // Cache update
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(
          `userData_${user.uid}`,
          JSON.stringify(this.state.userData)
        );
      }
      
      // Notify all listeners
      this.emit('userDataUpdated', this.state.userData);
      this.triggerRefresh('profile');
      
      console.log('✅ [GlobalState] User data updated globally');
    } catch (error) {
      console.error('❌ [GlobalState] Error updating user data:', error);
    }
  }

  // Update user lists globally
  async updateUserLists(lists) {
    try {
      this.state.userLists = lists;
      
      // Update stats
      this.state.userStats.lists = lists.length;
      
      // Cache update
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.multiSet([
          [`userLists_${user.uid}`, JSON.stringify(lists)],
          [`userStats_${user.uid}`, JSON.stringify(this.state.userStats)]
        ]);
      }
      
      // Notify all listeners
      this.emit('userListsUpdated', lists);
      this.emit('userStatsUpdated', this.state.userStats);
      this.triggerRefresh(['profile', 'maps']);
      
      console.log('✅ [GlobalState] User lists updated globally');
    } catch (error) {
      console.error('❌ [GlobalState] Error updating user lists:', error);
    }
  }

  // Update user places globally
  async updateUserPlaces(places) {
    try {
      this.state.userPlaces = places;
      
      // Cache update
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(
          `userPlaces_${user.uid}`,
          JSON.stringify(places)
        );
      }
      
      // Notify all listeners
      this.emit('userPlacesUpdated', places);
      this.triggerRefresh(['profile', 'maps']);
      
      console.log('✅ [GlobalState] User places updated globally');
    } catch (error) {
      console.error('❌ [GlobalState] Error updating user places:', error);
    }
  }

  // Update notifications globally
  async updateNotifications(notifications) {
    try {
      this.state.notifications = notifications;
      this.state.unreadNotificationCount = notifications.filter(n => !n.read).length;
      
      // Cache update
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(
          `notifications_${user.uid}`,
          JSON.stringify(notifications)
        );
      }
      
      // Notify all listeners
      this.emit('notificationsUpdated', notifications);
      this.emit('unreadCountUpdated', this.state.unreadNotificationCount);
      this.triggerRefresh(['notifications', 'home']);
      
      console.log('✅ [GlobalState] Notifications updated globally');
    } catch (error) {
      console.error('❌ [GlobalState] Error updating notifications:', error);
    }
  }

  // Update stats globally
  async updateUserStats(stats) {
    try {
      this.state.userStats = { ...this.state.userStats, ...stats };
      
      // Cache update
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(
          `userStats_${user.uid}`,
          JSON.stringify(this.state.userStats)
        );
      }
      
      // Notify all listeners
      this.emit('userStatsUpdated', this.state.userStats);
      this.triggerRefresh('profile');
      
      console.log('✅ [GlobalState] User stats updated globally');
    } catch (error) {
      console.error('❌ [GlobalState] Error updating user stats:', error);
    }
  }

  // Trigger refresh for specific screens
  triggerRefresh(screens) {
    const screensArray = Array.isArray(screens) ? screens : [screens];
    
    screensArray.forEach(screen => {
      if (this.state.refreshTriggers[screen] !== undefined) {
        this.state.refreshTriggers[screen]++;
        this.emit(`refresh_${screen}`, this.state.refreshTriggers[screen]);
      }
    });
    
    console.log('🔄 [GlobalState] Refresh triggered for:', screensArray);
  }

  // PlaceCard Cache Management
  getPlaceCardData(placeId) {
    return this.state.placeCardCache.get(placeId) || null;
  }

  setPlaceCardData(placeId, data) {
    this.state.placeCardCache.set(placeId, {
      ...data,
      lastUpdate: Date.now()
    });
    
    // Emit event to notify all PlaceCards with this placeId
    this.emit('placeCardDataUpdated', { placeId, data });
  }

  updatePlaceCardLikes(placeId, likes, likesCount, isLiked) {
    const cached = this.getPlaceCardData(placeId) || {};
    this.setPlaceCardData(placeId, {
      ...cached,
      likes,
      likesCount,
      isLiked
    });
  }

  updatePlaceCardComments(placeId, comments, commentsCount) {
    const cached = this.getPlaceCardData(placeId) || {};
    this.setPlaceCardData(placeId, {
      ...cached,
      comments,
      commentsCount
    });
  }

  clearPlaceCardCache() {
    this.state.placeCardCache.clear();
  }

  // Trigger refresh for all PlaceCard components
  refreshAllPlaceCards() {
    console.log('🔄 [GlobalState] Refreshing all PlaceCard components');
    this.emit('placeInteraction', { 
      placeId: null, // null means all places
      type: 'global_refresh', 
      action: 'refresh_all' 
    });
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Get specific data
  getUserData() {
    return this.state.userData;
  }

  getUserLists() {
    return this.state.userLists;
  }

  getUserPlaces() {
    return this.state.userPlaces;
  }

  getUserStats() {
    return this.state.userStats;
  }

  getNotifications() {
    return this.state.notifications;
  }

  getUnreadCount() {
    return this.state.unreadNotificationCount;
  }

  getRefreshTrigger(screen) {
    return this.state.refreshTriggers[screen] || 0;
  }

  // Clear all data (logout)
  async clearState() {
    try {
      this.state = {
        userData: null,
        userLists: [],
        userPlaces: [],
        userStats: { followers: 0, following: 0, posts: 0, lists: 0 },
        notifications: [],
        unreadNotificationCount: 0,
        refreshTriggers: { profile: 0, home: 0, maps: 0, notifications: 0 },
        placeCardCache: new Map()
      };
      
      this.isInitialized = false;
      this.lastUpdate = null;
      
      // Clear cache
      const user = auth.currentUser;
      if (user) {
        const keysToRemove = [
          `userData_${user.uid}`,
          `userLists_${user.uid}`,
          `userPlaces_${user.uid}`,
          `userStats_${user.uid}`,
          `notifications_${user.uid}`
        ];
        
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // Notify all listeners
      this.emit('stateCleared');
      
      console.log('✅ [GlobalState] State cleared');
    } catch (error) {
      console.error('❌ [GlobalState] Error clearing state:', error);
    }
  }

  // Force full refresh
  async forceRefresh() {
    try {
      this.triggerRefresh(['profile', 'home', 'maps', 'notifications']);
      this.emit('forceRefresh');
      
      console.log('🔄 [GlobalState] Force refresh triggered');
    } catch (error) {
      console.error('❌ [GlobalState] Error in force refresh:', error);
    }
  }
}

// Export singleton instance
export default new GlobalStateService();
