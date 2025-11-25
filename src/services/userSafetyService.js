import { auth, db, functions } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  where,
  query,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

class UserSafetyService {
  static async blockUser(targetUserId, metadata = {}) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Oturum bulunamadı.');
    }
    if (!targetUserId || currentUser.uid === targetUserId) {
      throw new Error('Bu kullanıcı engellenemez.');
    }

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUserId);

    // Remove mutual follows and update user arrays
    await this.removeMutualFollows(currentUser.uid, targetUserId);

    await Promise.all([
      updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(targetUserId),
        following: arrayRemove(targetUserId),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(targetUserRef, {
        blockedByUsers: arrayUnion(currentUser.uid),
        followers: arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp(),
      }),
      addDoc(collection(db, 'blocks'), {
        blockerId: currentUser.uid,
        blockedId: targetUserId,
        createdAt: serverTimestamp(),
        reason: metadata.reason || '',
        context: metadata.context || 'profile_action',
      }),
    ]);
  }

  static async unblockUser(targetUserId) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Oturum bulunamadı.');
    }
    if (!targetUserId || currentUser.uid === targetUserId) {
      return;
    }

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUserId);

    await Promise.all([
      updateDoc(currentUserRef, {
        blockedUsers: arrayRemove(targetUserId),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(targetUserRef, {
        blockedByUsers: arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp(),
      }),
    ]);
  }

  static async removeMutualFollows(currentUserId, targetUserId) {
    const followsRef = collection(db, 'follows');
    const queries = [
      query(
        followsRef,
        where('followerId', '==', currentUserId),
        where('followedUserId', '==', targetUserId)
      ),
      query(
        followsRef,
        where('followerId', '==', targetUserId),
        where('followedUserId', '==', currentUserId)
      ),
    ];

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
    const deletions = snapshots.flatMap((snap) =>
      snap.docs.map((docSnap) => deleteDoc(docSnap.ref))
    );
    await Promise.all(deletions);

    // Also remove from users collection following/followers arrays
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(currentUserRef),
      getDoc(targetUserRef),
    ]);

    const currentUserData = currentUserDoc.data() || {};
    const targetUserData = targetUserDoc.data() || {};

    const updatePromises = [];

    // Remove targetUserId from currentUser's following array if exists
    if (Array.isArray(currentUserData.following) && currentUserData.following.includes(targetUserId)) {
      updatePromises.push(
        updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId),
          followingCount: increment(-1),
        })
      );
    }

    // Remove currentUserId from targetUser's followers array if exists
    if (Array.isArray(targetUserData.followers) && targetUserData.followers.includes(currentUserId)) {
      updatePromises.push(
        updateDoc(targetUserRef, {
          followers: arrayRemove(currentUserId),
          followersCount: increment(-1),
        })
      );
    }

    // Remove currentUserId from targetUser's following array if exists
    if (Array.isArray(targetUserData.following) && targetUserData.following.includes(currentUserId)) {
      updatePromises.push(
        updateDoc(targetUserRef, {
          following: arrayRemove(currentUserId),
          followingCount: increment(-1),
        })
      );
    }

    // Remove targetUserId from currentUser's followers array if exists
    if (Array.isArray(currentUserData.followers) && currentUserData.followers.includes(targetUserId)) {
      updatePromises.push(
        updateDoc(currentUserRef, {
          followers: arrayRemove(targetUserId),
          followersCount: increment(-1),
        })
      );
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  }

  static async getBlockedUsers(currentUserId = auth.currentUser?.uid) {
    if (!currentUserId) {
      return [];
    }

    const userDoc = await getDoc(doc(db, 'users', currentUserId));
    const blockedIds = userDoc.data()?.blockedUsers || [];
    if (!blockedIds.length) {
      return [];
    }

    const blockedDocs = await Promise.all(
      blockedIds.map(async (id) => {
        const snapshot = await getDoc(doc(db, 'users', id));
        if (!snapshot.exists()) {
          return null;
        }
        return { id: snapshot.id, ...snapshot.data() };
      })
    );

    return blockedDocs.filter(Boolean);
  }

  static async getBlockStatus(targetUserId, currentUserId = auth.currentUser?.uid) {
    if (!targetUserId || !currentUserId) {
      return { iBlocked: false, blockedMe: false };
    }

    const [currentDoc, targetDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId)),
    ]);

    const currentData = currentDoc.data() || {};
    const targetData = targetDoc.data() || {};

    return {
      iBlocked: Array.isArray(currentData.blockedUsers)
        ? currentData.blockedUsers.includes(targetUserId)
        : false,
      blockedMe: Array.isArray(targetData.blockedUsers)
        ? targetData.blockedUsers.includes(currentUserId)
        : false,
    };
  }

  static async submitUserReport(reportData) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Oturum bulunamadı.');
    }

    const requiredFields = ['targetUserId', 'subject', 'description'];
    for (const field of requiredFields) {
      if (!reportData[field]) {
        throw new Error('Lütfen tüm alanları doldurun.');
      }
    }

    // Validate categories array
    const categories = Array.isArray(reportData.categories) 
      ? reportData.categories 
      : (reportData.category ? [reportData.category] : ['other']);

    if (categories.length === 0) {
      throw new Error('En az bir kategori seçmelisiniz.');
    }

    const payload = {
      targetUserId: reportData.targetUserId,
      targetUserEmail: reportData.targetUserEmail || '',
      targetUserName: reportData.targetUserName || '',
      reporterId: currentUser.uid,
      reporterEmail: reportData.reporterEmail || currentUser.email || '',
      subject: reportData.subject.slice(0, 120),
      categories: categories, // Multiple categories support
      category: categories[0], // Keep first category for backward compatibility
      description: reportData.description,
      attachments: reportData.attachments || [],
      attachmentUrls: reportData.attachmentUrls || [],
      createdAt: serverTimestamp(),
      status: 'received',
      priority: reportData.priority || 'normal',
    };

    await addDoc(collection(db, 'reports'), payload);

    try {
      const callable = httpsCallable(functions, 'sendReportEmail');
      await callable({
        ...payload,
        humanTime: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Report email could not be sent but was logged:', error.message);
    }
  }

  static filterItemsByBlockStatus(items = [], currentUserData = {}) {
    const blockedUsers = new Set(currentUserData.blockedUsers || []);
    const blockedByUsers = new Set(currentUserData.blockedByUsers || []);

    if (!blockedUsers.size && !blockedByUsers.size) {
      return items;
    }

    return items.filter((item) => {
      const ownerId = item?.userId || item?.ownerId;
      if (!ownerId) {
        return true;
      }
      return !blockedUsers.has(ownerId) && !blockedByUsers.has(ownerId);
    });
  }
}

export default UserSafetyService;

