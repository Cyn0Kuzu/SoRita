// Firebase configuration with crash protection
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  initializeFirestore,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Get Firebase config from app.json
const firebaseConfig = Constants.expoConfig.extra.firebase;

let app, db, auth, storage;

try {
  // Check if all firebase config values are present
  if (!firebaseConfig || Object.values(firebaseConfig).some(value => value.startsWith('${'))) {
    throw new Error('Firebase config is missing or not replaced by environment variables. Check your .env file and eas.json configuration.');
  }

  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firestore with safe settings
  try {
    db = initializeFirestore(app, {
      cacheSizeBytes: 20 * 1024 * 1024, // 20 MB cache (reduced for stability)
      experimentalForceLongPolling: false,
    });
  } catch (e) {
    console.warn('Firestore init fallback to getFirestore()');
    db = getFirestore(app);
  }

  // Initialize other Firebase services
  auth = getAuth(app);
  storage = getStorage(app);

} catch (error) {
  console.error('Firebase initialization error:', error.message);
  // Create dummy objects to prevent crashes in development
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not initialized')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not initialized')),
    signOut: () => Promise.reject(new Error('Firebase not initialized')),
  };
  db = null;
  storage = null;
}

// Helper functions to check Firebase readiness
export const isFirebaseReady = () => {
  return !!(app && db && auth && storage);
};

export const getFirebaseError = () => {
  if (!app) return 'Firebase app not initialized';
  if (!db) return 'Firestore not initialized';
  if (!auth) return 'Auth not initialized';
  if (!storage) return 'Storage not initialized';
  return null;
};

export { db, auth, storage };

// Note: Firebase emulators are disabled for production.
// To enable them for development, uncomment the following block.
/*
if (__DEV__) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('🔧 Firebase emulators connected');
  } catch (error) {
    console.warn('⚠️ Firebase emulators connection failed:', error.message);
  }
}
*/

export default app;
