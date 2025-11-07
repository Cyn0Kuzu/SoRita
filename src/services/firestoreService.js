import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../config/firebase';

export class FirestoreService {
  // Places Collection Operations
  static async addPlace(placeData) {
    try {
      const docRef = await addDoc(collection(db, 'places'), {
        ...placeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding place:', error);
      throw error;
    }
  }

  static async getPlace(placeId) {
    try {
      const docRef = doc(db, 'places', placeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Place not found');
      }
    } catch (error) {
      console.error('Error getting place:', error);
      throw error;
    }
  }

  static async getPlaces(filters = {}) {
    try {
      const placesCollection = collection(db, 'places');
      const queries = [];

      if (filters.category) {
        queries.push(where('category', '==', filters.category));
      }

      if (filters.city) {
        queries.push(where('city', '==', filters.city));
      }

      queries.push(orderBy('createdAt', 'desc'));

      if (filters.limit) {
        queries.push(limit(filters.limit));
      }

      const q = query(placesCollection, ...queries);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting places:', error);
      throw error;
    }
  }

  // User Lists Operations
  static async addUserList(userId, listData) {
    try {
      const docRef = await addDoc(collection(db, 'lists'), {
        ...listData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding user list:', error);
      throw error;
    }
  }

  static async getUserLists(userId) {
    try {
      const q = query(
        collection(db, 'lists'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting user lists:', error);
      throw error;
    }
  }

  static async updateList(listId, listData) {
    try {
      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        ...listData,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ [FirestoreService] List updated successfully:', listId);
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  }

  static async deleteList(listId) {
    try {
      const listRef = doc(db, 'lists', listId);
      await deleteDoc(listRef);
      console.log('✅ [FirestoreService] List deleted successfully:', listId);
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  }

  // Reviews Operations
  static async addReview(reviewData) {
    try {
      const docRef = await addDoc(collection(db, 'reviews'), {
        ...reviewData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  static async getPlaceReviews(placeId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('placeId', '==', placeId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting place reviews:', error);
      throw error;
    }
  }

  // User Profile Operations
  static async createUserProfile(userId, userData) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Real-time listeners
  static listenToPlaces(callback, filters = {}) {
    const placesCollection = collection(db, 'places');
    const queries = [];

    if (filters.category) {
      queries.push(where('category', '==', filters.category));
    }

    queries.push(orderBy('createdAt', 'desc'));

    const q = query(placesCollection, ...queries);

    return onSnapshot(q, (querySnapshot) => {
      const places = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(places);
    });
  }

  static listenToUserLists(userId, callback) {
    const q = query(
      collection(db, 'lists'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const lists = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(lists);
    });
  }
}

export default FirestoreService;
