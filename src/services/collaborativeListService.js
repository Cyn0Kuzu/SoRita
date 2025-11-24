import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateColorAssignments } from '../utils/collaboratorColors';
import { sendListInvitationAcceptedNotification } from './notificationService';

export class CollaborativeListService {
  
  // Davet kabul edildiğinde listeyi güncelle
  static async acceptInvitation(listId, userId, userData) {
    try {
      console.log(' [CollaborativeListService] Accepting invitation...', { listId, userId });
      
      // userData'yı kontrol et ve varsayılan değerler ata
      if (!userData || typeof userData !== 'object') {
        console.warn(' [CollaborativeListService] userData is missing, using defaults');
        userData = {
          firstName: 'Kullanıcı',
          lastName: '',
          displayName: 'Kullanıcı',
          avatar: '',
          username: 'user'
        };
      }
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      const currentCollaborators = listData.collaborators || [];
      const currentCollaboratorDetails = listData.collaboratorDetails || {};
      const currentColorAssignments = listData.colorAssignments || {};
      
      // Kullanıcı zaten işbirlikçi mi kontrol et
      if (currentCollaborators.includes(userId)) {
        console.log(' [CollaborativeListService] User already a collaborator');
        return { success: true, message: 'Zaten bu listenin üyesisiniz' };
      }
      
      // Yeni işbirlikçi bilgilerini hazırla
      const collaboratorInfo = {
        id: userId,
        firstName: userData.firstName || 'İsimsiz',
        lastName: userData.lastName || '',
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        avatar: userData.avatar || userData.photoURL || '',
        username: userData.username || '',
        joinedAt: new Date().toISOString(),
        addedPlacesCount: 0
      };
      
      // Tüm işbirlikçiler için renk atamaları güncelle
      // Liste sahibi her zaman ilk sırada olmalı
      const allCollaborators = [listData.userId, ...currentCollaborators.filter(id => id !== listData.userId), userId];
      
      const newColorAssignments = {
        ...currentColorAssignments,
        ...generateColorAssignments(allCollaborators.filter(id => !currentColorAssignments[id]))
      };
      
      // Liste güncelle
      await updateDoc(listRef, {
        collaborators: arrayUnion(userId),
        collaboratorDetails: {
          ...currentCollaboratorDetails,
          [userId]: collaboratorInfo
        },
        colorAssignments: newColorAssignments,
        updatedAt: serverTimestamp(),
        lastActivity: {
          type: 'member_joined',
          userId: userId,
          userName: collaboratorInfo.displayName,
          timestamp: serverTimestamp()
        }
      });
      
      console.log(' [CollaborativeListService] Invitation accepted successfully');
      
      // Liste sahibine bildirim gönder
      try {
        await sendListInvitationAcceptedNotification({
          fromUserId: userId,
          fromUserName: collaboratorInfo.displayName,
          fromUserAvatar: collaboratorInfo.avatar,
          toUserId: listData.userId,
          listId: listId,
          listName: listData.name || 'İsimsiz Liste'
        });
        console.log(' [CollaborativeListService] Notification sent to list owner');
      } catch (notificationError) {
        console.error(' [CollaborativeListService] Failed to send notification to list owner:', notificationError);
        // Bildirim hatası ana işlemi durdurmasın
      }
      
      return { success: true, message: 'Liste davetini başarıyla kabul ettiniz' };
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error accepting invitation:', error);
      
      // Offline durumunu kontrol et
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        throw new Error('Şu anda çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
      }
      
      throw error;
    }
  }
  
