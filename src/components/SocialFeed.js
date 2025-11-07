import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text, Card, Avatar, Button } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../theme/theme';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

export default function SocialFeed() {
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser } = auth;

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const timestampDate = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = now.getTime() - timestampDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}dk`;
    } else if (hours < 24) {
      return `${hours}sa`;
    } else {
      return `${days}g`;
    }
  };

  const handleLike = (itemId) => {
    setFeedData((prevData) =>
      prevData.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            isLiked: !item.isLiked,
            likes: item.isLiked ? item.likes - 1 : item.likes + 1,
          };
        }
        return item;
      })
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Gerçek uygulamada API call yapılacak
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderFeedItem = ({ item }) => {
    const isCurrentUser = item.user.uid === currentUser?.uid;

    return (
      <Card style={styles.feedCard}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.avatar}>{item.user.avatar}</Text>
            <View style={styles.userDetails}>
              <Text style={styles.displayName}>{item.user.displayName}</Text>
              <Text style={styles.timestamp}>
                @{item.user.username} • {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
          <TouchableOpacity>
            <MaterialIcons name="more-vert" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.content}>{item.content}</Text>

        {/* Place or List Preview */}
        {item.type === 'place' && (
          <TouchableOpacity style={styles.placePreview}>
            <Image source={{ uri: item.place.image }} style={styles.placeImage} />
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{item.place.name}</Text>
              <View style={styles.placeDetails}>
                <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                <Text style={styles.placeLocation}>{item.place.location}</Text>
              </View>
              <View style={styles.placeRating}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{item.place.rating}</Text>
                <Text style={styles.category}>• {getCategoryName(item.place.category)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {item.type === 'list' && (
          <TouchableOpacity style={styles.listPreview}>
            <Image source={{ uri: item.list.image }} style={styles.listImage} />
            <View style={styles.listInfo}>
              <Text style={styles.listName}>{item.list.name}</Text>
              <Text style={styles.listCount}>{item.list.placeCount} mekan</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
            <MaterialIcons
              name={item.isLiked ? 'favorite' : 'favorite-border'}
              size={24}
              color={item.isLiked ? '#FF6B6B' : colors.textSecondary}
            />
            <Text style={[styles.actionText, item.isLiked && { color: '#FF6B6B' }]}>
              {item.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="comment-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="bookmark-border" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="share" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const getCategoryName = (category) => {
    const categories = {
      restaurant: 'Restoran',
      cafe: 'Kafe',
      attraction: 'Gezi',
      hotel: 'Otel',
      shopping: 'Alışveriş',
      entertainment: 'Eğlence',
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={feedData}
      renderItem={renderFeedItem}
      keyExtractor={(item) => item.id}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const getCategoryName = (category) => {
  const categories = {
    restaurant: 'Restoran',
    cafe: 'Kafe',
    attraction: 'Gezi',
    hotel: 'Otel',
    shopping: 'Alışveriş',
    entertainment: 'Eğlence',
  };
  return categories[category] || category;
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 6,
  },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  avatar: {
    fontSize: 40,
    marginRight: 12,
  },
  category: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  displayName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  feedCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
    padding: 16,
  },
  listContainer: {
    padding: 16,
  },
  listCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  listImage: {
    borderRadius: 8,
    height: 60,
    marginRight: 12,
    width: 80,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listPreview: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  placeDetails: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  placeImage: {
    borderRadius: 8,
    height: 80,
    marginRight: 12,
    width: 80,
  },
  placeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  placeLocation: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 4,
  },
  placeName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  placePreview: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  placeRating: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rating: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
