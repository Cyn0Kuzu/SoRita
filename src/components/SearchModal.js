import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

import { colors } from '../theme/theme';
import { db } from '../config/firebase';

import { AppStatusBar } from './AppStatusBar';

// Avatar render component for Search
const UserAvatar = ({ user, size = 55 }) => {
  // Case 1: Base64 encoded image (starts with data:image)
  if (user?.avatar && user.avatar.startsWith('data:image')) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            marginRight: 15,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#E5E5E5',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Case 2: HTTP URL (Firebase Storage URL)
  if (user?.avatar && user.avatar.startsWith('http')) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            marginRight: 15,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#E5E5E5',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Case 3: Emoji avatar or default fallback
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: colors.primary,
          fontSize: size / 2.5,
          fontWeight: 'bold',
        }}
      >
        {user?.avatar || user?.firstName?.charAt(0)?.toUpperCase() || '👤'}
      </Text>
    </View>
  );
};

export default function SearchModal({ visible, onClose, navigation, onListSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('users'); // 'users' or 'lists'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce için timeout ref
  const searchTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchUsers = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 [SearchModal] Searching users:', searchText);

      // Search by firstName (case insensitive)
      const firstNameQuery = query(
        collection(db, 'users'),
        where('firstName', '>=', searchText),
        where('firstName', '<=', `${searchText}\uf8ff`),
        limit(5)
      );
      const firstNameResults = await getDocs(firstNameQuery);

      // Search by lastName (case insensitive)
      const lastNameQuery = query(
        collection(db, 'users'),
        where('lastName', '>=', searchText),
        where('lastName', '<=', `${searchText}\uf8ff`),
        limit(5)
      );
      const lastNameResults = await getDocs(lastNameQuery);

      // Search by username (case insensitive)
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '>=', searchText.toLowerCase()),
        where('username', '<=', `${searchText.toLowerCase()}\uf8ff`),
        limit(5)
      );
      const usernameResults = await getDocs(usernameQuery);

      // Combine and deduplicate results
      const allResults = [];
      const seenIds = new Set();

      [firstNameResults, lastNameResults, usernameResults].forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            allResults.push({
              id: doc.id,
              ...doc.data(),
            });
          }
        });
      });

      setResults(allResults);
      console.log('✅ [SearchModal] Users found:', allResults.length);
    } catch (error) {
      console.error('❌ [SearchModal] Error searching users:', error);
      Alert.alert('Hata', 'Arama yapılırken bir hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLists = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 [SearchModal] Searching lists:', searchText);

      // Get all lists and filter in memory to avoid index issues
      const listsQuery = query(collection(db, 'lists'), limit(20));
      const listsResults = await getDocs(listsQuery);
      console.log('🔍 [SearchModal] Total lists in database:', listsResults.docs.length);

      // Filter by name and privacy in memory
      const filteredLists = listsResults.docs
        .filter((doc) => {
          const listData = doc.data();
          const isPublic = !listData.isPrivate; // Convert isPrivate to isPublic logic
          const matchesName = listData.name?.toLowerCase().includes(searchText.toLowerCase());
          console.log(
            '🔍 [SearchModal] List:',
            listData.name,
            'isPublic:',
            isPublic,
            'matchesName:',
            matchesName
          );
          return isPublic && matchesName;
        })
        .slice(0, 10);

      console.log('🔍 [SearchModal] Filtered lists count:', filteredLists.length);

      // Get user data for each list
      const listsWithUserData = await Promise.all(
        filteredLists.map(async (doc) => {
          const listData = doc.data();
          try {
            // Get list creator info
            const creatorId = listData.userId || listData.createdBy;
            const userQuery = query(collection(db, 'users'), where('__name__', '==', creatorId));
            const userSnap = await getDocs(userQuery);
            const userData = userSnap.docs[0]?.data() || {};

            return {
              id: doc.id,
              ...listData,
              creator: userData,
            };
          } catch (error) {
            return {
              id: doc.id,
              ...listData,
              creator: { firstName: 'Kullanıcı', lastName: '', avatar: '👤' },
            };
          }
        })
      );

      setResults(listsWithUserData);
      console.log('✅ [SearchModal] Lists found:', listsWithUserData.length);
    } catch (error) {
      console.error('❌ [SearchModal] Error searching lists:', error);
      Alert.alert('Hata', 'Liste araması yapılırken bir hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (text) => {
      setSearchQuery(text);

      // Önceki timeout'u temizle
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Eğer metin boşsa hemen temizle
      if (!text.trim()) {
        setResults([]);
        return;
      }

      // 300ms debounce ile arama yap
      searchTimeoutRef.current = setTimeout(() => {
        if (searchType === 'users') {
          searchUsers(text);
        } else {
          searchLists(text);
        }
      }, 300);
    },
    [searchType, searchUsers, searchLists]
  );

  const handleTypeChange = (type) => {
    setSearchType(type);
    setResults([]);
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

  const handleUserPress = (user) => {
    onClose();
    navigation.navigate('ViewProfile', { userId: user.id });
  };

  const handleListPress = (list) => {
    console.log('📋 [SearchModal] Opening list:', list.name);
    onClose();
    if (onListSelect) {
      onListSelect(list);
    }
  };

  const renderUserItem = ({ item: user }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleUserPress(user)}>
      <UserAvatar user={user} size={65} />

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.userUsername}>@{user.username}</Text>
        {user.bio && (
          <Text style={styles.userBio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderListItem = ({ item: list }) => (
    <TouchableOpacity style={styles.listCard} onPress={() => handleListPress(list)}>
      <View style={styles.listCardHeader}>
        {/* Liste Fotoğrafı */}
        <View style={styles.listImageContainer}>
          {list.image ? (
            <Image source={{ uri: list.image }} style={styles.listImage} resizeMode="cover" />
          ) : (
            <View style={styles.listImagePlaceholder}>
              <MaterialIcons name="location-on" size={28} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Liste Bilgileri */}
        <View style={styles.listCardInfo}>
          {/* Liste İsmi */}
          <Text style={styles.listCardName} numberOfLines={2}>
            {list.name}
          </Text>

          {/* Oluşturan Kişi */}
          <View style={styles.listCreatorRow}>
            <Text style={styles.listCreatorAvatar}>{list.creator?.avatar || '👤'}</Text>
            <Text style={styles.listCardCreator}>
              {list.creator?.firstName || 'Kullanıcı'} {list.creator?.lastName || ''}
            </Text>
          </View>

          {/* Mekan Sayısı */}
          <View style={styles.listMetaItem}>
            <MaterialIcons name="place" size={16} color={colors.textSecondary} />
            <Text style={styles.listMetaText}>{list.places?.length || 0} mekan</Text>
          </View>
        </View>

        {/* Sağ Ok İkonu */}
        <View style={styles.listCardAction}>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name={searchType === 'users' ? 'person-search' : 'search'}
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() ? 'Sonuç bulunamadı' : 'Arama yapın'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? `"${searchQuery}" için sonuç bulunamadı`
          : searchType === 'users'
            ? 'Kullanıcı aramak için isim veya kullanıcı adı yazın'
            : 'Liste aramak için liste adı yazın'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <AppStatusBar />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Ara</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchType === 'users' ? 'Kullanıcı ara...' : 'Liste ara...'}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Search Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, searchType === 'users' && styles.toggleButtonActive]}
            onPress={() => handleTypeChange('users')}
          >
            <Text style={[styles.toggleText, searchType === 'users' && styles.toggleTextActive]}>
              Kullanıcılar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, searchType === 'lists' && styles.toggleButtonActive]}
            onPress={() => handleTypeChange('lists')}
          >
            <Text style={[styles.toggleText, searchType === 'lists' && styles.toggleTextActive]}>
              Listeler
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Aranıyor...</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={searchType === 'users' ? renderUserItem : renderListItem}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsList}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    margin: 16,
    padding: 12,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  toggleContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 4,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: 'white',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  resultItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  userBio: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  listIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 27.5,
    borderWidth: 2,
    elevation: 2,
    height: 55,
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: 55,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  listCreator: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  listDescription: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Enhanced List Card Styles
  listCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F0F0',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
  },
  listImageContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    height: 60,
    marginRight: 16,
    overflow: 'hidden',
    width: 60,
  },
  listImage: {
    borderRadius: 10,
    height: 60,
    width: 60,
  },
  listImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  listCardInfo: {
    flex: 1,
  },
  listCardName: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  listCreatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  listCreatorAvatar: {
    fontSize: 18,
    marginRight: 8,
  },
  listCardCreator: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  listMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  listMetaText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  listCardAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
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
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