  // İşbirlikçiyi listeden çıkar
  static async removeCollaborator(listId, userId, currentUserId) {
    try {
      console.log(' [CollaborativeListService] Removing collaborator...', { listId, userId, currentUserId });
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      
      // Sadece liste sahibi veya kullanıcının kendisi çıkarabilir
      if (listData.userId !== currentUserId && userId !== currentUserId) {
        throw new Error('Bu işlem için yetkiniz yok');
      }
      
      const currentCollaborators = listData.collaborators || [];
      const currentCollaboratorDetails = listData.collaboratorDetails || {};
      const currentColorAssignments = listData.colorAssignments || {};
      
      // Kullanıcı işbirlikçi mi kontrol et
      if (!currentCollaborators.includes(userId)) {
        console.log(' [CollaborativeListService] User is not a collaborator');
        return { success: true, message: 'Kullanıcı zaten bu listede değil' };
      }
      
      // İşbirlikçi detaylarını ve renk atamalarını temizle
      const updatedCollaboratorDetails = { ...currentCollaboratorDetails };
      delete updatedCollaboratorDetails[userId];
      
      const updatedColorAssignments = { ...currentColorAssignments };
      delete updatedColorAssignments[userId];
      
      // Liste güncelle
      await updateDoc(listRef, {
        collaborators: arrayRemove(userId),
        collaboratorDetails: updatedCollaboratorDetails,
        colorAssignments: updatedColorAssignments,
        updatedAt: serverTimestamp(),
        lastActivity: {
          type: 'member_left',
          userId: userId,
          userName: currentCollaboratorDetails[userId]?.displayName || 'Kullanıcı',
          timestamp: serverTimestamp()
        }
      });
      
      console.log(' [CollaborativeListService] Collaborator removed successfully');
      return { success: true, message: 'Üye başarıyla çıkarıldı' };
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error removing collaborator:', error);
      throw error;
    }
  }
  
  // Liste bilgilerini güncel member ve place sayıları ile birlikte getir
  static async getListWithSyncedCounts(listId) {
    try {
      console.log(' [CollaborativeListService] Getting synced list counts for:', listId);
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      const members = await this.getListMembers(listId);
      
      // Gerçek member sayısı ve toplam yer sayısı
      const actualMemberCount = members.length;
      const totalPlacesCount = members.reduce((sum, member) => sum + (member.addedPlacesCount || 0), 0);
      
      console.log(` [CollaborativeListService] Synced counts - Members: ${actualMemberCount}, Places: ${totalPlacesCount}`);
      
      return {
        ...listData,
        id: listId,
        actualMemberCount,
        totalPlacesCount,
        placesCount: (listData.places || []).length, // Gerçek yer sayısı
        syncedMembers: members
      };
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error getting synced list counts:', error);
      throw error;
    }
  }

  // Kullanıcının ortak listelerini getir
  static async getUserCollaborativeLists(userId) {
    try {
      console.log(' [CollaborativeListService] Getting user collaborative lists...', userId);
      
      // Kullanıcının işbirlikçi olduğu listeleri bul
      const listsQuery = query(
        collection(db, 'lists'),
        where('collaborators', 'array-contains', userId)
      );
      
      const querySnapshot = await getDocs(listsQuery);
      const collaborativeLists = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        collaborativeLists.push({
          id: doc.id,
          ...data,
          isCollaborative: true,
          userRole: data.userId === userId ? 'owner' : 'collaborator'
        });
      });
      
      console.log(` [CollaborativeListService] Found ${collaborativeLists.length} collaborative lists`);
      return collaborativeLists;
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error getting collaborative lists:', error);
      
