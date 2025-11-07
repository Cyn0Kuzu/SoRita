// Real-time Synchronization Hook
// Provides real-time data updates and synchronization across screens

import { useEffect, useState, useCallback } from 'react';

import { auth } from '../config/firebase';
import GlobalStateService from '../services/globalStateService';

export const useRealtimeSync = (screenName) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Get current global state data
  const globalState = GlobalStateService.getState();

  // Force refresh function
  const forceRefresh = useCallback(() => {
    const safeName = screenName || 'unknown';
    // console.log(`🔄 [${safeName}] Force refresh triggered`); // Reduced logging
    setRefreshTrigger((prev) => prev + 1);
    GlobalStateService.triggerRefresh(safeName.toLowerCase());
  }, [screenName]);

  // Update specific data type
  const updateGlobalData = useCallback(
    async (dataType, data) => {
      const safeName = screenName || 'unknown';
      try {
        // console.log(`🔄 [${safeName}] Updating global ${dataType}:`, data); // Reduced logging

        switch (dataType) {
          case 'userData':
            await GlobalStateService.updateUserData(data);
            break;
          case 'userLists':
            await GlobalStateService.updateUserLists(data);
            break;
          case 'userPlaces':
            await GlobalStateService.updateUserPlaces(data);
            break;
          case 'userStats':
            await GlobalStateService.updateUserStats(data);
            break;
          case 'notifications':
            await GlobalStateService.updateNotifications(data);
            break;
          default:
            console.warn(`Unknown data type: ${dataType}`);
        }

        setLastUpdate(Date.now());
      } catch (error) {
        console.error(`❌ [${safeName}] Error updating global ${dataType}:`, error);
      }
    },
    [screenName]
  );

  // Set up global state listeners
  useEffect(() => {
    const safeName = screenName || 'unknown';
    // console.log(`🌐 [${safeName}] Setting up real-time sync listeners`); // Reduced logging

    const handleUserDataUpdate = (data) => {
      // console.log(`🔄 [${safeName}] Received user data update`); // Reduced logging
      setLastUpdate(Date.now());
    };

    const handleUserListsUpdate = (data) => {
      // console.log(`🔄 [${safeName}] Received user lists update`); // Reduced logging
      setLastUpdate(Date.now());
    };

    const handleUserPlacesUpdate = (data) => {
      // console.log(`🔄 [${safeName}] Received user places update`); // Reduced logging
      setLastUpdate(Date.now());
    };

    const handleUserStatsUpdate = (data) => {
      // console.log(`🔄 [${safeName}] Received user stats update`); // Reduced logging
      setLastUpdate(Date.now());
    };

    const handleNotificationsUpdate = (data) => {
      // console.log(`🔄 [${safeName}] Received notifications update`); // Reduced logging
      setLastUpdate(Date.now());
    };

    const handleRefresh = (trigger) => {
      // console.log(`🔄 [${safeName}] Received refresh trigger:`, trigger); // Reduced logging
      setRefreshTrigger(trigger);
    };

    const handleForceRefresh = () => {
      console.log(`🔄 [${safeName}] Received force refresh`); // Keep important logs
      forceRefresh();
    };

    const handleStateCleared = () => {
      console.log(`🔄 [${safeName}] Global state cleared`); // Keep important logs
      setRefreshTrigger(0);
      setLastUpdate(null);
    };

    // Subscribe to global events
    GlobalStateService.on('userDataUpdated', handleUserDataUpdate);
    GlobalStateService.on('userListsUpdated', handleUserListsUpdate);
    GlobalStateService.on('userPlacesUpdated', handleUserPlacesUpdate);
    GlobalStateService.on('userStatsUpdated', handleUserStatsUpdate);
    GlobalStateService.on('notificationsUpdated', handleNotificationsUpdate);
    GlobalStateService.on(`refresh_${safeName.toLowerCase()}`, handleRefresh);
    GlobalStateService.on('forceRefresh', handleForceRefresh);
    GlobalStateService.on('stateCleared', handleStateCleared);

    return () => {
      // Cleanup all listeners
      GlobalStateService.off('userDataUpdated', handleUserDataUpdate);
      GlobalStateService.off('userListsUpdated', handleUserListsUpdate);
      GlobalStateService.off('userPlacesUpdated', handleUserPlacesUpdate);
      GlobalStateService.off('userStatsUpdated', handleUserStatsUpdate);
      GlobalStateService.off('notificationsUpdated', handleNotificationsUpdate);
      GlobalStateService.off(`refresh_${safeName.toLowerCase()}`, handleRefresh);
      GlobalStateService.off('forceRefresh', handleForceRefresh);
      GlobalStateService.off('stateCleared', handleStateCleared);
    };
  }, [screenName, forceRefresh]);

  // Monitor online status
  useEffect(() => {
    const checkOnlineStatus = () => {
      const user = auth.currentUser;
      setIsOnline(!!user);
    };

    checkOnlineStatus();

    // Check every 2 minutes (less aggressive)
    const interval = setInterval(checkOnlineStatus, 120000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Current global state data
    userData: globalState.userData,
    userLists: globalState.userLists,
    userPlaces: globalState.userPlaces,
    userStats: globalState.userStats,
    notifications: globalState.notifications,
    unreadCount: globalState.unreadNotificationCount,

    // Refresh controls
    refreshTrigger,
    forceRefresh,
    updateGlobalData,

    // Status
    isOnline,
    lastUpdate,

    // Convenience getters
    getRefreshTrigger: () =>
      GlobalStateService.getRefreshTrigger((screenName || 'unknown').toLowerCase()),
    isInitialized: GlobalStateService.isInitialized,
  };
};

// Hook for managing place card synchronization
export const usePlaceCardSync = (screenName) => {
  const { refreshTrigger, updateGlobalData, userPlaces } = useRealtimeSync(screenName);

  const updatePlace = useCallback(async (updatedPlace) => {
    if (!userPlaces || !Array.isArray(userPlaces)) return;

    const updatedPlaces = userPlaces.map((place) => {
      if (
        place.id === updatedPlace.id ||
        (place.name === updatedPlace.name && place.address === updatedPlace.address)
      ) {
        return { ...place, ...updatedPlace };
      }
      return place;
    });

    await updateGlobalData('userPlaces', updatedPlaces);
  }, []); // Remove dependencies to prevent infinite loops

  const deletePlace = useCallback(async (placeToDelete) => {
    if (!userPlaces || !Array.isArray(userPlaces)) return;

    const filteredPlaces = userPlaces.filter((place) => place.id !== placeToDelete.id);
    await updateGlobalData('userPlaces', filteredPlaces);
  }, []); // Remove dependencies to prevent infinite loops

  const addPlace = useCallback(async (newPlace) => {
    if (!userPlaces || !Array.isArray(userPlaces)) return;

    const updatedPlaces = [...userPlaces, newPlace];
    await updateGlobalData('userPlaces', updatedPlaces);
  }, []); // Remove dependencies to prevent infinite loops

  return {
    refreshTrigger,
    userPlaces,
    updatePlace,
    deletePlace,
    addPlace,
  };
};

// Hook for managing list synchronization
export const useListSync = (screenName) => {
  const { refreshTrigger, updateGlobalData, userLists, userStats } = useRealtimeSync(screenName);

  const updateList = useCallback(async (updatedList) => {
    if (!userLists || !Array.isArray(userLists)) return;

    const updatedLists = userLists.map((list) => (list.id === updatedList.id ? updatedList : list));
    await updateGlobalData('userLists', updatedLists);
  }, []); // Remove dependencies to prevent infinite loops

  const deleteList = useCallback(async (listToDelete) => {
    if (!userLists || !Array.isArray(userLists) || !userStats) return;

    const filteredLists = userLists.filter((list) => list.id !== listToDelete.id);
    const updatedStats = {
      ...userStats,
      lists: Math.max(0, (userStats.lists || 0) - 1),
    };

    await updateGlobalData('userLists', filteredLists);
    await updateGlobalData('userStats', updatedStats);
  }, []); // Remove dependencies to prevent infinite loops

  const addList = useCallback(async (newList) => {
    if (!userLists || !Array.isArray(userLists) || !userStats) return;

    const updatedLists = [...userLists, newList];
    const updatedStats = {
      ...userStats,
      lists: (userStats.lists || 0) + 1,
    };

    await updateGlobalData('userLists', updatedLists);
    await updateGlobalData('userStats', updatedStats);
  }, []); // Remove dependencies to prevent infinite loops

  return {
    refreshTrigger,
    userLists,
    updateList,
    deleteList,
    addList,
  };
};

export default useRealtimeSync;
