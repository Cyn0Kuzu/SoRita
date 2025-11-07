import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

import FirestoreService from '../services/firestoreService';
import storageService from '../services/storageService';
import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';
import CollaborativeListService from '../services/collaborativeListService';

const EditListInfoModal = ({ visible, onClose, listData, onListUpdated }) => {
  const [listName, setListName] = useState('');
  const [listImage, setListImage] = useState(null);
  const [listPrivacy, setListPrivacy] = useState('public');
  const [isCollaborativePrivate, setIsCollaborativePrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Collaborator states
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [filteredFollowers, setFilteredFollowers] = useState([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [collaboratorQuery, setCollaboratorQuery] = useState('');

  useEffect(() => {
    if (listData) {
      setListName(listData.name || '');
      setListImage(listData.image || null);

      // Gizlilik ayarını belirle
      if (listData.privacy) {
        setListPrivacy(listData.privacy);
        setIsCollaborativePrivate(listData.isCollaborativePrivate || false);
      } else {
        // Eski veri yapısı için geriye uyumluluk
        if (listData.isPublic === false) {
          setListPrivacy('private');
        } else if (listData.allowInvites === true || listData.isCollaborative) {
          setListPrivacy('collaborative');
        } else {
          setListPrivacy('public');
        }
      }

      // Eğer liste zaten ortak liste ise collaborative olarak ayarla
      if (listData.collaborators && listData.collaborators.length > 0) {
        setListPrivacy('collaborative');
        setShowCollaboratorSearch(true);
      }
    }
  }, [listData]);

  // Collaborator search useEffect
  useEffect(() => {
    if (showCollaboratorSearch && searchInput !== '') {
      const searchTimer = setTimeout(async () => {
        const results = await searchCollaborators(searchInput);
        setFollowers(results);
      }, 500);

      return () => clearTimeout(searchTimer);
    }
  }, [searchInput, showCollaboratorSearch]);

  // Load followers when collaborator search is opened
  useEffect(() => {
    if (showCollaboratorSearch) {
      loadFollowers();
    }
  }, [showCollaboratorSearch]);

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekli.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setListImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  // Load followers for collaboration
  const loadFollowers = async () => {
    try {
      console.log('📋 [EditListInfoModal] Loading followers...');

      const currentUser = auth?.currentUser;
      if (!currentUser) {
        console.log('❌ [EditListInfoModal] No current user found');
        return;
      }

      // Her seferinde fresh takipçi listesi yükle
      setFollowers([]);
      setFilteredFollowers([]);

      // Mevcut kullanıcıyı takip eden kişileri bul (takipçileri)
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', currentUser.uid)
      );

      const followersSnapshot = await getDocs(followersQuery);
      const followerIds = followersSnapshot.docs.map((doc) => doc.data().followerId);

      console.log('📋 [EditListInfoModal] Found follower IDs:', followerIds.length);

      if (followerIds.length === 0) {
        console.log('📋 [EditListInfoModal] No followers found');
        setFollowers([]);
        setFilteredFollowers([]);
        return;
      }

      // Takipçi kullanıcı bilgilerini getir
      const followersData = [];
      for (const followerId of followerIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', followerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const followerData = {
              id: followerId,
              username: userData.username || 'unknown',
              firstName: userData.firstName || 'İsimsiz',
              lastName: userData.lastName || 'Kullanıcı',
              avatar: userData.avatar || '👤',
            };
            followersData.push(followerData);

            // Eğer bu kullanıcı listeye ortak ise, selectedCollaborators'a ekle
            if (listData && listData.collaborators && listData.collaborators.includes(followerId)) {
              setSelectedCollaborators((prev) => {
                const exists = prev.some((c) => c.id === followerId);
                if (!exists) {
                  return [...prev, followerData];
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.warn(
            '⚠️ [EditListInfoModal] Error loading follower data for:',
            followerId,
            error
          );
        }
      }

      setFollowers(followersData);
      setFilteredFollowers(followersData);
      console.log('✅ [EditListInfoModal] Followers loaded:', followersData.length);
    } catch (error) {
      console.error('❌ [EditListInfoModal] Error loading followers:', error);
      setFollowers([]);
      setFilteredFollowers([]);
    }
  };

  // Filter followers based on search query
  const filterFollowers = (query) => {
    setCollaboratorQuery(query);
    if (!query.trim()) {
      setFilteredFollowers(followers);
      return;
    }

    const filtered = followers.filter((follower) => {
      const fullName = `${follower.firstName} ${follower.lastName}`.toLowerCase();
      const username = follower.username.toLowerCase();
      const searchQuery = query.toLowerCase();

      return fullName.includes(searchQuery) || username.includes(searchQuery);
    });

    setFilteredFollowers(filtered);
  };

  // Toggle collaborator selection
  const getUserFollowers = async () => {
    try {
      // TODO: Implement actual follower loading
      // For now returning empty array
      return [];
    } catch (error) {
      console.error('Error loading followers:', error);
      return [];
    }
  };

  const searchCollaborators = async (searchTerm) => {
    const followers = await getUserFollowers();
    if (!searchTerm.trim()) return followers;

    return followers.filter(
      (follower) =>
        follower.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        follower.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const removeCollaborator = (collaboratorId) => {
    setSelectedCollaborators((prev) => prev.filter((c) => c.uid !== collaboratorId));
  };

  const handlePrivacyChange = async (value) => {
    setListPrivacy(value);
    if (value === 'public') {
      setSelectedCollaborators([]);
      setFollowers([]);
    } else if (value === 'collaborative' && followers.length === 0) {
      await loadFollowers();
    }
  };

  const toggleCollaborator = (collaborator) => {
    const isSelected = selectedCollaborators.some((c) => c.id === collaborator.id);

    if (isSelected) {
      setSelectedCollaborators((prev) => prev.filter((c) => c.id !== collaborator.id));
    } else {
      setSelectedCollaborators((prev) => [...prev, collaborator]);
    }
  };

  // Mevcut üyeyi çıkar
  const handleRemoveMember = async (collaboratorId, collaboratorDetail) => {
    Alert.alert(
      'Üyeyi Çıkar',
      `${collaboratorDetail.firstName} ${collaboratorDetail.lastName} kişisini listeden çıkarmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await CollaborativeListService.removeCollaborator(
                listData.id,
                collaboratorId,
                auth.currentUser?.uid
              );

              // Listeyi yeniden yükle
              if (onListUpdated) {
                onListUpdated();
              }

              Alert.alert('Başarılı', 'Üye listeden çıkarıldı');
            } catch (error) {
              console.error('❌ [EditListInfoModal] Error removing member:', error);
              Alert.alert('Hata', 'Üye çıkarılırken bir hata oluştu');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!listName.trim()) {
      Alert.alert('Hata', 'Liste adı boş olamaz.');
      return;
    }

    if (!listImage) {
      Alert.alert('Hata', 'Liste fotoğrafı seçmelisiniz.');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = listData.image;

      // Eğer yeni bir resim seçildiyse, önce eski resmi sil sonra yenisini yükle
      if (listImage && listImage !== listData.image) {
        if (listData.image) {
          await storageService.deleteImageByUrl(listData.image);
        }
        imageUrl = await storageService.uploadImage(listImage, 'lists', listData.id);
      }

      const updatedListData = {
        name: listName.trim(),
        image: imageUrl,
        privacy: listPrivacy,
        isCollaborativePrivate: listPrivacy === 'collaborative' ? isCollaborativePrivate : false,
        // Geriye uyumluluk için eski alanları da güncelle
        isPublic:
          listPrivacy === 'public' || (listPrivacy === 'collaborative' && !isCollaborativePrivate),
        allowInvites: listPrivacy === 'collaborative',
        updatedAt: new Date().toISOString(),
      };

      await FirestoreService.updateList(listData.id, updatedListData);

      Alert.alert('Başarılı', 'Liste başarıyla güncellendi.');

      if (onListUpdated) {
        onListUpdated({ ...listData, ...updatedListData });
      }

      onClose();
    } catch (error) {
      console.error('Error updating list:', error);
      Alert.alert('Hata', 'Liste güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Liste Sil',
      'Bu listeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Liste resmini sil
              if (listData.image) {
                await storageService.deleteImageByUrl(listData.image);
              }

              // Listeyi sil
              await FirestoreService.deleteList(listData.id);

              Alert.alert('Başarılı', 'Liste başarıyla silindi.');

              if (onListUpdated) {
                onListUpdated(null, true); // null ve true ile silindiğini belirt
              }

              onClose();
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Hata', 'Liste silinirken bir hata oluştu.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Listeyi Düzenle</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* List Image Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Liste Fotoğrafı</Text>

            {/* Gallery Button */}
            <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
              <MaterialIcons name="photo-library" size={24} color="#007AFF" />
              <Text style={styles.galleryButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>

            {/* Selected Image Preview */}
            {listImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: listImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setListImage(null);
                  }}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.helperText}>
                Liste için galeriden bir fotoğraf seçmeniz gerekmektedir.
              </Text>
            )}
          </View>

          {/* List Name */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Liste Adı</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Liste için bir isim girin..."
              value={listName}
              onChangeText={setListName}
              maxLength={50}
            />
          </View>

          {/* Privacy Settings */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Gizlilik Ayarları</Text>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                listPrivacy === 'public' && styles.privacyOptionSelected,
              ]}
              onPress={() => handlePrivacyChange('public')}
            >
              <MaterialIcons
                name="public"
                size={24}
                color={listPrivacy === 'public' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.privacyOptionText,
                  listPrivacy === 'public' && styles.privacyOptionTextSelected,
                ]}
              >
                Herkese Açık
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                listPrivacy === 'private' && styles.privacyOptionSelected,
              ]}
              onPress={() => handlePrivacyChange('private')}
            >
              <MaterialIcons
                name="lock"
                size={24}
                color={listPrivacy === 'private' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.privacyOptionText,
                  listPrivacy === 'private' && styles.privacyOptionTextSelected,
                ]}
              >
                Özel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                listPrivacy === 'collaborative' && styles.privacyOptionSelected,
              ]}
              onPress={async () => {
                await handlePrivacyChange('collaborative');
                setShowCollaboratorSearch(true);
              }}
            >
              <MaterialIcons
                name="group"
                size={24}
                color={listPrivacy === 'collaborative' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.privacyOptionText,
                  listPrivacy === 'collaborative' && styles.privacyOptionTextSelected,
                ]}
              >
                Ortak
              </Text>
            </TouchableOpacity>

            {/* Davet Et seçiliyse özel ve herkese açık seçenekleri göster */}
            {listPrivacy === 'collaborative' && (
              <View style={styles.subPrivacyOptions}>
                <Text style={styles.subPrivacyTitle}>Lista görünürlüğü:</Text>
                <View style={styles.subPrivacyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.subPrivacyOption,
                      listPrivacy === 'collaborative' &&
                        !isCollaborativePrivate &&
                        styles.subPrivacyOptionSelected,
                    ]}
                    onPress={() => {
                      setIsCollaborativePrivate(false);
                    }}
                  >
                    <MaterialIcons name="public" size={20} color="#10B981" />
                    <Text style={styles.subPrivacyOptionText}>Herkese Açık</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subPrivacyOption,
                      listPrivacy === 'collaborative' &&
                        isCollaborativePrivate &&
                        styles.subPrivacyOptionSelected,
                    ]}
                    onPress={() => {
                      setIsCollaborativePrivate(true);
                    }}
                  >
                    <MaterialIcons name="lock" size={20} color="#6366F1" />
                    <Text style={styles.subPrivacyOptionText}>Özel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showCollaboratorSearch && listPrivacy === 'collaborative' && (
              <View style={styles.collaboratorSearch}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Takipçi ara..."
                  value={collaboratorQuery}
                  onChangeText={filterFollowers}
                />

                {/* Seçilen işbirlikçiler */}
                {selectedCollaborators.length > 0 && (
                  <View style={styles.selectedCollaborators}>
                    <Text style={styles.selectedCollaboratorsTitle}>
                      Seçilen Kişiler ({selectedCollaborators.length}):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedCollaborators.map((collaborator) => (
                        <TouchableOpacity
                          key={collaborator.id}
                          style={styles.selectedCollaboratorChip}
                          onPress={() => toggleCollaborator(collaborator)}
                        >
                          <Text style={styles.selectedCollaboratorAvatar}>
                            {collaborator.avatar}
                          </Text>
                          <Text style={styles.selectedCollaboratorName}>
                            {collaborator.firstName}
                          </Text>
                          <MaterialIcons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Takipçi listesi */}
                <View style={styles.followersList}>
                  {/* Mevcut Üyeler */}
                  {listData?.collaborators && listData.collaborators.length > 0 && (
                    <View style={styles.currentMembersSection}>
                      <Text style={styles.followersListTitle}>
                        Mevcut Üyeler ({listData.collaborators.length})
                      </Text>
                      <ScrollView
                        style={[styles.followersScrollView, { maxHeight: 150 }]}
                        nestedScrollEnabled={true}
                      >
                        {listData.collaborators.map((collaboratorId) => {
                          const collaboratorDetail = listData.collaboratorDetails?.[collaboratorId];
                          if (!collaboratorDetail) return null;

                          return (
                            <View key={collaboratorId} style={styles.currentMemberItem}>
                              <Text style={styles.followerAvatar}>{collaboratorDetail.avatar}</Text>
                              <View style={styles.followerInfo}>
                                <Text style={styles.followerName}>
                                  {collaboratorDetail.firstName} {collaboratorDetail.lastName}
                                </Text>
                                <Text style={styles.followerUsername}>
                                  @{collaboratorDetail.username}
                                </Text>
                              </View>
                              {listData.userId === auth.currentUser?.uid && (
                                <TouchableOpacity
                                  style={styles.removeMemberButton}
                                  onPress={() =>
                                    handleRemoveMember(collaboratorId, collaboratorDetail)
                                  }
                                >
                                  <MaterialIcons name="remove-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={styles.followersListTitle}>
                    Takipçileriniz ({filteredFollowers.length})
                  </Text>
                  <ScrollView
                    style={[styles.followersScrollView, { maxHeight: 200 }]}
                    nestedScrollEnabled={true}
                  >
                    {filteredFollowers.length > 0 ? (
                      filteredFollowers.map((item) => {
                        // Kullanıcı zaten listeye ortak mı kontrol et
                        const isCurrentCollaborator = listData?.collaborators?.includes(item.id);
                        // Kullanıcı yeni seçilen ortaklar arasında mı kontrol et
                        const isSelectedCollaborator = selectedCollaborators.some(
                          (c) => c.id === item.id
                        );
                        // Her iki durumda da işaretli olmalı
                        const isSelected = isCurrentCollaborator || isSelectedCollaborator;

                        console.log('🔍 [EditListInfoModal] User check:', {
                          userId: item.id,
                          userName: `${item.firstName} ${item.lastName}`,
                          isCurrentCollaborator,
                          isSelectedCollaborator,
                          isSelected,
                          listCollaborators: listData?.collaborators,
                        });
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.followerItem, isSelected && styles.followerItemSelected]}
                            onPress={() => toggleCollaborator(item)}
                          >
                            <Text style={styles.followerAvatar}>{item.avatar}</Text>
                            <View style={styles.followerInfo}>
                              <Text style={styles.followerName}>
                                {item.firstName} {item.lastName}
                              </Text>
                              <Text style={styles.followerUsername}>@{item.username}</Text>
                            </View>
                            <MaterialIcons
                              name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                              size={24}
                              color={isSelected ? '#10B981' : '#999'}
                            />
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyFollowers}>
                        <MaterialIcons name="search-off" size={48} color="#999" />
                        <Text style={styles.emptyFollowersText}>
                          {collaboratorQuery ? 'Arama sonucu bulunamadı' : 'Henüz takipçiniz yok'}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                <Text style={styles.collaboratorHint}>
                  Sadece takipçilerinizden davet edebilirsiniz
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer with action buttons - exactly like MapScreen */}
        <View style={styles.createListFooter}>
          <TouchableOpacity
            style={styles.cancelCreateButton}
            onPress={onClose}
            onLongPress={handleDelete}
            delayLongPress={2000}
            disabled={isLoading}
          >
            <Text style={styles.cancelCreateButtonText}>İptal için 2sn basılı tutun</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.createListButton,
              (!listName.trim() || !listImage) && styles.createListButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!listName.trim() || !listImage || isLoading}
          >
            <Text style={styles.createListButtonText}>
              {isLoading ? 'Güncelleniyor...' : 'Güncelle'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#fff',
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#E0E0E0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  galleryButton: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: '#007AFF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
  },
  galleryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  selectedImageContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  selectedImage: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  removeImageButton: {
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    top: -5,
    width: 24,
  },
  helperText: {
    color: '#6C757D',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  privacyOption: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  privacyOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  privacyOptionText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  privacyOptionTextSelected: {
    color: '#fff',
  },
  subPrivacyOptions: {
    marginTop: 15,
    paddingLeft: 15,
  },
  subPrivacyTitle: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  subPrivacyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  subPrivacyOption: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  subPrivacyOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  subPrivacyOptionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  createListFooter: {
    borderTopColor: '#eee',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cancelCreateButton: {
    alignItems: 'center',
    borderColor: '#dc3545',
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelCreateButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  createListButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createListButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Collaboration styles
  collaboratorSearch: {
    borderTopColor: '#eee',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  collaboratorHint: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  selectedCollaborators: {
    marginBottom: 12,
    marginTop: 12,
  },
  selectedCollaboratorsTitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedCollaboratorChip: {
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedCollaboratorAvatar: {
    fontSize: 16,
  },
  selectedCollaboratorName: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  followersList: {
    marginTop: 12,
  },
  followersListTitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  followersScrollView: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'scroll',
  },
  followerItem: {
    alignItems: 'center',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  followerItemSelected: {
    backgroundColor: '#E8F5E8',
  },
  followerAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  followerUsername: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  emptyFollowers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFollowersText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Mevcut üyeler için stiller
  currentMembersSection: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 16,
  },
  currentMemberItem: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  removeMemberButton: {
    padding: 4,
  },
});

export default EditListInfoModal;