      // Offline durumunda boş array döndür
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log(' [CollaborativeListService] Offline mode - returning empty lists');
        return [];
      }
      
      throw error;
    }
  }
  
  // Listeye yer ekle (renk ataması ile)
  static async addPlaceToList(listId, placeData, userId) {
    try {
      console.log(' [CollaborativeListService] Adding place to collaborative list...', { listId, userId });
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      const colorAssignments = listData.colorAssignments || {};
      const collaboratorDetails = listData.collaboratorDetails || {};
      
      // Kullanıcının rengini al
      const userColor = colorAssignments[userId];
      if (!userColor) {
        throw new Error('Kullanıcı rengi bulunamadı');
      }
      
      // Yer verisini hazırla
      const processedPlace = {
        ...placeData,
        addedBy: userId,
        addedAt: new Date().toISOString(),
        userColor: userColor,
        id: `${listId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Liste güncelle
      const currentPlaces = listData.places || [];
      await updateDoc(listRef, {
        places: arrayUnion(processedPlace),
        placesCount: currentPlaces.length + 1,
        updatedAt: serverTimestamp(),
        lastActivity: {
          type: 'place_added',
          userId: userId,
          userName: collaboratorDetails[userId]?.displayName || 'Bilinmeyen Kullanıcı',
          placeName: placeData.name,
          timestamp: serverTimestamp()
        },
        [`collaboratorDetails.${userId}.addedPlacesCount`]: (collaboratorDetails[userId]?.addedPlacesCount || 0) + 1
      });
      
      console.log(' [CollaborativeListService] Place added successfully');
      return processedPlace;
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error adding place:', error);
      
      // Offline durumunu kontrol et
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        throw new Error('Şu anda çevrimdışısınız. Yer eklemek için internet bağlantınızı kontrol edin.');
      }
      
      throw error;
    }
  }
  
  // Helper method to calculate user's added places count
  static calculateUserAddedPlaces(listData, userId) {
    const places = listData.places || [];
    
    if (places.length === 0) {
      return 0;
    }
    
    // Liste sahibi özel durum
    if (userId === listData.userId) {
      // Liste sahibi için: önce kendisine atanan yerler
      const explicitlyAssigned = places.filter(p => p.addedBy === userId);
      
      // Eğer hiç yer kendisine atanmamışsa, atanmamış yerleri ona ver
      if (explicitlyAssigned.length === 0) {
        const unassignedPlaces = places.filter(p => !p.addedBy);
        if (unassignedPlaces.length > 0) {
          console.log(` [CollaborativeListService] Owner getting ${unassignedPlaces.length} unassigned places`);
          return unassignedPlaces.length;
        }
      }
      
      return explicitlyAssigned.length;
    }
    
    // İşbirlikçiler için: sadece açıkça kendilerine atanan yerler
    return places.filter(p => p.addedBy === userId).length;
  }

  // Liste üyelerini getir
  static async getListMembers(listId) {
    try {
      console.log(' [CollaborativeListService] Getting list members...', listId);
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      const collaboratorDetails = listData.collaboratorDetails || {};
      const colorAssignments = listData.colorAssignments || {};
      
      const members = [];
      
      // Liste sahibi için gerçek kullanıcı bilgilerini çek
      try {
        const ownerRef = doc(db, 'users', listData.userId);
        const ownerDoc = await getDoc(ownerRef);
        const ownerUserData = ownerDoc.exists() ? ownerDoc.data() : {};
        
        const ownerDetails = collaboratorDetails[listData.userId] || {};
        const ownerInfo = {
          id: listData.userId,
          firstName: ownerUserData.firstName || ownerDetails.firstName || 'Liste',
          lastName: ownerUserData.lastName || ownerDetails.lastName || '',
          displayName: ownerUserData.displayName || ownerDetails.displayName || 
                      `${ownerUserData.firstName || ''} ${ownerUserData.lastName || ''}`.trim() || 'Liste Sahibi',
          avatar: ownerUserData.avatar || ownerDetails.avatar || '',
          username: ownerUserData.username || ownerDetails.username || '',
          role: 'owner',
          color: colorAssignments[listData.userId] || '#007AFF',
          joinedAt: listData.createdAt,
          addedPlacesCount: this.calculateUserAddedPlaces(listData, listData.userId)
        };
        members.push(ownerInfo);
      } catch (ownerError) {
        console.warn(' [CollaborativeListService] Error loading owner data:', ownerError);
        // Fallback to stored data
        const ownerDetails = collaboratorDetails[listData.userId] || {};
        const ownerInfo = {
          id: listData.userId,
          firstName: ownerDetails.firstName || 'Liste',
          lastName: ownerDetails.lastName || '',
          displayName: ownerDetails.displayName || 'Liste Sahibi',
          avatar: ownerDetails.avatar || '',
          username: ownerDetails.username || '',
          role: 'owner',
          color: colorAssignments[listData.userId] || '#007AFF',
          joinedAt: listData.createdAt,
          addedPlacesCount: this.calculateUserAddedPlaces(listData, listData.userId)
        };
        members.push(ownerInfo);
      }
      
      // İşbirlikçiler için gerçek kullanıcı bilgilerini çek
      const collaborators = listData.collaborators || [];
      for (const collaboratorId of collaborators) {
        if (collaboratorId !== listData.userId) {
          try {
            const userRef = doc(db, 'users', collaboratorId);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            const collaboratorInfo = collaboratorDetails[collaboratorId] || {};
            
            members.push({
              id: collaboratorId,
              firstName: userData.firstName || collaboratorInfo.firstName || 'İsimsiz',
              lastName: userData.lastName || collaboratorInfo.lastName || '',
              displayName: userData.displayName || collaboratorInfo.displayName || 
                          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'İsimsiz Kullanıcı',
              avatar: userData.avatar || collaboratorInfo.avatar || '',
              username: userData.username || collaboratorInfo.username || '',
              role: 'collaborator',
              color: colorAssignments[collaboratorId] || '#ccc',
              joinedAt: collaboratorInfo.joinedAt || listData.createdAt || serverTimestamp(),
              addedPlacesCount: this.calculateUserAddedPlaces(listData, collaboratorId)
            });
          } catch (userError) {
            console.warn(` [CollaborativeListService] Error loading user data for ${collaboratorId}:`, userError);
            // Fallback to stored data
            const collaboratorInfo = collaboratorDetails[collaboratorId];
            if (collaboratorInfo) {
              members.push({
                ...collaboratorInfo,
                role: 'collaborator',
                color: colorAssignments[collaboratorId] || '#ccc',
                joinedAt: collaboratorInfo.joinedAt || listData.createdAt || serverTimestamp(),
                addedPlacesCount: this.calculateUserAddedPlaces(listData, collaboratorId)
              });
            }
          }
        }
      }
      
      console.log(` [CollaborativeListService] Found ${members.length} members with detailed info`);
      
      return members;
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error getting members:', error);
      
      // Offline durumunda boş array döndür
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log(' [CollaborativeListService] Offline mode - returning empty members list');
        return [];
      }
      
      throw error;
    }
  }
  
  // Üyeyi listeden çıkar
  static async removeMember(listId, memberId, currentUserId) {
    try {
      console.log(' [CollaborativeListService] Removing member...', { listId, memberId, currentUserId });
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      
      // Sadece liste sahibi üye çıkarabilir
      if (listData.userId !== currentUserId) {
        throw new Error('Sadece liste sahibi üye çıkarabilir');
      }
      
      // Liste sahibi kendini çıkaramaz
      if (memberId === listData.userId) {
        throw new Error('Liste sahibi kendini çıkaramaz');
      }
      
      const collaboratorDetails = listData.collaboratorDetails || {};
      const memberName = collaboratorDetails[memberId]?.displayName || 'Bilinmeyen Kullanıcı';
      
      // Üyeyi çıkar
      await updateDoc(listRef, {
        collaborators: arrayRemove(memberId),
        [`collaboratorDetails.${memberId}`]: null, // Firebase'de silmek için
        updatedAt: serverTimestamp(),
        lastActivity: {
          type: 'member_removed',
          userId: currentUserId,
          removedUserId: memberId,
          removedUserName: memberName,
          timestamp: serverTimestamp()
        }
      });
      
      console.log(' [CollaborativeListService] Member removed successfully');
      return { success: true, message: 'Üye başarıyla çıkarıldı' };
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error removing member:', error);
      
      // Offline durumunu kontrol et
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        throw new Error('Şu anda çevrimdışısınız. Üye çıkarmak için internet bağlantınızı kontrol edin.');
      }
      
      throw error;
    }
  }
  
  // Liste aktivitelerini getir
  static async getListActivities(listId, limitCount = 20) {
    try {
      console.log(' [CollaborativeListService] Getting list activities...', listId);
      
      const activitiesQuery = query(
        collection(db, 'lists', listId, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];
      
      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(` [CollaborativeListService] Found ${activities.length} activities`);
      return activities;
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error getting activities:', error);
      
      // Offline durumunda her zaman boş array döndür
      if (error.code === 'unavailable' || error.message.includes('offline')) {
        console.log(' [CollaborativeListService] Offline mode - returning empty activities');
      }
      
      return [];
    }
  }

  // ColorAssignments'ı yeniden oluştur ve güncelle (renk tutarsızlığı durumunda)
  static async refreshColorAssignments(listId) {
    try {
      console.log(' [CollaborativeListService] Refreshing color assignments for list:', listId);
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) {
        throw new Error('Liste bulunamadı');
      }
      
      const listData = listDoc.data();
      const allParticipants = [listData.userId]; // Liste sahibi
      
      // Tüm işbirlikçileri ekle
      if (listData.collaborators && listData.collaborators.length > 0) {
        allParticipants.push(...listData.collaborators);
      }
      
      // Yeni renk atamaları oluştur
      const newColorAssignments = generateColorAssignments(allParticipants);
      
      // Listeyi güncelle
      await updateDoc(listRef, {
        colorAssignments: newColorAssignments,
        updatedAt: serverTimestamp()
      });
      
      console.log(' [CollaborativeListService] Color assignments refreshed:', newColorAssignments);
      return newColorAssignments;
    } catch (error) {
      console.error(' [CollaborativeListService] Error refreshing color assignments:', error);
      throw error;
    }
  }

  // Kullanıcının üye olduğu tüm listeleri getir (hem kendi hem collaborative)
  static async getAllUserLists(userId) {
    try {
      console.log(' [CollaborativeListService] Getting all user lists for:', userId);
      
      const allLists = [];
      const seenListIds = new Set();
      
      try {
        // Kullanıcının kendi listeleri (basit sorgu - sadece userId)
        console.log(' [CollaborativeListService] Getting own lists...');
        const ownListsQuery = query(
          collection(db, 'lists'),
          where('userId', '==', userId)
        );
        
        const ownListsSnap = await getDocs(ownListsQuery);
        console.log(' [CollaborativeListService] Own lists query successful:', ownListsSnap.size);
        
        // Kendi listelerini ekle
        ownListsSnap.forEach((doc) => {
          const listData = { id: doc.id, ...doc.data() };
          allLists.push(listData);
          seenListIds.add(doc.id);
        });
        
      } catch (ownError) {
        console.error(' [CollaborativeListService] Error getting own lists:', ownError);
      }
      
      try {
        // Kullanıcının üye olduğu collaborative listeler (basit sorgu - sadece collaborators)
        console.log(' [CollaborativeListService] Getting collaborative lists...');
        const collaborativeListsQuery = query(
          collection(db, 'lists'),
          where('collaborators', 'array-contains', userId)
        );
        
        const collaborativeListsSnap = await getDocs(collaborativeListsQuery);
        console.log(' [CollaborativeListService] Collaborative lists query successful:', collaborativeListsSnap.size);
        
        // Collaborative listeleri ekle (duplicate kontrolü ile)
        collaborativeListsSnap.forEach((doc) => {
          if (!seenListIds.has(doc.id)) {
            const listData = { id: doc.id, ...doc.data() };
            allLists.push(listData);
            seenListIds.add(doc.id);
          }
        });
        
      } catch (collabError) {
        console.error(' [CollaborativeListService] Error getting collaborative lists:', collabError);
      }
      
      // Client-side sorting by updatedAt (en son güncellenenden eskiye)
      allLists.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(' [CollaborativeListService] Found lists:', {
        total: allLists.length,
        listNames: allLists.map(l => l.name)
      });
      
      return allLists;
    } catch (error) {
      console.error(' [CollaborativeListService] Error getting user lists:', error);
      
      // Offline fallback - return empty lists instead of throwing
      if (error.code === 'unavailable' || error.message?.includes('network')) {
        console.log(' [CollaborativeListService] Network error - returning empty lists');
        return [];
      }
      
      // For index errors, also return empty lists to prevent modal from breaking
      if (error.message?.includes('index') || error.message?.includes('composite')) {
        console.log(' [CollaborativeListService] Index error - returning empty lists');
        return [];
      }
      
      // For other errors, still return empty lists but log them
      console.log(' [CollaborativeListService] Unknown error - returning empty lists');
      return [];
    }
  }

  // Kullanıcının üye olduğu tüm listeleri getir (basit versiyon - index gerektirmez)
  static async getAllUserListsSimple(userId) {
    try {
      console.log(' [CollaborativeListService] Getting user lists (simple mode) for:', userId);
      
      const allLists = [];
      const seenListIds = new Set();
      
      // 1. Kullanıcının kendi listeleri - sadece userId filtresi (index gerektirmez)
      console.log(' [CollaborativeListService] Getting own lists...');
      try {
        const ownListsQuery = query(
          collection(db, 'lists'),
          where('userId', '==', userId)
        );
        
        const ownListsSnap = await getDocs(ownListsQuery);
        console.log(' [CollaborativeListService] Own lists found:', ownListsSnap.size);
        
        ownListsSnap.forEach((doc) => {
          const listData = { 
            id: doc.id, 
            ...doc.data(),
            isOwned: true,
            listType: 'Kendi Listem'
          };
          allLists.push(listData);
          seenListIds.add(doc.id);
        });
      } catch (ownError) {
        console.error(' [CollaborativeListService] Error getting own lists:', ownError);
      }
      
      // 2. Kullanıcının üye olduğu collaborative listeler
      console.log(' [CollaborativeListService] Getting collaborative lists...');
      try {
        const collaborativeListsQuery = query(
          collection(db, 'lists'),
          where('collaborators', 'array-contains', userId)
        );
        
        const collaborativeListsSnap = await getDocs(collaborativeListsQuery);
        console.log(' [CollaborativeListService] Collaborative lists found:', collaborativeListsSnap.size);
        
        collaborativeListsSnap.forEach((doc) => {
          // Duplicate check - aynı liste hem owned hem collaborative olabilir
          if (!seenListIds.has(doc.id)) {
            const listData = { 
              id: doc.id, 
              ...doc.data(),
              isOwned: false,
              listType: 'Ortak Liste'
            };
            allLists.push(listData);
            seenListIds.add(doc.id);
          }
        });
      } catch (collabError) {
        console.warn(' [CollaborativeListService] Error getting collaborative lists (will continue with own lists):', collabError);
        // Collaborative listeler alınamazsa sadece kendi listeleri ile devam et
      }
      
      // Client-side sorting by updatedAt (en yeni önce)
      allLists.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(' [CollaborativeListService] All lists loaded:', {
        total: allLists.length,
        ownLists: allLists.filter(l => l.isOwned).length,
        collaborativeLists: allLists.filter(l => !l.isOwned).length,
        listNames: allLists.map(l => `${l.name} (${l.listType})`)
      });
      
      return allLists;
      
    } catch (error) {
      console.error(' [CollaborativeListService] Error in simple query:', error);
      return []; // Return empty array instead of throwing
    }
  }
}

export default CollaborativeListService;
