import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl
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
  const currentUser = auth.currentUser;

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
    setFeedData(prevData =>
      prevData.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            isLiked: !item.isLiked,
            likes: item.isLiked ? item.likes - 1 : item.likes + 1
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
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <MaterialIcons 
              name={item.isLiked ? "favorite" : "favorite-border"} 
              size={24} 
              color={item.isLiked ? "#FF6B6B" : colors.textSecondary} 
            />
            <Text style={[styles.actionText, item.isLiked && { color: "#FF6B6B" }]}>
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
      entertainment: 'Eğlence'
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
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
    entertainment: 'Eğlence'
  };
  return categories[category] || category;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  feedCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 40,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  placePreview: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  category: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  listPreview: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  listImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
});
