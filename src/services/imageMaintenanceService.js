import { auth, db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import StorageService from './storageService';

/**
 * Service to handle image maintenance tasks like migrating cache files to Firebase Storage
 * and cleaning up broken image references
 */
export class ImageMaintenanceService {

  /**
   * Check if an image URL is accessible
   */
  static async checkImageAvailability(imageUrl) {
    try {
      if (!imageUrl) return false;
      
      // For Firebase URLs, assume they're valid
      if (imageUrl.includes('firebasestorage.googleapis.com')) {
        return true;
      }
      
      // For cache files, they're likely not accessible
      if (StorageService.isCacheFile(imageUrl)) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.log(' [ImageMaintenance] Error checking image:', error);
      return false;
    }
  }

  /**
   * Scan user's lists and identify broken image references
   */
  static async scanUserImagesHealth(userId) {
    try {
      if (!userId) {
        console.warn(' [ImageMaintenance] No user ID provided');
        return { broken: [], healthy: [] };
      }

      const listsQuery = query(
        collection(db, 'lists'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(listsQuery);
      const broken = [];
      const healthy = [];

      for (const docSnapshot of snapshot.docs) {
        const listData = docSnapshot.data();
        const list = { id: docSnapshot.id, ...listData };
        
        if (listData.image) {
          const isHealthy = await this.checkImageAvailability(listData.image);
          
          if (isHealthy) {
            healthy.push({ listId: list.id, image: listData.image, name: listData.name || 'Unknown' });
          } else {
            broken.push({ listId: list.id, image: listData.image, name: listData.name || 'Unknown' });
          }
        }
      }

      console.log(` [ImageMaintenance] Image health scan complete - Healthy: ${healthy.length}, Broken: ${broken.length}`);
      
      return { broken, healthy };
    } catch (error) {
      console.error(' [ImageMaintenance] Error scanning images:', error);
      return { broken: [], healthy: [] };
    }
  }

  /**
   * Remove broken image references by setting them to null
   */
  static async cleanupBrokenImages(userId) {
    try {
      const { broken } = await this.scanUserImagesHealth(userId);
      
      let cleanedCount = 0;
      
      for (const brokenImage of broken) {
        try {
          await updateDoc(doc(db, 'lists', brokenImage.listId), {
            image: null,
            imageType: null
          });
          
          cleanedCount++;
          console.log(` [ImageMaintenance] Cleaned broken image from list: ${brokenImage.name}`);
        } catch (error) {
          console.error(` [ImageMaintenance] Failed to clean list ${brokenImage.listId}:`, error);
        }
      }

      console.log(` [ImageMaintenance] Cleanup complete - ${cleanedCount} broken images removed`);
      return cleanedCount;
    } catch (error) {
      console.error(' [ImageMaintenance] Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get statistics about user's image health
   */
  static async getImageHealthStats(userId) {
    try {
      const { broken, healthy } = await this.scanUserImagesHealth(userId);
      
      return {
        total: broken.length + healthy.length,
        healthy: healthy.length,
        broken: broken.length,
        healthPercentage: broken.length + healthy.length > 0 
          ? Math.round((healthy.length / (broken.length + healthy.length)) * 100) 
          : 100
      };
    } catch (error) {
      console.error(' [ImageMaintenance] Error getting stats:', error);
      return { total: 0, healthy: 0, broken: 0, healthPercentage: 0 };
    }
  }

  /**
   * Auto-cleanup broken images for current user
   */
  static async autoCleanupForCurrentUser() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn(' [ImageMaintenance] No authenticated user for auto cleanup');
        return 0;
      }

      console.log(' [ImageMaintenance] Starting auto cleanup for user:', currentUser.uid);
      return await this.cleanupBrokenImages(currentUser.uid);
    } catch (error) {
      console.error(' [ImageMaintenance] Error in auto cleanup:', error);
      return 0;
    }
  }
}

export default ImageMaintenanceService;
