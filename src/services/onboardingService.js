import { ListsDataService } from './listsDataService';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OnboardingService {
  // Check if user has completed onboarding
  static async hasCompletedOnboarding(userId) {
    try {
      const key = `onboarding_completed_${userId}`;
      const completed = await AsyncStorage.getItem(key);
      return completed === 'true';
    } catch (error) {
      console.error(' [OnboardingService] Error checking onboarding status:', error);
      return false;
    }
  }

  // Mark onboarding as completed
  static async markOnboardingCompleted(userId) {
    try {
      const key = `onboarding_completed_${userId}`;
      await AsyncStorage.setItem(key, 'true');
      console.log(' [OnboardingService] Onboarding marked as completed');
    } catch (error) {
      console.error(' [OnboardingService] Error marking onboarding complete:', error);
    }
  }

  // Create welcome list for new users
  static async createWelcomeList() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      console.log(' [OnboardingService] Creating welcome list for new user');

      // Check if user already has lists
      const userLists = await ListsDataService.getUserLists(currentUser.uid);
      if (userLists && userLists.length > 0) {
        console.log(' [OnboardingService] User already has lists, skipping welcome list');
        return null;
      }

      // Create welcome list
      const welcomeListData = {
        title: 'İlk Listem',
        description: 'SoRita\'ya hoş geldin! Bu senin ilk listen. Haritadan mekanlar ekleyerek listeni oluşturmaya başlayabilirsin.',
        category: 'general',
        tags: ['hoş geldin', 'başlangıç'],
        isPublic: false,
        places: [],
        placeIds: [],
        userName: currentUser.displayName || currentUser.email,
        userAvatar: ''
      };

      const result = await ListsDataService.createList(welcomeListData);
      
      if (result.success) {
        console.log(' [OnboardingService] Welcome list created successfully');
        await this.markOnboardingCompleted(currentUser.uid);
        return result;
      }
      
      throw new Error('Failed to create welcome list');
      
    } catch (error) {
      console.error(' [OnboardingService] Error creating welcome list:', error);
      throw error;
    }
  }

  // Get onboarding tips based on user progress
  static getOnboardingTips(userStats = {}) {
    const tips = [];
    
    if (!userStats.listsCount || userStats.listsCount === 0) {
      tips.push({
        icon: 'add-location',
        title: 'İlk Listeni Oluştur',
        description: 'Harita üzerinden mekanları keşfet ve ilk listeni oluştur',
        action: 'create_list'
      });
    }
    
    if (!userStats.followingCount || userStats.followingCount === 0) {
      tips.push({
        icon: 'person-add',
        title: 'Arkadaşlarını Takip Et',
        description: 'Arama yaparak arkadaşlarını bul ve takip et',
        action: 'find_friends'
      });
    }
    
    if (userStats.listsCount && userStats.listsCount > 0 && (!userStats.placesCount || userStats.placesCount < 3)) {
      tips.push({
        icon: 'explore',
        title: 'Daha Fazla Mekan Ekle',
        description: 'Listelerine daha fazla mekan ekleyerek keşfet',
        action: 'add_places'
      });
    }
    
    return tips;
  }

  // Show onboarding tooltip
  static async shouldShowTooltip(tooltipKey, userId) {
    try {
      const key = `tooltip_shown_${tooltipKey}_${userId}`;
      const shown = await AsyncStorage.getItem(key);
      return shown !== 'true';
    } catch (error) {
      console.error(' [OnboardingService] Error checking tooltip status:', error);
      return false;
    }
  }

  // Mark tooltip as shown
  static async markTooltipShown(tooltipKey, userId) {
    try {
      const key = `tooltip_shown_${tooltipKey}_${userId}`;
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
      console.error(' [OnboardingService] Error marking tooltip shown:', error);
    }
  }
}
