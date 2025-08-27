import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import StorageService from './storageService';

class MigrationService {
  
  /**
   * Mevcut cache fotoğraflarını Firebase Storage'a yükle ve database'i güncelle
   */
  static async migrateCacheImagesToFirebase() {
    try {
      console.log('🔄 [Migration] Starting cache images migration...');
      
      // Tüm listeleri al
      const listsSnap = await getDocs(collection(db, 'lists'));
      console.log('📋 [Migration] Found', listsSnap.docs.length, 'lists to check');
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const listDoc of listsSnap.docs) {
        const listData = listDoc.data();
        const listId = listDoc.id;
        
        console.log('🔍 [Migration] Checking list:', listData.name, 'ID:', listId);
        
        // Cache dosyası olup olmadığını kontrol et
        if (listData.image && StorageService.isCacheFile(listData.image)) {
          console.log('📸 [Migration] Found cache image for list:', listData.name);
          console.log('📂 [Migration] Cache path:', listData.image);
          
          try {
            // Firebase Storage'a yükle
            console.log('📤 [Migration] Uploading to Firebase Storage...');
            const firebaseURL = await StorageService.uploadListCoverImage(listData.image, listId);
            console.log('✅ [Migration] Upload successful:', firebaseURL);
            
            // Database'i güncelle
            await updateDoc(doc(db, 'lists', listId), {
              image: firebaseURL,
              migratedAt: new Date(),
              originalCachePath: listData.image // Backup için
            });
            
            console.log('✅ [Migration] Database updated for list:', listData.name);
            migratedCount++;
            
          } catch (uploadError) {
            console.error('❌ [Migration] Upload failed for list:', listData.name, uploadError);
            errorCount++;
          }
        } else if (listData.image && listData.image.includes('firebase')) {
          console.log('✅ [Migration] List already has Firebase URL:', listData.name);
        } else {
          console.log('⚠️ [Migration] List has no image:', listData.name);
        }
      }
      
      console.log('🏁 [Migration] Migration completed!');
      console.log('✅ [Migration] Successfully migrated:', migratedCount, 'images');
      console.log('❌ [Migration] Failed migrations:', errorCount);
      
      return {
        success: true,
        migratedCount,
        errorCount,
        totalLists: listsSnap.docs.length
      };
      
    } catch (error) {
      console.error('❌ [Migration] Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Kullanıcı profil fotoğraflarını Firebase'e yükle
   */
  static async migrateUserAvatarsToFirebase() {
    try {
      console.log('🔄 [Migration] Starting user avatars migration...');
      
      // Tüm kullanıcıları al
      const usersSnap = await getDocs(collection(db, 'users'));
      console.log('👥 [Migration] Found', usersSnap.docs.length, 'users to check');
      
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        console.log('🔍 [Migration] Checking user:', userData.displayName || userData.email);
        
        // Cache dosyası olup olmadığını kontrol et
        if (userData.avatar && StorageService.isCacheFile(userData.avatar)) {
          console.log('📸 [Migration] Found cache avatar for user:', userData.displayName);
          
          try {
            // Firebase Storage'a yükle
            const firebaseURL = await StorageService.uploadProfileImage(userData.avatar);
            
            // Database'i güncelle
            await updateDoc(doc(db, 'users', userId), {
              avatar: firebaseURL,
              avatarMigratedAt: new Date(),
              originalAvatarCachePath: userData.avatar
            });
            
            console.log('✅ [Migration] Avatar migrated for user:', userData.displayName);
            migratedCount++;
            
          } catch (uploadError) {
            console.error('❌ [Migration] Avatar upload failed for user:', userData.displayName, uploadError);
            errorCount++;
          }
        }
      }
      
      console.log('🏁 [Migration] User avatars migration completed!');
      console.log('✅ [Migration] Successfully migrated:', migratedCount, 'avatars');
      console.log('❌ [Migration] Failed migrations:', errorCount);
      
      return {
        success: true,
        migratedCount,
        errorCount,
        totalUsers: usersSnap.docs.length
      };
      
    } catch (error) {
      console.error('❌ [Migration] User avatars migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Tüm migration'ları çalıştır
   */
  static async runAllMigrations() {
    console.log('🚀 [Migration] Starting all migrations...');
    
    const results = {
      lists: await this.migrateCacheImagesToFirebase(),
      users: await this.migrateUserAvatarsToFirebase()
    };
    
    console.log('🏁 [Migration] All migrations completed!', results);
    return results;
  }
}

export default MigrationService;
