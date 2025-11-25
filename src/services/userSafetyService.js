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

    await Promise.all([
      updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(targetUserId),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(targetUserRef, {
        blockedByUsers: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      }),
      this.removeMutualFollows(currentUser.uid, targetUserId),
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

    const payload = {
      targetUserId: reportData.targetUserId,
      targetUserEmail: reportData.targetUserEmail || '',
      targetUserName: reportData.targetUserName || '',
      reporterId: currentUser.uid,
      reporterEmail: reportData.reporterEmail || currentUser.email || '',
      subject: reportData.subject.slice(0, 120),
      category: reportData.category || 'other',
      description: reportData.description,
      attachments: reportData.attachments || [],
      createdAt: serverTimestamp(),
      status: 'received',
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

