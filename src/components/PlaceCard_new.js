import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import MapView, { Marker } from 'react-native-maps';

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';

import { colors } from '../theme/theme';
import { auth, db } from '../config/firebase';

import ImageModal from './ImageModal';

const PlaceCard = ({
  place,
  onFocus,
  showFocusButton = true,
  onPress = null,
  onEdit = null,
  onDelete = null,
  showMap = true,
  isEvent = false, // Etkinlik kartı mı?
}) => {
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showAddress, setShowAddress] = useState(false); // Etkinlik kartlarında adres gizlemek için
  const [showImageModal, setShowImageModal] = useState(false); // Image modal
  const [currentImageUri, setCurrentImageUri] = useState(''); // Mevcut görüntülenen resim

  const { currentUser } = auth;
  const placeId = place.id || `${place.name}_${place.address}`.replace(/[^a-zA-Z0-9]/g, '_');

  useEffect(() => {
    loadLikesAndComments();
  }, []);

  const loadLikesAndComments = async () => {
    try {
      // Load likes
      const likesQuery = query(collection(db, 'placeLikes'), where('placeId', '==', placeId));
      const likesSnapshot = await getDocs(likesQuery);
      const likesData = [];

      for (const docSnap of likesSnapshot.docs) {
        const likeData = docSnap.data();
        // Get user info for each like
        const userDoc = await getDoc(doc(db, 'users', likeData.userId));
        const userData = userDoc.data();

        likesData.push({
          id: docSnap.id,
          userId: likeData.userId,
          userName: `${userData.firstName} ${userData.lastName}`,
          userAvatar: userData.avatar || '👤',
          createdAt: likeData.createdAt,
        });
      }

      setLikes(likesData);
      setLikesCount(likesData.length);
      setIsLiked(likesData.some((like) => like.userId === currentUser?.uid));

      // Load comments
      const commentsQuery = query(
        collection(db, 'placeComments'),
        where('placeId', '==', placeId),
        orderBy('createdAt', 'desc')
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData = [];

      for (const docSnap of commentsSnapshot.docs) {
        const commentData = docSnap.data();
        // Get user info for each comment
        const userDoc = await getDoc(doc(db, 'users', commentData.userId));
        const userData = userDoc.data();

        commentsData.push({
          id: docSnap.id,
          userId: commentData.userId,
          userName: `${userData.firstName} ${userData.lastName}`,
          userAvatar: userData.avatar || '👤',
          text: commentData.text,
          createdAt: commentData.createdAt,
        });
      }

      setComments(commentsData);
      setCommentsCount(commentsData.length);
    } catch (error) {
      console.error('Error loading likes and comments:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        // Unlike
        const likeToDelete = likes.find((like) => like.userId === currentUser.uid);
        if (likeToDelete) {
          await deleteDoc(doc(db, 'placeLikes', likeToDelete.id));
          setLikes((prev) => prev.filter((like) => like.userId !== currentUser.uid));
          setLikesCount((prev) => prev - 1);
          setIsLiked(false);
        }
      } else {
        // Like
        const likeData = {
          placeId,
          placeName: place.name,
          placeAddress: place.address,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'placeLikes'), likeData);

        // Get current user info
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        const newLike = {
          id: docRef.id,
          userId: currentUser.uid,
          userName: `${userData.firstName} ${userData.lastName}`,
          userAvatar: userData.avatar || '👤',
          createdAt: likeData.createdAt,
        };

        setLikes((prev) => [...prev, newLike]);
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  const handleComment = async () => {
    if (!currentUser || !newComment.trim()) return;

    setLoading(true);
    try {
      const commentData = {
        placeId,
        placeName: place.name,
        placeAddress: place.address,
        userId: currentUser.uid,
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'placeComments'), commentData);

      // Get current user info
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();

      const newCommentObj = {
        id: docRef.id,
        userId: currentUser.uid,
        userName: `${userData.firstName} ${userData.lastName}`,
        userAvatar: userData.avatar || '👤',
        text: newComment.trim(),
        createdAt: commentData.createdAt,
      };

      setComments((prev) => [newCommentObj, ...prev]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  const copyAddress = async () => {
    try {
      await Clipboard.setString(place.address);
      Alert.alert('Başarılı', 'Adres panoya kopyalandı.');
    } catch (error) {
      Alert.alert('Hata', 'Adres kopyalanırken bir hata oluştu.');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.placeCard} onPress={onPress} disabled={!onPress}>
        {/* Üst kısım - Mekan adı ve düzenle/sil/odakla butonları */}
        <View style={styles.topSection}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name?.replace(/\n/g, ' ') || 'İsimsiz Mekan'}
          </Text>

          <View style={styles.topActions}>
            {onEdit && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit(place);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="edit" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(place);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="delete" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            {showFocusButton && onFocus && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onFocus(place);
                }}
                style={styles.topActionButton}
              >
                <MaterialIcons name="center-focus-strong" size={18} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Küçük harita - sadece mekan kartlarında göster */}
        {showMap && place.latitude && place.longitude && (
          <View style={styles.miniMapContainer}>
            <MapView
              style={styles.miniMap}
              initialRegion={{
                latitude: place.latitude,
                longitude: place.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={place.name}
              />
            </MapView>
          </View>
        )}

        {/* Alt kısım - Adres */}
        <View style={styles.addressSection}>
          {isEvent ? (
            // Etkinlik kartlarında adres gizli
            !showAddress ? (
              <TouchableOpacity
                onPress={() => setShowAddress(true)}
                style={styles.showAddressButton}
              >
                <MaterialIcons name="location-on" size={16} color="#3B82F6" />
                <Text style={styles.showAddressButtonText}>Adresi Gör</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.fullAddressContainer}>
                <Text style={styles.fullAddress}>{place.address}</Text>
                <TouchableOpacity onPress={copyAddress} style={styles.copyButton}>
                  <MaterialIcons name="content-copy" size={16} color="#3B82F6" />
                  <Text style={styles.copyButtonText}>Kopyala</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            // Normal mekan kartlarında adres görünür
            <Text style={styles.placeAddress} numberOfLines={1}>
              📍 {place.address}
            </Text>
          )}
        </View>

        {/* Beğeni ve yorum - alt kısımda */}
        <View style={styles.socialSection}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            style={styles.socialActionButton}
          >
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={20}
              color={isLiked ? '#EF4444' : '#6B7280'}
            />
            <Text style={styles.socialActionText}>{likesCount} Beğeni</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowCommentsModal(true);
            }}
            style={styles.socialActionButton}
          >
            <MaterialIcons name="chat-bubble-outline" size={20} color="#6B7280" />
            <Text style={styles.socialActionText}>{commentsCount} Yorum</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLikesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beğenenler</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {likes.map((like) => (
                <View key={like.id} style={styles.userItem}>
                  <Text style={styles.userAvatar}>{like.userAvatar}</Text>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{like.userName}</Text>
                    <Text style={styles.userDate}>{formatDate(like.createdAt)}</Text>
                  </View>
                </View>
              ))}
              {likes.length === 0 && <Text style={styles.emptyText}>Henüz beğeni yok</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yorumlar</Text>
              <TouchableOpacity
                onPress={() => setShowCommentsModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.userAvatar}>{comment.userAvatar}</Text>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.userName}>{comment.userName}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))}
              {comments.length === 0 && <Text style={styles.emptyText}>Henüz yorum yok</Text>}
            </ScrollView>

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorum yaz..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleComment}
                style={[
                  styles.sendButton,
                  (!newComment.trim() || loading) && styles.sendButtonDisabled,
                ]}
                disabled={!newComment.trim() || loading}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={!newComment.trim() || loading ? '#999' : '#3B82F6'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <ImageModal
        visible={showImageModal}
        imageUri={currentImageUri}
        onClose={() => setShowImageModal(false)}
        title={place.name}
      />
    </>
  );
};

const styles = StyleSheet.create({
  addressSection: {
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentDate: {
    color: '#999',
    fontSize: 12,
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentInput: {
    borderColor: '#ddd',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputContainer: {
    alignItems: 'flex-end',
    borderTopColor: '#f0f0f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 20,
  },
  commentItem: {
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentText: {
    color: '#333',
    fontSize: 14,
  },
  copyButton: {
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  fullAddress: {
    color: '#666',
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  fullAddressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniMap: {
    height: '100%',
    width: '100%',
  },
  miniMapContainer: {
    borderRadius: 8,
    height: 120,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  modalScrollView: {
    padding: 20,
  },
  modalTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeAddress: {
    color: '#666',
    fontSize: 14,
  },
  placeCard: {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  placeName: {
    color: '#333',
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    padding: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  showAddressButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  showAddressButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  socialActionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  socialActionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  socialSection: {
    borderTopColor: '#f0f0f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  topActionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 8,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topSection: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  userDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  userInfo: {
    flex: 1,
  },
  userItem: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  userName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaceCard;
