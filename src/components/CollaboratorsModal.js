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
import { colors } from '../theme/theme';
import { Avatar } from 'react-native-paper';
import CollaborativeListService from '../services/collaborativeListService';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
      
      console.log(`✅ [CollaboratorsModal] Loaded ${listMembers.length} members, ${actualTotalPlaces} total places`);
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
          }
        }
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
            {member.avatar === '👑' ? '👑' : (member.avatar || '👑')}
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
        <Text style={styles.emojiAvatarText}>
          {member.avatar || '👤'}
        </Text>
      </View>
    );
  };

  const renderMember = (member) => {
    const isCurrentUser = member.id === currentUserId;
    const canRemove = isOwner && member.role !== 'owner' && !isCurrentUser;

    // Kullanıcı adını düzgün formatlayalım
    const displayName = member.displayName || 
                       (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}`.trim() : 
                        member.firstName || member.lastName || 'İsimsiz Kullanıcı');

    return (
      <View key={member.id} style={[
        styles.memberCard, 
        member.role === 'owner' && styles.ownerMemberCard
      ]}>
        <View style={styles.memberInfo}>
          {/* Avatar Container */}
          <View style={styles.avatarContainer}>
            {renderAvatar(member)}
            {/* Renk göstergesi */}
            <View 
              style={[
                styles.colorIndicator, 
                { backgroundColor: member.color || '#ccc' },
                member.role === 'owner' && styles.ownerColorIndicator
              ]} 
            />
          </View>
          
          {/* Member Details */}
          <View style={styles.memberDetails}>
            {/* Name and Role Row */}
            <View style={styles.memberNameRow}>
              <Text style={[
                styles.memberName, 
                member.role === 'owner' && styles.ownerMemberName
              ]} numberOfLines={1}>
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
                <Text style={styles.memberUsername}>
                  {member.username}
                </Text>
              </View>
            )}
            
            {/* Stats Row */}
            <View style={styles.memberStatsRow}>
              <View style={styles.statBadge}>
                <MaterialIcons name="place" size={14} color={colors.success} />
                <Text style={styles.memberStats}>
                  {member.addedPlacesCount || 0} yer
                </Text>
              </View>
              
              {member.joinedAt && (
                <View style={styles.dateBadge}>
                  <MaterialIcons name="schedule" size={14} color={colors.textSecondary} />
                  <Text style={styles.joinDate}>
                    {new Date(member.joinedAt).toLocaleDateString('tr-TR', { 
                      day: 'numeric', 
                      month: 'short' 
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40, // X butonunun genişliğini telafi et
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  membersContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownerMemberCard: {
    backgroundColor: colors.white,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  emojiAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  emojiAvatarText: {
    fontSize: 24,
  },
  ownerAvatarContainer: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  ownerAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border,
  },
  crownOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 2,
  },
  crownEmoji: {
    fontSize: 16,
  },
  ownerEmojiAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  ownerEmojiText: {
    fontSize: 28,
  },
  memberAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
  },
  ownerColorIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 8,
    flex: 1,
  },
  ownerMemberName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  ownerText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 2,
    fontWeight: '500',
  },
  youText: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
  },
  youBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textSecondary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    marginLeft: 8,
  },
  joinDate: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  memberStats: {
    fontSize: 11,
    color: colors.success,
    marginLeft: 2,
    fontWeight: '500',
  },
  memberStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  memberUsername: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 2,
  },
  removeButton: {
    padding: 8,
  },
  colorLegend: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  legendText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activeColorsContainer: {
    gap: 8,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 10,
  },
  colorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default CollaboratorsModal;
