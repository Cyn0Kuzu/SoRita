// Centralized ImagePicker helper
import { Alert, NativeModules } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

import storageService from '../services/storageService';

/**
 * Ensures the native ImagePicker module is available (rebuild needed otherwise)
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function ensureImagePickerReady() {
  const nativeOk = !!NativeModules.ExpoImagePicker;
  if (!nativeOk) {
    return { ok: false, reason: 'native-missing' };
  }
  // Basic API existence check
  if (typeof ExpoImagePicker.launchImageLibraryAsync !== 'function') {
    return { ok: false, reason: 'js-missing' };
  }
  return { ok: true };
}

/**
 * Pick image from library and automatically upload to Firebase Storage
 * @param {string} folder - Storage folder (e.g., 'avatars', 'list-images')
 * @param {string} filename - File name (e.g., userId, listId)
 * @returns {Promise<{cancelled: boolean, downloadURL?: string, error?: any}>}
 */
export async function pickImageFromLibraryAndUpload(folder, filename) {
  // Temporarily bypass native check for development
  // const ready = await ensureImagePickerReady();
  // if (!ready.ok) {
  //   showRebuildAlert('library');
  //   return { cancelled: true };
  // }

  try {
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // Reduced quality for performance
      base64: false,
      exif: false, // Disable EXIF data for smaller files
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true };
    }

    const imageUri = result.assets[0].uri;
    console.log('Uploading image to Firebase Storage...', { folder, filename });

    // Automatically upload to Firebase Storage
    const downloadURL = await storageService.uploadImage(imageUri, folder, filename);
    console.log('Image uploaded successfully:', downloadURL);

    return { cancelled: false, downloadURL };
  } catch (e) {
    console.error('[ImagePickerHelper] pickImageFromLibraryAndUpload error', e);
    Alert.alert('Hata', `Resim yüklenirken bir hata oluştu: ${e.message}`);
    return { cancelled: true, error: e };
  }
}

/**
 * Take photo with camera and automatically upload to Firebase Storage
 * @param {string} folder - Storage folder (e.g., 'avatars', 'list-images')
 * @param {string} filename - File name (e.g., userId, listId)
 * @returns {Promise<{cancelled: boolean, downloadURL?: string, error?: any}>}
 */
export async function takePhotoWithCameraAndUpload(folder, filename) {
  // Temporarily bypass native check for development
  // const ready = await ensureImagePickerReady();
  // if (!ready.ok) {
  //   showRebuildAlert('camera');
  //   return { cancelled: true };
  // }

  try {
    // (Optional) request permissions explicitly if available
    if (ExpoImagePicker.requestCameraPermissionsAsync) {
      const perm = await ExpoImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.');
        return { cancelled: true };
      }
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // Reduced quality for performance
      base64: false,
      exif: false, // Disable EXIF data for smaller files
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true };
    }

    const imageUri = result.assets[0].uri;
    console.log('Uploading camera photo to Firebase Storage...', { folder, filename });

    // Automatically upload to Firebase Storage
    const downloadURL = await storageService.uploadImage(imageUri, folder, filename);
    console.log('Camera photo uploaded successfully:', downloadURL);

    return { cancelled: false, downloadURL };
  } catch (e) {
    console.error('[ImagePickerHelper] takePhotoWithCameraAndUpload error', e);
    Alert.alert('Hata', `Fotoğraf yüklenirken bir hata oluştu: ${e.message}`);
    return { cancelled: true, error: e };
  }
}

export async function pickImageFromLibrary() {
  // Temporarily bypass native check for development
  // const ready = await ensureImagePickerReady();
  // if (!ready.ok) {
  //   showRebuildAlert('library');
  //   return { cancelled: true };
  // }
  try {
    return await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });
  } catch (e) {
    console.error('[ImagePickerHelper] launchImageLibraryAsync error', e);
    Alert.alert('Hata', `Galeri açılırken bir hata oluştu: ${e.message}`);
    return { cancelled: true, error: e };
  }
}

export async function takePhotoWithCamera() {
  // Temporarily bypass native check for development
  // const ready = await ensureImagePickerReady();
  // if (!ready.ok) {
  //   showRebuildAlert('camera');
  //   return { cancelled: true };
  // }
  try {
    // (Optional) request permissions explicitly if available
    if (ExpoImagePicker.requestCameraPermissionsAsync) {
      const perm = await ExpoImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.');
        return { cancelled: true };
      }
    }
    return await ExpoImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });
  } catch (e) {
    console.error('[ImagePickerHelper] launchCameraAsync error', e);
    Alert.alert('Hata', `Kamera açılırken bir hata oluştu: ${e.message}`);
    return { cancelled: true, error: e };
  }
}
