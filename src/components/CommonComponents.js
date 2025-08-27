import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import StorageService from '../services/storageService';
import CollaboratorsModal from './CollaboratorsModal';
import ImageModal from './ImageModal';

export const CustomButton = ({ title, onPress, variant = 'primary', icon, loading, style, textStyle }) => {
  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.primaryButton,
    variant === 'secondary' && styles.secondaryButton,
    variant === 'outline' && styles.outlineButton,
    style,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    variant === 'primary' && styles.primaryButtonText,
    variant === 'secondary' && styles.secondaryButtonText,
    variant === 'outline' && styles.outlineButtonText,
    textStyle,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={loading}>
      <View style={styles.buttonContent}>
        {icon && (
          <MaterialCommunityIcons 
            name={icon} 
            size={20} 
            color={
              variant === 'outline' ? colors.primary : colors.white
            }
            style={styles.buttonIcon}
          />
        )}
        <Text style={buttonTextStyle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const Card = ({ children, style }) => {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};

export const ListCard = ({ 
  list, 
  onPress, 
  showPrivacyIcon = true, 
  showArrow = true,
  showDates = true,
  showActions = false, // Yeni: İşlem butonları göster/gizle
  onShare = null,      // Paylaş fonksiyonu
  onEdit = null,       // Düzenle fonksiyonu
  onDelete = null,     // Sil fonksiyonu
  currentUserId = null, // Mevcut kullanıcı ID'si
  style = null,
  showUserInfo = true,  // Kullanıcı bilgilerini göster
  userInfo = null       // Liste sahibi bilgileri
}) => {
  // Daha akıllı cache dosyası yönetimi
  const isCacheFile = StorageService.isCacheFile(list?.image);
  const isFirebaseURL = list?.image?.includes('firebasestorage.googleapis.com');
  const [imageLoadError, setImageLoadError] = useState(isCacheFile); // Cache dosyaları baştan hatalı kabul et
  const [hasTriedLoading, setHasTriedLoading] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Tarih bilinmiyor';
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return 'Tarih bilinmiyor';
      }
      
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.log('❌ [ListCard] Date formatting error:', error);
      return 'Tarih bilinmiyor';
    }
  };
  
  if (!list) {
    return null;
  }

  // Sadece Firebase URL'leri için resim göster, cache dosyaları için fallback kullan
  const shouldShowImage = () => {
    if (!list.image) return false;
    if (isFirebaseURL && !imageLoadError) return true;
    return false; // Cache dosyaları ve hatalı resimler için fallback
  };

  // Debug logs removed for performance
  // Debug logs removed for performance
  
  return (
    <TouchableOpacity 
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 100,
        width: '100%',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      }} 
      onPress={() => {
        console.log('👆 [ListCard] TouchableOpacity basıldı!');
        console.log('👆 [ListCard] onPress fonksiyonu var mı?', !!onPress);
        console.log('👆 [ListCard] Liste adı:', list?.name);
        if (onPress) {
          console.log('👆 [ListCard] onPress çağrılıyor...');
          onPress();
        } else {
          console.log('❌ [ListCard] onPress fonksiyonu yok!');
        }
      }}
      disabled={!onPress}
    >
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-start',
        minHeight: 60,
        width: '100%'
      }}>
        {/* Image/Icon Container */}
        <View style={{
          width: 60,
          height: 60,
          backgroundColor: '#F3F4F6',
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
        }}>
          {shouldShowImage() ? (
            <TouchableOpacity 
              onPress={() => setShowImageModal(true)}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: list.image }} 
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                }}
                resizeMode="cover"
                onError={(error) => {
                  setImageLoadError(true);
                  setHasTriedLoading(true);
                }}
                onLoad={() => {
                  setImageLoadError(false);
                  setHasTriedLoading(true);
                }}
                onLoadStart={() => {
                  setHasTriedLoading(true);
                }}
              />
            </TouchableOpacity>
          ) : (
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: '#10B981',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}>
              <MaterialIcons name="collections" size={28} color="#FFFFFF" />
              <Text style={{
                fontSize: 8,
                color: '#FFFFFF',
                fontWeight: 'bold',
                marginTop: 2,
              }}>LISTE</Text>
            </View>
          )}
        </View>
        
        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#111827',
            marginBottom: 6,
            lineHeight: 22,
          }}>
            {list.name || list.title || 'İsimsiz Liste'}
          </Text>
          
          {/* Kullanıcı Bilgileri */}
          {showUserInfo && (userInfo || list.creatorName || list.userName) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
                overflow: 'hidden',
              }}>
                {userInfo?.avatar || list.userAvatar ? (
                  userInfo?.avatar?.startsWith('http') || list.userAvatar?.startsWith('http') ? (
                    <Image 
                      source={{ uri: userInfo?.avatar || list.userAvatar }} 
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 12 }}>
                      {userInfo?.avatar || list.userAvatar || '👤'}
                    </Text>
                  )
                ) : (
                  <Text style={{ fontSize: 12 }}>👤</Text>
                )}
              </View>
              <Text style={{
                fontSize: 12,
                color: '#6B7280',
                fontWeight: '500',
              }}>
                {userInfo?.displayName || 
                 (userInfo?.firstName && userInfo?.lastName ? `${userInfo.firstName} ${userInfo.lastName}` :
                  userInfo?.firstName || list.creatorName || list.userName || 'Liste Sahibi')}
              </Text>
              {userInfo?.username && (
                <Text style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  marginLeft: 4,
                }}>
                  @{userInfo.username}
                </Text>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <Text style={{
              fontSize: 14,
              color: '#1565C0',
              fontWeight: '600',
            }}>
              📍 {list.placesCount || list.places?.length || 0} yer
            </Text>
            
            <Text style={{
              fontSize: 13,
              color: list.isPrivate || list.privacy === 'private' ? '#EF4444' : '#10B981',
              fontWeight: '500',
            }}>
              {list.isPrivate || list.privacy === 'private' ? '🔒 Özel' : '🌍 Herkese Açık'}
            </Text>
            
            {/* Ortak liste göstergesi */}
            {list.isCollaborative && (
              <Text style={{
                fontSize: 12,
                color: '#8B5CF6',
                fontWeight: '500',
                flexShrink: 1,
              }}>
                👥 Ortak
              </Text>
            )}
          </View>

            {/* Ortak liste bilgileri */}
            {list.isCollaborative && (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{
                    fontSize: 12,
                    color: '#6B7280',
                    fontWeight: '500',
                  }}>
                    Üyeler: {list.actualMemberCount || (list.collaborators?.length || 0) + 1} kişi
                  </Text>
                  {list.colorAssignments && Object.keys(list.colorAssignments).length > 0 && (
                    <View style={{ flexDirection: 'row', marginLeft: 8, gap: 2 }}>
                      {Object.values(list.colorAssignments).slice(0, 4).map((color, index) => (
                        <View
                          key={index}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: color,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 1,
                            elevation: 2,
                          }}
                        />
                      ))}
                      {Object.keys(list.colorAssignments).length > 4 && (
                        <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 2 }}>
                          +{Object.keys(list.colorAssignments).length - 4}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowCollaboratorsModal(true);
                  }}
                  style={{
                    backgroundColor: '#EEF2FF',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: '#C7D2FE',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MaterialIcons name="group" size={12} color="#4F46E5" />
                  <Text style={{
                    fontSize: 11,
                    color: '#4F46E5',
                    fontWeight: '600',
                  }}>
                    Ortakları Gör
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Date Information */}
          {showDates && (
            <View style={{ marginTop: 4 }}>
              <Text style={{
                fontSize: 12,
                color: '#6B7280',
                fontWeight: '400',
                lineHeight: 16,
              }}>
                Oluşturulma: {formatDate(list.createdAt)}
              </Text>
              {list.updatedAt && (
                <Text style={{
                  fontSize: 12,
                  color: '#6B7280',
                  fontWeight: '400',
                  lineHeight: 16,
                }}>
                  Son güncelleme: {formatDate(list.updatedAt)}
                </Text>
              )}
            </View>
          )}
        </View>
        
        {/* Arrow veya Action Buttons */}
        <View style={{ paddingLeft: 8, justifyContent: 'center' }}>
          {showActions ? (
            <View style={{ flexDirection: 'column', gap: 4 }}>
              {/* Paylaş Butonu */}
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onShare && onShare(list);
                }}
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 6,
                  padding: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                }}
              >
                <MaterialIcons name="share" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Düzenle Butonu */}
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(list);
                }}
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 6,
                  padding: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                }}
              >
                <MaterialIcons name="edit" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Sil Butonu */}
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(list);
                }}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 6,
                  padding: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                }}
              >
                <MaterialIcons name="delete" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : showArrow ? (
            <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
          ) : null}
        </View>
      </View>
      
      {/* Collaborators Modal */}
      {list.isCollaborative && (
        <CollaboratorsModal
          visible={showCollaboratorsModal}
          onClose={() => setShowCollaboratorsModal(false)}
          listId={list.id}
          listTitle={list.name || list.title}
          isOwner={list.userId === currentUserId}
        />
      )}
      
      {/* Image Modal */}
      <ImageModal
        visible={showImageModal}
        imageUri={list.image}
        onClose={() => setShowImageModal(false)}
        title={list.name || list.title}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.white,
  },
  outlineButtonText: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
