import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage as firebaseStorage } from '../config/firebase';

class StorageService {
  constructor() {
    this.storage = firebaseStorage;
  }

  /**
   * Upload an image to Firebase Storage
   * @param {string} uri - Local file URI from ImagePicker
   * @param {string} folder - Storage folder (e.g., 'lists', 'profiles')
   * @param {string} filename - Custom filename (optional)
   * @returns {Promise<string>} - Download URL
   */
  async uploadImage(uri, folder = 'lists', filename = null) {
    try {
      console.log(' [StorageService] Starting image upload:', { uri, folder, filename });
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate filename if not provided
      if (!filename) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        filename = `${timestamp}_${randomId}.jpg`;
      }

      // Create storage reference - simplified path structure
      const imagePath = `${folder}/${filename}`;
      const imageRef = ref(this.storage, imagePath);

      console.log(' [StorageService] Storage path:', imagePath);

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log(' [StorageService] Blob size:', blob.size, 'bytes');

      // Upload the blob
      const snapshot = await uploadBytes(imageRef, blob);
      console.log(' [StorageService] Upload completed:', snapshot.metadata.name);

      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      console.log(' [StorageService] Download URL generated:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error(' [StorageService] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload list cover image
   * @param {string} uri - Local file URI
   * @param {string} listId - List ID for filename
   * @returns {Promise<string>} - Download URL
   */
  async uploadListCoverImage(uri, listId) {
    const filename = `cover_${listId}.jpg`;
    return this.uploadImage(uri, 'lists', filename);
  }

  /**
   * Upload profile image
   * @param {string} uri - Local file URI
   * @returns {Promise<string>} - Download URL
   */
  async uploadProfileImage(uri) {
    const filename = `profile_${Date.now()}.jpg`;
    return this.uploadImage(uri, 'profiles', filename);
  }

  /**
   * Upload a place photo for a specific list
   * @param {string} userId - User ID
   * @param {string} listId - List ID
   * @param {string} uri - Local file URI from ImagePicker
   * @returns {Promise<string>} - Download URL
   */
  async uploadListPlacePhoto(userId, listId, uri) {
    try {
      console.log(' [StorageService] Uploading list place photo:', { userId, listId, uri });
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const filename = `place_${timestamp}_${randomId}.jpg`;
      
      // Create storage reference for list place photos
      const imagePath = `lists/${userId}/${listId}/places/${filename}`;
      const imageRef = ref(this.storage, imagePath);

      console.log(' [StorageService] List place photo path:', imagePath);

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log(' [StorageService] Photo blob size:', blob.size, 'bytes');

      // Upload the blob
      const snapshot = await uploadBytes(imageRef, blob);
      console.log(' [StorageService] List place photo upload completed:', snapshot.metadata.name);

      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      console.log(' [StorageService] List place photo URL generated:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error(' [StorageService] Error uploading list place photo:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Firebase Storage using its URL
   * @param {string} imageUrl - The download URL of the image to delete
   */
  async deleteImageByUrl(imageUrl) {
    try {
      if (!imageUrl) return;
      
      console.log(' [StorageService] Starting image deletion:', imageUrl);
      
      // Extract the path from the URL
      const url = new URL(imageUrl);
      const pathStart = url.pathname.indexOf('/o/') + 3;
      const pathEnd = url.pathname.indexOf('?');
      const filePath = decodeURIComponent(url.pathname.substring(pathStart, pathEnd));
      
      const imageRef = ref(this.storage, filePath);
      await deleteObject(imageRef);
      
      console.log(' [StorageService] Image deleted successfully:', filePath);
    } catch (error) {
      console.error(' [StorageService] Error deleting image:', error);
      // Don't throw error for delete operations to avoid blocking other operations
    }
  }

  /**
   * Check if URL is a temporary cache file
   * @param {string} url - Image URL to check
   * @returns {boolean} - True if it's a cache file
   */
  isCacheFile(url) {
    if (!url) return false;
    return url.includes('cache/ImagePicker') || 
           url.includes('file://') || 
           url.startsWith('file:///');
  }

  /**
   * Get a fallback icon name based on content type
   * @param {string} type - Content type ('list', 'profile', etc.)
   * @returns {string} - Material icon name
   */
  getFallbackIcon(type = 'list') {
    const icons = {
      list: 'collections',
      profile: 'person',
      place: 'place',
      photo: 'photo'
    };
    return icons[type] || 'image';
  }
}

export default new StorageService();
