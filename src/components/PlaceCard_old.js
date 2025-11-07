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
        // Get user info
        const userDoc = await getDoc(doc(db, 'users', likeData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          likesData.push({
            id: docSnap.id,
            userId: likeData.userId,
            userName: `${userData.firstName} ${userData.lastName}`,
            userAvatar: userData.avatar || '👤',
            createdAt: likeData.createdAt,
          });
        }
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
        // Get user info
        const userDoc = await getDoc(doc(db, 'users', commentData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          commentsData.push({
            id: docSnap.id,
            userId: commentData.userId,
            userName: `${userData.firstName} ${userData.lastName}`,
            userAvatar: userData.avatar || '👤',
            comment: commentData.comment,
            createdAt: commentData.createdAt,
          });
        }
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

    try {
      setLoading(true);

      const commentData = {
        placeId,
        placeName: place.name,
        placeAddress: place.address,
        userId: currentUser.uid,
        comment: newComment.trim(),
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
        comment: newComment.trim(),
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
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name?.replace(/\n/g, ' ') || 'İsimsiz Mekan'}
            </Text>
            <Text style={styles.placeAddress} numberOfLines={1}>
              📍 {place.address}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.placeActions}>
            {/* Like Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              style={styles.actionButton}
            >
              <MaterialIcons
                name={isLiked ? 'favorite' : 'favorite-border'}
                size={20}
                color={isLiked ? '#EF4444' : '#6B7280'}
              />
              <Text style={styles.actionButtonText}>{likesCount}</Text>
            </TouchableOpacity>

            {/* Comment Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setShowCommentsModal(true);
              }}
              style={styles.actionButton}
            >
              <MaterialIcons name="chat-bubble-outline" size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>{commentsCount}</Text>
            </TouchableOpacity>

            {/* Focus Button */}
            {showFocusButton && onFocus && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onFocus(place);
                }}
                style={styles.focusButton}
              >
                <MaterialIcons name="center-focus-strong" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Likes button - below like button */}
        {likesCount > 0 && (
          <TouchableOpacity onPress={() => setShowLikesModal(true)} style={styles.likesButton}>
            <Text style={styles.likesButtonText}>Beğenenleri Gör ({likesCount})</Text>
          </TouchableOpacity>
        )}

        {/* User Content Preview */}
        {place.userContent && (
          <View style={styles.userContentContainer}>
            {/* Rating */}
            {place.userContent.rating > 0 && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{place.userContent.rating}/5</Text>
              </View>
            )}

            {/* Note */}
            {place.userContent.note && (
              <Text style={styles.noteText} numberOfLines={2}>
                {place.userContent.note}
              </Text>
            )}

            {/* Photos */}
            {place.userContent.photos && place.userContent.photos.length > 0 && (
              <View style={styles.photosContainer}>
                <Image source={{ uri: place.userContent.photos[0] }} style={styles.photoPreview} />
                {place.userContent.photos.length > 1 && (
                  <Text style={styles.photoCount}>+{place.userContent.photos.length - 1}</Text>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLikesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setShowLikesModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beğenenler ({likesCount})</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {likes.map((like) => (
                <View key={like.id} style={styles.userItem}>
                  <Text style={styles.userAvatar}>{like.userAvatar}</Text>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{like.userName}</Text>
                    <Text style={styles.userDate}>{formatDate(like.createdAt)}</Text>
                  </View>
                </View>
              ))}
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setShowCommentsModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yorumlar ({commentsCount})</Text>
              <TouchableOpacity
                onPress={() => setShowCommentsModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.userAvatar}>{comment.userAvatar}</Text>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.userName}>{comment.userName}</Text>
                      <Text style={styles.userDate}>{formatDate(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorum yazın..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={handleComment}
                disabled={loading || !newComment.trim()}
                style={[
                  styles.sendButton,
                  (!newComment.trim() || loading) && styles.sendButtonDisabled,
                ]}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={!newComment.trim() || loading ? '#9CA3AF' : '#3B82F6'}
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
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  addCommentContainer: {
    alignItems: 'flex-end',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  closeButton: {
    padding: 4,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentInput: {
    borderColor: '#E5E7EB',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentItem: {
    alignItems: 'flex-start',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    padding: 10,
    width: 40,
  },
  likesButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  likesButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '40%',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  noteText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  photoCount: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    bottom: 2,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    right: 2,
  },
  photoPreview: {
    borderRadius: 8,
    height: 60,
    width: 60,
  },
  photosContainer: {
    position: 'relative',
  },
  placeActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  placeAddress: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 8,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  placeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 12,
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    padding: 8,
    width: 36,
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  userAvatar: {
    fontSize: 20,
    marginRight: 12,
  },
  userContentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 8,
    padding: 12,
  },
  userDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  userInfo: {
    flex: 1,
  },
  userItem: {
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  userName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaceCard;
