import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { AuthService } from '../services/authService';
import { ValidationService } from '../services/validationService';
import AppHeader from '../components/AppHeader';
import { AppStatusBar } from '../components/AppStatusBar';
import { DEFAULT_AVATARS } from '../constants/avatars';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: DEFAULT_AVATARS[0],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  
  // Real-time validation states
  const [validationMessages, setValidationMessages] = useState({
    firstName: null,
    lastName: null,
    username: null,
    email: null,
    password: null,
    confirmPassword: null,
  });
  const [fieldTouched, setFieldTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Username availability check with debouncing
  const checkUsernameAvailability = async (username) => {
    if (username.length < 3) return;
    
    setIsUsernameChecking(true);
    try {
      const result = await AuthService.checkUsernameAvailability(username);
      setUsernameAvailable(result.available);
    } catch (error) {
      console.error('Username check error:', error);
      setUsernameAvailable(null);
    }
    setIsUsernameChecking(false);
  };

  // Email availability check with debouncing
  const checkEmailAvailability = async (email) => {
    if (!email.includes('@')) return;
    
    setIsEmailChecking(true);
    try {
      const result = await AuthService.checkEmailAvailability(email);
      setEmailAvailable(result.available);
    } catch (error) {
      console.error('Email check error:', error);
      setEmailAvailable(null);
    }
    setIsEmailChecking(false);
  };

  // Real-time validation fonksiyonları
  const validateField = (field, value) => {
    const validation = ValidationService.validateField(field, value, formData);
    setValidationMessages(prev => ({
      ...prev,
      [field]: validation.message
    }));
    return validation.isValid;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Field'i touched olarak işaretle
    setFieldTouched(prev => ({ ...prev, [field]: true }));

    // Real-time validation
    validateField(field, value);

    // Real-time availability checks
    if (field === 'username' && value.length >= 3) {
      checkUsernameAvailability(value);
    } else if (field === 'email' && value.includes('@')) {
      checkEmailAvailability(value);
    }
  };

  const selectAvatar = (avatar) => {
    setFormData(prev => ({ ...prev, avatar }));
  };

  const handleRegister = async () => {
    console.log(' [RegisterScreen] Register button pressed');
    
    // Validation kontrolü
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Uyarı', 'Şifreler eşleşmiyor.');
      return;
    }

    // AuthService zaten kendi validation'ını yapıyor
    if (usernameAvailable === false) {
      Alert.alert('Uyarı', 'Bu kullanıcı adı kullanılamaz. Lütfen başka bir kullanıcı adı seçin.');
      return;
    }

    if (emailAvailable === false) {
      Alert.alert('Uyarı', 'Bu e-posta adresi kullanılamaz. Lütfen başka bir e-posta adresi seçin.');
      return;
    }

    console.log(' [RegisterScreen] All validations passed, starting registration...');

    setLoading(true);
    try {
      console.log(' [RegisterScreen] Starting registration process...');
      const result = await AuthService.registerUser(formData);
      
      console.log(' [RegisterScreen] Registration result:', JSON.stringify(result, null, 2));
      
      if (result && result.success) {
        // Loading'i hemen durdur
        setLoading(false);
        console.log(' [RegisterScreen] Showing success alert and navigating to login');
        
        Alert.alert(
          'Kayıt Başarılı!',
          `${formData.email} adresinize doğrulama e-postası gönderildi.\n\nE-posta kutunuzu (spam klasörü dahil) kontrol ederek hesabınızı doğrulayın. Doğrulama tamamlanmadan giriş yapamazsınız.`,
          [
            {
              text: 'E-posta Kutusunu Aç',
              onPress: () => {
                console.log(' [RegisterScreen] Navigating to Login with email check message');
                navigation.navigate('Login', { 
                  email: formData.email,
                  message: 'E-posta doğrulaması gerekli. Lütfen e-posta kutunuzu kontrol edin.' 
                });
              }
            },
            {
              text: 'Giriş Sayfasına Git',
              onPress: () => {
                console.log(' [RegisterScreen] Navigating to Login page');
                navigation.navigate('Login', { 
                  email: formData.email,
                  message: 'E-posta doğrulaması tamamlandıktan sonra giriş yapabilirsiniz.'
                });
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        console.error(' [RegisterScreen] Registration failed - no success in result:', result);
        setLoading(false);
        Alert.alert('Hata', 'Kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error(' [RegisterScreen] Registration error:', error);
      console.error(' [RegisterScreen] Error details:', error.message);
      console.error(' [RegisterScreen] Error stack:', error.stack);
      setLoading(false);
      
      Alert.alert(
        'Kayıt Hatası',
        error.message || 'Hesap oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ 
          text: 'Tamam',
          onPress: () => {
            console.log(' [RegisterScreen] User acknowledged error');
          }
        }]
      );
    } finally {
      // Ensure loading is always turned off
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  // Validation message component
  const ValidationMessage = ({ field, message, touched }) => {
    if (!touched || !message) return null;
    
    return (
      <View style={styles.validationMessageContainer}>
        <MaterialIcons name="info-outline" size={16} color={colors.error} />
        <Text style={styles.validationMessage}>{message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
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
            <Text style={styles.title}>Hesap Oluştur</Text>
          </View>

          {/* Avatar Selection */}
          <View style={styles.avatarSection}>
            <Text style={styles.avatarLabel}>Avatar</Text>
            <View style={styles.avatarContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.avatarScrollContent}
              >
                <View style={styles.avatarGrid}>
                  {/* First Row */}
                  <View style={styles.avatarRow}>
                    {DEFAULT_AVATARS.slice(0, 16).map((avatar, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.avatarOption,
                          formData.avatar === avatar && styles.selectedAvatarOption
                        ]}
                        onPress={() => selectAvatar(avatar)}
                      >
                        <Text style={styles.avatarEmoji}>{avatar}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Second Row */}
                  <View style={styles.avatarRow}>
                    {DEFAULT_AVATARS.slice(16, 32).map((avatar, index) => (
                      <TouchableOpacity
                        key={index + 16}
                        style={[
                          styles.avatarOption,
                          formData.avatar === avatar && styles.selectedAvatarOption
                        ]}
                        onPress={() => selectAvatar(avatar)}
                      >
                        <Text style={styles.avatarEmoji}>{avatar}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
            
            {/* Info Message */}
            <View style={styles.avatarInfo}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.avatarInfoText}>
                Profilinizi onayladıktan sonra profil fotoğrafını güncelleyebilirsiniz
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ad"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                  autoCapitalize="words"
                />
                <ValidationMessage 
                  field="firstName"
                  message={validationMessages.firstName}
                  touched={fieldTouched.firstName}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="Soyad"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                  autoCapitalize="words"
                />
                <ValidationMessage 
                  field="lastName"
                  message={validationMessages.lastName}
                  touched={fieldTouched.lastName}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.input, styles.inputWithIcon]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Kullanıcı adı"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.username}
                  onChangeText={(text) => handleInputChange('username', text)}
                  autoCapitalize="none"
                />
                {isUsernameChecking && <ActivityIndicator size="small" color={colors.primary} />}
                {!isUsernameChecking && usernameAvailable === true && (
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                )}
                {!isUsernameChecking && usernameAvailable === false && (
                  <MaterialIcons name="error" size={20} color={colors.error} />
                )}
              </View>
              <ValidationMessage 
                field="username"
                message={validationMessages.username}
                touched={fieldTouched.username}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.input, styles.inputWithIcon]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="E-posta"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {isEmailChecking && <ActivityIndicator size="small" color={colors.primary} />}
                {!isEmailChecking && emailAvailable === true && (
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                )}
                {!isEmailChecking && emailAvailable === false && (
                  <MaterialIcons name="error" size={20} color={colors.error} />
                )}
              </View>
              <ValidationMessage 
                field="email"
                message={validationMessages.email}
                touched={fieldTouched.email}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <View style={[styles.input, styles.inputWithIcon]}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Şifre"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons 
                      name={showPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                <ValidationMessage 
                  field="password"
                  message={validationMessages.password}
                  touched={fieldTouched.password}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="Şifre Tekrar"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
                <ValidationMessage 
                  field="confirmPassword"
                  message={validationMessages.confirmPassword}
                  touched={fieldTouched.confirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>Hesap Oluştur</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                Zaten hesabınız var mı? <Text style={styles.loginLinkTextBold}>Giriş yapın</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.copyright}> SoRita 2025</Text>
            <Text style={styles.poweredBy}>Powered by MeMoDe</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  avatarSection: {
    marginBottom: 20,
  },
  avatarLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatarScrollContent: {
    paddingHorizontal: 8,
  },
  avatarGrid: {
    flexDirection: 'column',
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  avatarOption: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAvatarOption: {
    borderColor: colors.primary,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 20,
    color: '#333333',
    textAlign: 'center',
  },
  avatarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  avatarInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 14,
  },
  form: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 15,
  },
  halfWidth: {
    width: '48%',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  validationMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  validationMessage: {
    color: colors.error,
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 15,
  },
  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLinkTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
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

export default RegisterScreen;
