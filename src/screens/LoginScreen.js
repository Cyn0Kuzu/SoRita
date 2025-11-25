import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/theme';
import { AuthService } from '../services/authService';
import AppHeader from '../components/AppHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { EdgeToEdgeScreen } from '../components/EdgeToEdgeContainer';

// Development helpers for login
if (__DEV__) {
  // Add quick access to dev helpers
  global.quickLogin = async (email = 'cayankuzu.0@gmail.com', passwordIndex = 0) => {
    console.log(' [QuickLogin] Attempting login with:', email);
    
    const testPasswords = ['12345678', '123456789', 'password123', 'cayan123', 'test1234'];
    const password = testPasswords[passwordIndex];
    
    try {
      const result = await AuthService.loginUser(email, password);
      console.log(' [QuickLogin] Success!');
      return result;
    } catch (error) {
      console.error(' [QuickLogin] Failed:', error.message);
      console.log(' [QuickLogin] Try different password index (0-4) or use password reset');
      throw error;
    }
  };
  
  // Test SecureStore
  global.testSecureStore = async () => {
    try {
      console.log(' Testing SecureStore...');
      await SecureStore.setItemAsync('test', 'value');
      const value = await SecureStore.getItemAsync('test');
      await SecureStore.deleteItemAsync('test');
      console.log(' SecureStore working:', value === 'value');
      return true;
    } catch (error) {
      console.error(' SecureStore failed:', error.message);
      return false;
    }
  };
  
  console.log(' [LoginScreen] Development helpers loaded');
  console.log(' [LoginScreen] Try: quickLogin() for quick test login');
  console.log(' [LoginScreen] Try: testSecureStore() to test storage');
}

const POLICY_URL = 'https://cyn0kuzu.github.io/SoRita/';

const LoginScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    email: route?.params?.email || '',
    password: '',
  });

  const [errors, setErrors] = useState({
    email: null,
    password: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const openPolicies = useCallback(async () => {
    try {
      await Linking.openURL(POLICY_URL);
    } catch (error) {
      Alert.alert('Hata', 'Bağlantı açılamadı. Lütfen daha sonra tekrar deneyin.');
    }
  }, []);

  // Show message from registration if exists
  useEffect(() => {
    if (route?.params?.message) {
      Alert.alert('Bilgi', route.params.message);
    }
  }, [route]);

  // Helper function to suggest email corrections
  const suggestEmailCorrection = (email) => {
    const commonMistakes = [
      { wrong: '@gamil.com', correct: '@gmail.com' },
      { wrong: '@gmial.com', correct: '@gmail.com' },
      { wrong: '@gmai.com', correct: '@gmail.com' },
      { wrong: '@hotmial.com', correct: '@hotmail.com' },
      { wrong: '@yahooo.com', correct: '@yahoo.com' },
      { wrong: '@outlok.com', correct: '@outlook.com' }
    ];

    for (const mistake of commonMistakes) {
      if (email.includes(mistake.wrong)) {
        return email.replace(mistake.wrong, mistake.correct);
      }
    }
    return null;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    } else {
      // Check for common email mistakes
      const correctedEmail = suggestEmailCorrection(formData.email);
      if (correctedEmail && __DEV__) {
        Alert.alert(
          'E-posta Düzeltme Önerisi',
          `"${formData.email}" yerine "${correctedEmail}" mi demek istediniz?`,
          [
            { text: 'Hayır', style: 'cancel' },
            { 
              text: 'Evet, Düzelt', 
              onPress: () => setFormData(prev => ({ ...prev, email: correctedEmail }))
            }
          ]
        );
      }
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gerekli';
    }

    setErrors(newErrors);
    return Object.values(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    console.log(' [LoginScreen] handleLogin button pressed!');
    console.log(' [LoginScreen] Form data:', { email: formData.email, passwordLength: formData.password.length });
    
    if (!validateForm()) {
      console.log(' [LoginScreen] Form validation failed');
      return;
    }
    
    console.log(' [LoginScreen] Form validation passed');
    setLoading(true);
    console.log(' [LoginScreen] Starting login process...');
    
    try {
      console.log(' [LoginScreen] Calling AuthService.loginUser with timeout...');
      
      // Add timeout to prevent hanging login
      const loginWithTimeout = Promise.race([
        AuthService.loginUser(formData.email, formData.password),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Giriş işlemi zaman aşımına uğradı. Tekrar deneyin.')), 15000)
        )
      ]);
      
      const result = await loginWithTimeout;
      console.log(' [LoginScreen] AuthService.loginUser result:', result);
      
      if (result.success) {
        if (result.requiresVerification) {
          // Show email verification warning - STRONGER WARNING
          Alert.alert(
            'E-posta Doğrulama Gerekli',
            `${result.user.email} adresinize gönderilen doğrulama e-postasını kontrol etmelisiniz.\n\nE-posta doğrulanmadan uygulamanın bazı özellikleri kullanılamayacak.`,
            [
              {
                text: 'Yeniden Gönder',
                onPress: async () => {
                  try {
                    await AuthService.sendEmailVerification();
                    Alert.alert(
                      'E-posta Gönderildi!',
                      `${result.user.email} adresine yeni doğrulama e-postası gönderildi.\n\nE-posta kutunuzu (spam klasörü dahil) kontrol edin.`,
                      [
                        {
                          text: 'Tamam',
                          onPress: () => console.log(' Email verification sent, auth state will handle navigation')
                        }
                      ]
                    );
                  } catch (emailError) {
                    Alert.alert('Hata', 'E-posta gönderilemedi. İnternet bağlantınızı kontrol edin.');
                  }
                }
              },
              {
                text: 'Daha Sonra',
                style: 'cancel',
                onPress: () => {
                  console.log(' User will continue with unverified email, auth state will handle navigation');
                }
              }
            ]
          );
        } else {
          // Email verified, proceed to main app
          console.log(' Email verified, auth state will handle navigation');
        }
      }
    } catch (error) {
      console.log(' [LoginScreen] Entering catch block');
      console.error(' [LoginScreen] Login error:', error);
      console.error(' [LoginScreen] Error message:', error.message);
      
      // Check specific error types and show appropriate messages
      if (error.message.includes('doğrulanmamış') || error.message.includes('verified')) {
        // Email not verified error
        Alert.alert(
          'E-posta Doğrulama Gerekli',
          'E-posta adresiniz henüz doğrulanmamış. Giriş yapabilmek için e-posta kutunuzu (spam klasörü dahil) kontrol edin ve doğrulama bağlantısına tıklayın.',
          [
            {
              text: 'Doğrulama E-postasını Yeniden Gönder',
              onPress: async () => {
                try {
                  // Just send verification email directly
                  await AuthService.sendEmailVerification();
                  Alert.alert(
                    'E-posta Gönderildi',
                    `${formData.email} adresinize yeni doğrulama e-postası gönderildi.\n\nE-posta kutunuzu kontrol edin ve doğrulama bağlantısına tıklayın.`
                  );
                } catch (emailError) {
                  Alert.alert('Hata', 'Doğrulama e-postası gönderilemedi. İnternet bağlantınızı kontrol edin.');
                }
              }
            },
            { text: 'Tamam', style: 'cancel' }
          ]
        );
      } else if (error.message.includes('wrong-password') || error.message.includes('şifre')) {
        // Wrong password error
        Alert.alert(
          'Hatalı Şifre',
          'Girdiğiniz şifre yanlış. Lütfen şifrenizi kontrol edin veya şifre sıfırlama seçeneğini kullanın.',
          [
            { text: 'Tekrar Dene', style: 'cancel' },
            { 
              text: 'Şifremi Unuttum', 
              onPress: () => handleForgotPassword()
            }
          ]
        );
      } else if (error.message.includes('user-not-found') || error.message.includes('kullanıcı bulunamadı')) {
        // User not found error
        Alert.alert(
          'Kullanıcı Bulunamadı',
          'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı. E-posta adresinizi kontrol edin veya yeni hesap oluşturun.',
          [
            { text: 'Tekrar Dene', style: 'cancel' },
            { 
              text: 'Hesap Oluştur', 
              onPress: () => navigation.navigate('Register')
            }
          ]
        );
      } else if (error.message.includes('too-many-requests')) {
        // Too many attempts error
        Alert.alert(
          'Çok Fazla Deneme',
          'Çok fazla başarısız giriş denemesi yapıldı. Lütfen bir süre bekleyin veya şifrenizi sıfırlayın.',
          [
            { text: 'Tamam', style: 'cancel' },
            { 
              text: 'Şifre Sıfırla', 
              onPress: () => handleForgotPassword()
            }
          ]
        );
      } else if (error.message.includes('network') || error.message.includes('ağ')) {
        // Network error
        Alert.alert(
          'Bağlantı Hatası',
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } else {
        // Generic error - check if it's development mode for better error messages
        if (__DEV__ && (error.message.includes('E-posta veya şifre hatalı') || error.message.includes('invalid-login-credentials'))) {
          // In development, show more helpful error with test accounts
          Alert.alert(
            'Giriş Hatası',
            error.message,
            [
              { text: 'Tamam', style: 'cancel' },
              { 
                text: 'Test Hesapları', 
                onPress: () => {
                  Alert.alert(
                    'Test Hesapları',
                    'Kullanılabilir test hesapları:\n\n• finduk513@gmail.com\n• cayankuzu.0@gmail.com\n\nE-posta adresini doğru yazdığınızdan emin olun.',
                    [{ text: 'Tamam' }]
                  );
                }
              }
            ]
          );
        } else {
          // Production mode or other errors
          Alert.alert(
            'Giriş Hatası',
            error.message || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.',
            [{ text: 'Tamam' }]
          );
        }
      }
    } finally {
      console.log(' [LoginScreen] Finally block - setting loading to false');
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    // Eğer form'da geçerli bir e-posta varsa direkt kullan
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(formData.email.trim())) {
        // Form'daki e-posta geçerli, onay iste
        Alert.alert(
          'Şifre Sıfırlama Onayı',
          `"${formData.email}" adresine şifre sıfırlama bağlantısı gönderilsin mi?`,
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Gönder',
              onPress: async () => {
                try {
                  setLoading(true);
                  await AuthService.sendPasswordResetEmail(formData.email.trim());
                  Alert.alert(
                    'Şifre Sıfırlama E-postası Gönderildi', 
                    `Şifre sıfırlama bağlantısı ${formData.email} adresine gönderildi.\n\n` +
                    `E-posta kutunuzu kontrol edin\n` +
                    `Spam/Junk klasörünü de kontrol edin\n` +
                    `E-postadaki bağlantıya tıklayarak yeni şifre belirleyin\n` +
                    `Yeni şifrenizle bu ekrandan giriş yapabilirsiniz`,
                    [{ text: 'Anladım' }]
                  );
                } catch (error) {
                  console.error(' [LoginScreen] Password reset error:', error);
                  Alert.alert('Hata', error.message || 'Şifre sıfırlama e-postası gönderilemedi.');
                } finally {
                  setLoading(false);
                }
              }
            },
            {
              text: 'Farklı E-posta',
              onPress: () => promptForEmail()
            }
          ]
        );
        return;
      }
    }
    
    // Form'da e-posta yok veya geçersiz, kullanıcıdan iste
    promptForEmail();
  };

  const promptForEmail = () => {
    Alert.alert(
      'Şifre Sıfırlama',
      'Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin. Size şifre sıfırlama bağlantısı göndereceğiz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'E-posta Gir',
          onPress: () => {
            Alert.prompt(
              'E-posta Adresi',
              'Şifre sıfırlama bağlantısı gönderilecek e-posta adresinizi girin:',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Gönder',
                  onPress: async (email) => {
                    if (!email || !email.trim()) {
                      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi girin.');
                      return;
                    }
                    
                    // E-posta formatını kontrol et
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email.trim())) {
                      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi formatı girin.');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      await AuthService.sendPasswordResetEmail(email.trim());
                      Alert.alert(
                        'Şifre Sıfırlama E-postası Gönderildi', 
                        `Şifre sıfırlama bağlantısı ${email} adresine gönderildi.\n\n` +
                        `E-posta kutunuzu kontrol edin\n` +
                        `Spam/Junk klasörünü de kontrol edin\n` +
                        `E-postadaki bağlantıya tıklayarak yeni şifre belirleyin\n` +
                        `Yeni şifrenizle bu ekrandan giriş yapabilirsiniz`,
                        [
                          {
                            text: 'Anladım',
                            onPress: () => {
                              // Kullanıcının girdiği e-posta adresini form'a otomatik doldur
                              setFormData(prev => ({ ...prev, email: email.trim() }));
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error(' [LoginScreen] Password reset error:', error);
                      Alert.alert('Hata', error.message || 'Şifre sıfırlama e-postası gönderilemedi.');
                    } finally {
                      setLoading(false);
                    }
                  }
                }
              ],
              'plain-text',
              formData.email || ''
            );
          }
        }
      ]
    );
  };

  return (
    <EdgeToEdgeScreen style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <AppStatusBar />
      {/* Header */}
      <AppHeader />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Giriş Yap</Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="E-posta"
                placeholderTextColor={colors.textSecondary}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <View style={[styles.input, styles.inputWithIcon, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Şifre"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons 
                    name={showPassword ? 'visibility-off' : 'visibility'} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Şifrenizi mi unuttunuz?</Text>
            </TouchableOpacity>

            <Text style={styles.privacyText}>
              Giriş yaparak{' '}
              <Text style={styles.privacyLink} onPress={openPolicies}>
                Gizlilik Politikası ve Kullanım Koşulları
              </Text>
              'nı kabul ediyorum.
            </Text>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerLinkText}>
                Hesabınız yok mu? <Text style={styles.registerLinkTextBold}>Kayıt olun</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Copyright */}
          <View style={styles.footer}>
            <Text style={styles.copyright}> SoRita 2025</Text>
            <Text style={styles.poweredBy}>Powered by MeMoDe</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </EdgeToEdgeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0, // StatusBar için yer
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  privacyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  privacyLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  registerLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLinkTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  copyright: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  poweredBy: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default LoginScreen;
