// Firebase configuration with crash protection
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork, initializeFirestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqV8fgC6485ZKTb2pg5-gVXbL9-E45g34",
  authDomain: "sorita-6d27e.firebaseapp.com",
  projectId: "sorita-6d27e",
  storageBucket: "sorita-6d27e.firebasestorage.app",
  messagingSenderId: "1062599764816",
  appId: "1:1062599764816:web:6c413021894e9a4a719a55",
  measurementId: "G-3KQNJLF17H"
};

let app, db, auth, storage;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firestore with safe settings
  try {
    db = initializeFirestore(app, {
      cacheSizeBytes: 20 * 1024 * 1024, // 20 MB cache (reduced for stability)
      experimentalForceLongPolling: false,
    });
  } catch (e) {
    console.log('Firestore init fallback');
    db = getFirestore(app);
  }

  // Initialize other Firebase services
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create dummy objects to prevent crashes
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not initialized')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not initialized')),
    signOut: () => Promise.reject(new Error('Firebase not initialized')),
  };
  db = null;
  storage = null;
}

// Null check fonksiyonları ekle
export const isFirebaseReady = () => {
  return app && db && auth && storage;
};

export const getFirebaseError = () => {
  if (!app) return 'Firebase app not initialized';
  if (!db) return 'Firestore not initialized';
  if (!auth) return 'Auth not initialized';
  if (!storage) return 'Storage not initialized';
  return null;
};

export { db, auth, storage };

// Firebase emulators devre dışı - gerçek Firebase kullanıyoruz
/*
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // Firebase emulators kullanarak test yapıyoruz
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