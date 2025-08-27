# Firebase Setup Guide for SoRita App

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

If you have permission issues on Windows, run Command Prompt as Administrator.

## Step 2: Login to Firebase

```bash
firebase login
```

This will open your browser to authenticate with Google.

## Step 3: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "sorita-app" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 4: Initialize Firebase in Your Project

Navigate to your project directory and run:

```bash
cd "c:\Users\lenovo\Desktop\SoRita"
firebase init
```

Select the following options:
- ✅ Firestore: Configure security rules and indexes files for Firestore
- ✅ Hosting: Configure files for Firebase Hosting and (optionally) GitHub Action deploys

When prompted:
- Select your Firebase project (sorita-app)
- Accept default firestore.rules file
- Accept default firestore.indexes.json file
- Set public directory to: `build` (for React Native Web builds)
- Configure as single-page app: `Yes`
- Set up automatic builds: `No` (for now)

## Step 5: Add Firebase SDK to Your App

Install Firebase SDK:

```bash
npm install firebase
```

## Step 6: Get Your Firebase Config

1. Go to Firebase Console → Your Project
2. Click the gear icon → Project settings
3. Scroll down to "Your apps" section
4. Click "Add app" → Web app (</>) 
5. Register app name: "SoRita"
6. Copy the Firebase config object

## Step 7: Update Firebase Configuration

Replace the config in `src/config/firebase.js` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id", 
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## Step 8: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll deploy proper rules later)
4. Select a location (choose closest to Turkey, like `europe-west1`)
5. Click "Done"

## Step 9: Deploy Firestore Rules

```bash
firebase deploy --only firestore
```

This will deploy the security rules we created.

## Step 10: Test Firebase Connection

Add this to your App.js to test the connection:

```javascript
import { db } from './src/config/firebase';
import { collection, addDoc } from 'firebase/firestore';

// Test function (remove after testing)
const testFirebase = async () => {
  try {
    await addDoc(collection(db, 'test'), {
      message: 'Firebase connected!',
      timestamp: new Date()
    });
    console.log('✅ Firebase connected successfully!');
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
  }
};
```

## Step 11: Build and Deploy to Hosting (Optional)

If you want to deploy a web version:

```bash
# Build your React Native Web version
npx expo build:web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Firestore Collections Structure

Your app will use these collections:

### Users Collection
```javascript
{
  id: 'userId',
  name: 'User Name',
  email: 'user@example.com',
  avatar: 'url_to_image',
  createdAt: Date,
  updatedAt: Date
}
```

### Places Collection
```javascript
{
  id: 'placeId',
  name: 'Place Name',
  address: 'Address',
  coordinates: { lat: 40.123, lng: 29.456 },
  category: 'restaurant|cafe|attraction',
  rating: 4.5,
  images: ['url1', 'url2'],
  description: 'Place description',
  city: 'Istanbul',
  createdAt: Date,
  updatedAt: Date
}
```

### Lists Collection  
```javascript
{
  id: 'listId',
  userId: 'userId',
  name: 'My Favorites',
  description: 'My favorite places',
  places: ['placeId1', 'placeId2'],
  isPublic: false,
  createdAt: Date,
  updatedAt: Date
}
```

### Reviews Collection
```javascript
{
  id: 'reviewId',
  placeId: 'placeId',
  userId: 'userId',
  rating: 5,
  comment: 'Great place!',
  images: ['url1', 'url2'],
  createdAt: Date,
  updatedAt: Date
}
```

## Usage in Your App

```javascript
import FirestoreService from './src/services/firestoreService';

// Add a new place
const placeData = {
  name: 'Great Restaurant',
  address: 'Istanbul, Turkey',
  category: 'restaurant',
  rating: 4.5
};

const placeId = await FirestoreService.addPlace(placeData);

// Get places
const places = await FirestoreService.getPlaces({ category: 'restaurant' });

// Listen to real-time updates
FirestoreService.listenToPlaces((places) => {
  console.log('Updated places:', places);
});
```

## Security Notes

- Never commit your actual Firebase config with API keys to public repositories
- The Firestore rules are set for authenticated users only
- Test mode expires after 30 days - make sure to deploy proper rules
- Consider using environment variables for sensitive config

## Next Steps

1. Set up Firebase Authentication for user login
2. Add image upload functionality with Firebase Storage  
3. Implement push notifications with Firebase Messaging
4. Add analytics with Firebase Analytics
5. Set up Firebase Functions for server-side logic