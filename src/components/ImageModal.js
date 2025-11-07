import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageModal = ({ visible, imageUri, onClose, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible && imageUri) {
      setLoading(true);
      setError(false);
    }
  }, [visible, imageUri]);

  const handleClose = () => {
    setLoading(true);
    setError(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Image Container with Simple ScrollView */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={4}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent={true}
          pinchGestureEnabled={true}
          bouncesZoom={true}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="broken-image" size={64} color="#666" />
              <Text style={styles.errorText}>Fotoğraf yüklenemedi</Text>
            </View>
          )}

          {imageUri && !error && (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}
        </ScrollView>

        {/* Footer with instructions */}
        <View style={styles.footer}>
          <Text style={styles.instructionText}>
            İki parmakla yakınlaştırıp uzaklaştırabilirsiniz
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    bottom: 50,
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
    top: 50,
    zIndex: 10,
  },
  image: {
    height: screenHeight * 0.8,
    width: screenWidth,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: screenHeight,
    minWidth: screenWidth,
  },
  scrollView: {
    flex: 1,
    height: screenHeight,
    width: screenWidth,
  },
  title: {
    color: '#fff',
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
});

export default ImageModal;
