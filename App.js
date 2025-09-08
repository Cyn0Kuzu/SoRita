import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  View,
  Text,
  StatusBar,
  SafeAreaView,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  LogBox } from 'react-native';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    // Production'da error reporting service'e gönder
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
            <Text style={styles.errorMessage}>
              Uygulama beklenmeyen bir hatayla karşılaştı.{'\n'}
              Lütfen uygulamayı yeniden başlatın.
            </Text>
            <Text style={styles.errorDetails}>
              {this.state.error?.message || 'Bilinmeyen hata'}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingScreen = () => (
  <SafeAreaView style={styles.loadingContainer}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>SoRita Yükleniyor...</Text>
    </View>
  </SafeAreaView>
);

// Main App Component
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      appInfo: {
        name: 'SoRita',
        version: '1.0.0',
      },
    };
  }

  componentDidMount() {
    this.initializeApp();
  }

  initializeApp = async () => {
    try {
      // Simulate app initialization
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check system requirements
      await this.checkSystemRequirements();
      
      this.setState({ isLoading: false });
    } catch (error) {
      console.error('App initialization failed:', error);
      Alert.alert(
        'Başlatma Hatası',
        'Uygulama başlatılırken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
      this.setState({ isLoading: false });
    }
  };

  checkSystemRequirements = async () => {
    // Check platform compatibility
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      throw new Error('Desteklenmeyen platform');
    }

    // Check screen dimensions
    const { width, height } = Dimensions.get('window');
    if (width < 300 || height < 500) {
      console.warn('Küçük ekran boyutu tespit edildi');
    }

    return true;
  };

  render() {
    if (this.state.isLoading) {
      return <LoadingScreen />;
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>
              {this.state.appInfo.name}
            </Text>
            <Text style={styles.appVersion}>
              v{this.state.appInfo.version}
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.subtitle}>
              Harita Tabanlı Sosyal Uygulama
            </Text>
            <Text style={styles.description}>
              Arkadaşlarınızla konum paylaşın, yeni yerler keşfedin ve 
              sosyal harita deneyiminin tadını çıkarın.
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Özellikler</Text>
            <View style={styles.featuresList}>
              {this.renderFeature('📍', 'Konum Paylaşımı', 'Gerçek zamanlı konum')}
              {this.renderFeature('🗺️', 'Harita Görünümü', 'Detaylı harita deneyimi')}
              {this.renderFeature('👥', 'Sosyal Özellikler', 'Arkadaşlarla etkileşim')}
              {this.renderFeature('📸', 'Fotoğraf Paylaşımı', 'Anıları paylaş')}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2024 SoRita Team. Tüm hakları saklıdır.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  renderFeature = (icon, title, description) => (
    <View key={title} style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    flex: 1,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  },
  // Loading Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  // Error Styles
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

// Export with Error Boundary
export default // Ignore non-critical warnings
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  'Sending...',
  '[react-native-gesture-handler]',
]);

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
