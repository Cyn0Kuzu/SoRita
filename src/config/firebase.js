// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork, initializeFirestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
// Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCqV8fgC6485ZKTb2pg5-gVXbL9-E45g34", // Web API key
  authDomain: "sorita-6d27e.firebaseapp.com",
  projectId: "sorita-6d27e",
  storageBucket: "sorita-6d27e.firebasestorage.app",
  messagingSenderId: "1062599764816",
  appId: "1:1062599764816:web:6c413021894e9a4a719a55", // Web App ID
  measurementId: "G-3KQNJLF17H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with optimized settings for better connection stability
export const db = initializeFirestore(app, {
  cacheSizeBytes: 40 * 1024 * 1024, // 40 MB cache
  experimentalForceLongPolling: false, // Use WebSocket when available
});

// Initialize other Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

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