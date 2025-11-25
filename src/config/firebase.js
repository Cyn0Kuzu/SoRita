// Firebase configuration with crash protection
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: 20 * 1024 * 1024,
    experimentalForceLongPolling: false,
  });
} catch (e) {
  console.log('Firestore init fallback');
  db = getFirestore(app);
}

let auth;
try {
  // Try to initialize auth with persistent storage (React Native specific)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized, reuse existing instance
  auth = getAuth(app);
}

const storage = getStorage(app);
const functions = getFunctions(app);

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

export { app, db, auth, storage, functions };

// Firebase emulators devre dışı - gerçek Firebase kullanıyoruz
/*
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // Firebase emulators kullanarak test yapıyoruz
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log(' Firebase emulators connected');
  } catch (error) {
    console.warn(' Firebase emulators connection failed:', error.message);
  }
}
*/

export default app;