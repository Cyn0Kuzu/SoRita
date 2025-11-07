import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from 'react-native-paper';

import { doc, getDoc } from 'firebase/firestore';

import { colors } from '../theme/theme';
import CollaborativeListService from '../services/collaborativeListService';
import { auth, db } from '../config/firebase';

const CollaboratorsModal = ({ visible, onClose, listId, listTitle, isOwner = false }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [totalPlaces, setTotalPlaces] = useState(0);

  useEffect(() => {
    if (visible && listId) {
      loadMembers();
    }
  }, [visible, listId]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid);
    }
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      console.log('👥 [CollaboratorsModal] Loading members for list:', listId);

      const listMembers = await CollaborativeListService.getListMembers(listId);
      setMembers(listMembers);

      // Listedeki gerçek toplam yer sayısını al
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      const listData = listDoc.data();
      const actualTotalPlaces = (listData.places || []).length;
      setTotalPlaces(actualTotalPlaces);

      console.log(
        `✅ [CollaboratorsModal] Loaded ${listMembers.length} members, ${actualTotalPlaces} total places`
      );
    } catch (error) {
      console.error('❌ [CollaboratorsModal] Error loading members:', error);
      Alert.alert('Hata', 'Üye listesi yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    Alert.alert(
      'Üyeyi Çıkar',
      `${memberName} kullanıcısını listeden çıkarmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await CollaborativeListService.removeMember(listId, memberId, currentUserId);
              Alert.alert('Başarılı', 'Üye başarıyla çıkarıldı.');
              loadMembers(); // Listeyi yenile
            } catch (error) {
              console.error('❌ [CollaboratorsModal] Error removing member:', error);
              Alert.alert('Hata', 'Üye çıkarılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const renderAvatar = (member) => {
    // Liste sahibi için özel avatar
    if (member.role === 'owner') {
      if (member.avatar && member.avatar.startsWith('http')) {
        return (
          <View style={styles.ownerAvatarContainer}>
            <Image
              source={{ uri: member.avatar }}
              style={styles.ownerAvatarImage}
              resizeMode="cover"
            />
            <View style={styles.crownOverlay}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.ownerEmojiAvatar}>
          <Text style={styles.ownerEmojiText}>
            {member.avatar === '👑' ? '👑' : member.avatar || '👑'}
          </Text>
        </View>
      );
    }

    // Normal üyeler için avatar
    if (member.avatar && member.avatar.startsWith('http')) {
      return (
        <Image
          source={{ uri: member.avatar }}
          style={styles.memberAvatarImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.emojiAvatar}>
        <Text style={styles.emojiAvatarText}>{member.avatar || '👤'}</Text>
      </View>
    );
  };

  const renderMember = (member) => {
    const isCurrentUser = member.id === currentUserId;
    const canRemove = isOwner && member.role !== 'owner' && !isCurrentUser;

    // Kullanıcı adını düzgün formatlayalım
    const displayName =
      member.displayName ||
      (member.firstName && member.lastName
        ? `${member.firstName} ${member.lastName}`.trim()
        : member.firstName || member.lastName || 'İsimsiz Kullanıcı');

    return (
      <View
        key={member.id}
        style={[styles.memberCard, member.role === 'owner' && styles.ownerMemberCard]}
      >
        <View style={styles.memberInfo}>
          {/* Avatar Container */}
          <View style={styles.avatarContainer}>
            {renderAvatar(member)}
            {/* Renk göstergesi */}
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: member.color || '#ccc' },
                member.role === 'owner' && styles.ownerColorIndicator,
              ]}
            />
          </View>

          {/* Member Details */}
          <View style={styles.memberDetails}>
            {/* Name and Role Row */}
            <View style={styles.memberNameRow}>
              <Text
                style={[styles.memberName, member.role === 'owner' && styles.ownerMemberName]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {member.role === 'owner' && (
                <View style={styles.ownerBadge}>
                  <MaterialIcons name="star" size={12} color={colors.warning} />
                  <Text style={styles.ownerText}>Sahibi</Text>
                </View>
              )}
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>Sen</Text>
                </View>
              )}
            </View>

            {/* Username Row */}
            {member.username && (
              <View style={styles.usernameRow}>
                <MaterialIcons name="alternate-email" size={14} color={colors.textSecondary} />
                <Text style={styles.memberUsername}>{member.username}</Text>
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.memberStatsRow}>
              <View style={styles.statBadge}>
                <MaterialIcons name="place" size={14} color={colors.success} />
                <Text style={styles.memberStats}>{member.addedPlacesCount || 0} yer</Text>
              </View>

              {member.joinedAt && (
                <View style={styles.dateBadge}>
                  <MaterialIcons name="schedule" size={14} color={colors.textSecondary} />
                  <Text style={styles.joinDate}>
                    {new Date(member.joinedAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Remove Button */}
        {canRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(member.id, displayName)}
          >
            <MaterialIcons name="remove-circle" size={24} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Ortak Üyeler</Text>
            <Text style={styles.subtitle}>{listTitle}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Üyeler yükleniyor...</Text>
            </View>
          ) : (
            <>
              {/* Üst İstatistik Kartları */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="group" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.statNumber}>{members.length}</Text>
                  <Text style={styles.statLabel}>Toplam Üye</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="place" size={24} color={colors.success} />
                  </View>
                  <Text style={styles.statNumber}>{totalPlaces}</Text>
                  <Text style={styles.statLabel}>Toplam Yer</Text>
                </View>
              </View>

              <View style={styles.membersContainer}>
                <Text style={styles.sectionTitle}>Üyeler</Text>
                {members.map(renderMember)}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  activeColorsContainer: {
    gap: 8,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  closeButton: {
    padding: 8,
  },
  colorCircle: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  colorIndicator: {
    borderColor: colors.white,
    borderRadius: 9,
    borderWidth: 2,
    bottom: -2,
    height: 18,
    position: 'absolute',
    right: -2,
    width: 18,
  },
  colorItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  colorLegend: {
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorMemberName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  crownEmoji: {
    fontSize: 16,
  },
  crownOverlay: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 2,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.textSecondary}15`,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 2,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emojiAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  emojiAvatarText: {
    fontSize: 24,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
    marginLeft: -40, // X butonunun genişliğini telafi et
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  joinDate: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  legendHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  memberAvatarImage: {
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    width: 60,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  memberDetails: {
    flex: 1,
  },
  memberInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  memberItem: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memberName: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  memberNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  memberStats: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  memberStatsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  memberUsername: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  membersContainer: {
    marginBottom: 24,
  },
  ownerAvatarContainer: {
    height: 60,
    position: 'relative',
    width: 60,
  },
  ownerAvatarImage: {
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    width: 60,
  },
  ownerBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    borderRadius: 8,
    flexDirection: 'row',
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownerColorIndicator: {
    borderColor: colors.white,
    borderRadius: 9,
    borderWidth: 2,
    bottom: -2,
    height: 18,
    position: 'absolute',
    right: -2,
    width: 18,
  },
  ownerEmojiAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  ownerEmojiText: {
    fontSize: 28,
  },
  ownerMemberCard: {
    backgroundColor: colors.white,
  },
  ownerMemberName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  ownerText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  removeButton: {
    padding: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.success}15`,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    elevation: 3,
    flex: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  statIconContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  statNumber: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  usernameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  youBadge: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 8,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  youText: {
    color: colors.primary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default CollaboratorsModal;
