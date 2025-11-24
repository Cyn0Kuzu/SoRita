import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, query, where, collection, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { auth, db } from '../config/firebase';
import { ValidationService } from './validationService';

// Global registration flag to prevent App.js interference
let isRegistrationInProgress = false;

export const getRegistrationInProgress = () => isRegistrationInProgress;
export const setRegistrationInProgress = (value) => {
  isRegistrationInProgress = value;
  console.log(' [AuthService] Registration in progress flag set to:', value);
};

export class AuthService {
  // Real-time availability checkers with debouncing
  static usernameCheckTimeout = null;
  static emailCheckTimeout = null;

  // Development helper function to reset test accounts
  static async resetTestAccountPassword(email) {
    if (!__DEV__) {
      throw new Error('This function is only available in development mode');
    }
    
    try {
      console.log(' [AuthService] Resetting password for test account:', email);
      await sendPasswordResetEmail(auth, email);
      console.log(' [AuthService] Password reset email sent successfully');
      console.log(' [AuthService] Check your email and click the reset link');
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error(' [AuthService] Password reset failed:', error);
      throw error;
    }
  }

  // Generate username suggestions
  static generateUsernameSuggestions(username) {
    const suggestions = [];
    const base = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Add numbers
    for (let i = 1; i <= 5; i++) {
      suggestions.push(`${base}${i}`);
    }
    
    // Add common suffixes
    const suffixes = ['_user', '_official', '2024', '_tr'];
    suffixes.forEach(suffix => {
      suggestions.push(`${base}${suffix}`);
    });
    
    return suggestions.slice(0, 5);
  }

  // Check if username is available with validation and debouncing
  static async checkUsernameAvailability(username) {
    try {
      // Clear previous timeout
      if (this.usernameCheckTimeout) {
        clearTimeout(this.usernameCheckTimeout);
      }

      return new Promise((resolve) => {
        this.usernameCheckTimeout = setTimeout(async () => {
          try {
            const validation = ValidationService.validateUsername(username);
            if (!validation.isValid) {
              resolve({
                available: false,
                valid: false,
                error: validation.errors[0],
                suggestions: this.generateUsernameSuggestions(username)
              });
              return;
            }

            const usernameDoc = doc(db, 'usernames', username.toLowerCase());
            const docSnap = await getDoc(usernameDoc);
            
            resolve({
              available: !docSnap.exists(),
              valid: true,
              error: !docSnap.exists() ? null : 'Bu kullanıcı adı zaten kullanılıyor',
              suggestions: !docSnap.exists() ? [] : this.generateUsernameSuggestions(username)
            });
          } catch (error) {
            console.error('Error checking username:', error);
            resolve({
              available: false,
              valid: false,
              error: 'Kullanıcı adı kontrol edilemedi',
              suggestions: []
            });
          }
        }, 500); // 500ms debounce
      });
    } catch (error) {
      console.error('Error in username availability check:', error);
      throw error;
    }
  }

  // Check if email is available with validation and debouncing
  static async checkEmailAvailability(email) {
    try {
      // Clear previous timeout
      if (this.emailCheckTimeout) {
        clearTimeout(this.emailCheckTimeout);
      }

      return new Promise((resolve) => {
        this.emailCheckTimeout = setTimeout(async () => {
          try {
            const validation = ValidationService.validateEmail(email);
            if (!validation.isValid) {
              resolve({
                available: false,
                valid: false,
                error: validation.errors[0]
              });
              return;
            }

            const emailQuery = query(
              collection(db, 'users'), 
              where('email', '==', email.toLowerCase())
            );
            const querySnapshot = await getDocs(emailQuery);
            
            resolve({
              available: querySnapshot.empty,
              valid: true,
              error: querySnapshot.empty ? null : 'Bu e-posta adresi zaten kullanılıyor'
            });
          } catch (error) {
            console.error('Error checking email:', error);
            resolve({
              available: false,
              valid: false,
              error: 'E-posta kontrol edilemedi'
            });
          }
        }, 500); // 500ms debounce
      });
    } catch (error) {
      console.error('Error in email availability check:', error);
      throw error;
    }
  }

  // Reserve username
  static async reserveUsername(username, userId) {
    try {
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        userId,
        reservedAt: new Date(),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error reserving username:', error);
      throw error;
    }
  }

  // Remove username reservation (cleanup on failure)
  static async removeUsernameReservation(username) {
    try {
      await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
    } catch (error) {
      console.error('Error removing username reservation:', error);
    }
  }

  // Professional user registration with comprehensive validation and email verification
  static async registerUser(userData) {
    const { firstName, lastName, username, email, password, avatar } = userData;
    
    try {
      console.log(' [AuthService] Starting user registration process...');
      
      // Set registration in progress flag
      setRegistrationInProgress(true);
      
      // Step 1: Comprehensive form validation
      const validation = ValidationService.validateRegistrationForm(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors)[0]}`);
      }

      // Step 2: Real-time availability checks
      console.log(' [AuthService] Checking availability...');
      const [usernameCheck, emailCheck] = await Promise.all([
        this.checkUsernameAvailability(username),
        this.checkEmailAvailability(email)
      ]);

      if (!usernameCheck.available) {
        throw new Error(usernameCheck.error || 'Kullanıcı adı kullanılamaz');
      }

      if (!emailCheck.available) {
        throw new Error(emailCheck.error || 'E-posta adresi kullanılamaz');
      }

      // Step 3: Create Firebase Auth user
      console.log(' [AuthService] Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        // Step 4: Reserve username
        console.log(' [AuthService] Reserving username...');
        await this.reserveUsername(username, user.uid);

        // Step 5: Create comprehensive user profile
        console.log(' [AuthService] Creating user profile...');
        const userProfile = {
          // Basic Info
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          
          // Profile
          avatar: avatar || '',
          bio: '',
          location: '',
          website: '',
          
          // Counters
          followersCount: 0,
          followingCount: 0,
          placesCount: 0,
          listsCount: 0,
          reviewsCount: 0,
          
          // Social arrays
          followers: [],
          following: [],
          
          // Status
          isPublic: true,
          isActive: true,
          isEmailVerified: false,
          emailVerificationSent: true,
          emailVerificationSentAt: serverTimestamp(),
          
          // Timestamps
          joinedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          
          // Settings
          settings: {
            notifications: {
              email: true,
              push: true,
              followers: true,
              reviews: true,
              lists: true,
              marketing: false
            },
            privacy: {
              showEmail: false,
              showLocation: true,
              allowFollowers: true,
              profileVisibility: 'public'
            },
            language: 'tr',
            theme: 'light'
          }
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        // Cache user data locally
        await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify({
          ...userProfile,
          uid: user.uid,
          email: user.email
        }));

        // Step 6: Update Firebase Auth profile
        console.log(' [AuthService] Updating auth profile...');
        await updateProfile(user, {
          displayName: userProfile.displayName
        });

        // Step 7: Send email verification IMMEDIATELY
        console.log(' [AuthService] Sending verification email...');
        await sendEmailVerification(user);
        console.log(' [AuthService] Verification email sent successfully');

        // Step 8: Sign out user immediately after registration
        console.log(' [AuthService] Signing out user until email is verified...');
        await signOut(auth);
        console.log(' [AuthService] User signed out, must verify email to login');

        console.log(' [AuthService] Registration completed successfully');
        
        const returnData = {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified
          },
          profile: userProfile,
          message: 'Kayıt başarıyla tamamlandı! E-posta adresinizi kontrol edin ve doğrulama linkine tıklayın.'
        };
        
        console.log(' [AuthService] Returning registration result:', returnData);
        
        // Clear registration flag
        setRegistrationInProgress(false);
        
        return returnData;

      } catch (profileError) {
        // Cleanup on profile creation failure
        console.error(' [AuthService] Profile creation failed:', profileError);
        await this.removeUsernameReservation(username);
        
        // Delete the auth user if profile creation failed
        if (user) {
          try {
            await user.delete();
          } catch (deleteError) {
            console.error('Error deleting user on cleanup:', deleteError);
          }
        }
        
        throw profileError;
      }

    } catch (error) {
      console.error(' [AuthService] Registration failed:', error);
      // Clear registration flag on error
      setRegistrationInProgress(false);
      throw new Error(error.message || 'Kayıt işlemi başarısız oldu');
    }
  }

  // Professional login with email verification check
  static async loginUser(email, password, skipCredentialSave = false) {
    try {
      console.log(' [AuthService] Starting login process...');
      console.log(' [AuthService] Email:', email);
      console.log(' [AuthService] Password length:', password?.length);
      
      // Debug: Print available test accounts in development
      if (__DEV__) {
        console.log(' [AuthService] DEVELOPMENT MODE - Available test accounts:');
        console.log(' [AuthService] Test account 1: finduk513@gmail.com');
        console.log(' [AuthService] Test account 2: cayankuzu.0@gmail.com');
        console.log(' [AuthService] If you forgot password, use "Şifremi Unuttum" button');
        console.log(' [AuthService] Current attempt - Email:', email, 'Password length:', password?.length);
      }
      
      // Step 1: Validate inputs
      const validation = ValidationService.validateLoginForm({ email, password });
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Step 2: Sign in with Firebase Auth
      console.log(' [AuthService] Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      // Step 2.5: Check email verification
      console.log(' [AuthService] Checking email verification status...');
      let requiresVerification = false;
      if (!user.emailVerified) {
        console.log(' [AuthService] Email not verified - allowing login with verification warning');
        requiresVerification = true;
        // Don't sign out - let user use the app with verification reminders
      } else {
        console.log(' [AuthService] Email is verified');
      }

      // Step 3: Get user profile from Firestore
      console.log(' [AuthService] Fetching user profile...');
      console.log(' [AuthService] User UID:', user.uid);
      console.log(' [AuthService] User authenticated:', !!user.uid);
      
      const userDocRef = doc(db, 'users', user.uid);
      console.log(' [AuthService] Document path:', `users/${user.uid}`);
      
      let profile;
      try {
        console.log(' [AuthService] Fetching user document with timeout...');
        
        // Add timeout to prevent hanging
        const fetchWithTimeout = Promise.race([
          getDoc(userDocRef),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore timeout')), 8000)
          )
        ]);
        
        const userDoc = await fetchWithTimeout;
        console.log(' [AuthService] Document fetch result:', { exists: userDoc.exists() });
        
        if (!userDoc.exists()) {
          console.error(' [AuthService] User document does not exist');
          throw new Error('Kullanıcı profili bulunamadı');
        }

        profile = userDoc.data();
        console.log(' [AuthService] Profile data retrieved successfully');

        // Cache user data locally
        await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify({
          ...profile,
          uid: user.uid,
          email: user.email
        }));

      } catch (firestoreError) {
        console.error(' [AuthService] Firestore error details:', firestoreError);
        console.error(' [AuthService] Error code:', firestoreError.code);
        console.error(' [AuthService] Error message:', firestoreError.message);
        
        // Handle offline scenarios and timeouts gracefully
        if (firestoreError.code === 'unavailable' || 
            firestoreError.message.includes('offline') ||
            firestoreError.message.includes('timeout')) {
          console.log(' [AuthService] Connection issue detected, checking cached data...');
          
          try {
            // Try to get cached user data
            const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
            if (cachedData) {
              console.log(' [AuthService] Using cached user data');
              profile = JSON.parse(cachedData);
            } else {
              console.log(' [AuthService] No cached data available');
              throw new Error('İnternet bağlantısı gerekli - ilk kez giriş yaparken çevrimiçi olmanız gerekiyor');
            }
          } catch (cacheError) {
            console.error(' [AuthService] Cache error:', cacheError);
            throw new Error('İnternet bağlantısı gerekli - ilk kez giriş yaparken çevrimiçi olmanız gerekiyor');
          }
        } else {
          throw new Error('Profil bilgileri alınamadı: ' + firestoreError.message);
        }
      }

      // Step 4: Update last login time (skip if offline)
      console.log(' [AuthService] Updating last login...');
      try {
        // Add timeout for update operation
        const updateWithTimeout = Promise.race([
          updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Update timeout')), 5000)
          )
        ]);
        
        await updateWithTimeout;
        console.log(' [AuthService] Last login updated');
      } catch (updateError) {
        console.log(' [AuthService] Could not update last login (offline/timeout):', updateError.message);
        // Don't fail login just because we can't update last login time
      }

      // Step 5: Check email verification status
      const emailVerified = user.emailVerified;
      
      // Step 6: Handle password reset completion and save credentials for auto-login
      if (!skipCredentialSave) {
        try {
          console.log(' [AuthService] Saving credentials for auto-login...');
          
          // Check if this user just completed a password reset
          const passwordResetPending = await AsyncStorage.getItem('passwordResetPending');
          const passwordResetEmail = await AsyncStorage.getItem('passwordResetEmail');
          
          if (passwordResetPending === 'true' && 
              passwordResetEmail && 
              passwordResetEmail.toLowerCase() === email.trim().toLowerCase()) {
            console.log(' [AuthService] Password reset completed - updating saved credentials with new password');
            
            // Clear the password reset tracking
            await AsyncStorage.removeItem('passwordResetPending');
            await AsyncStorage.removeItem('passwordResetEmail');
          }
          
          // Save credentials with error handling
          try {
            await SecureStore.setItemAsync('userEmail', email.trim().toLowerCase());
            await SecureStore.setItemAsync('userPassword', password);
            await AsyncStorage.setItem('autoLoginEnabled', 'true');
            console.log(' [AuthService] Credentials saved successfully');
          } catch (secureStoreError) {
            console.warn(' [AuthService] SecureStore failed, clearing and disabling auto-login:', secureStoreError.message);
            
            // Clear potentially corrupted data and disable auto-login
            try {
              await SecureStore.deleteItemAsync('userEmail');
              await SecureStore.deleteItemAsync('userPassword');
              await AsyncStorage.setItem('autoLoginEnabled', 'false');
            } catch (clearError) {
              console.warn(' [AuthService] Could not clear SecureStore:', clearError.message);
            }
            
            // Don't throw error - just continue without saving credentials
            console.log(' [AuthService] Login continues without credential saving');
          }
        } catch (storageError) {
          console.log(' [AuthService] Could not save credentials:', storageError.message);
          // Don't fail login just because we can't save credentials
        }
      } else {
        console.log(' [AuthService] Skipping credential save (auto-login)');
      }
      
      console.log(' [AuthService] Login completed successfully');
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: emailVerified
        },
        profile,
        emailVerified,
        requiresVerification: !emailVerified,
        message: emailVerified ? 'Başarıyla giriş yaptınız!' : 'E-posta adresinizi doğrulamanız gerekiyor.'
      };

    } catch (error) {
      console.error(' [AuthService] Login failed:', error);
      
      // If this is our custom email verification error, preserve the original message
      if (error.message.includes('doğrulanmamış') || error.message.includes('verified')) {
        throw error; // Re-throw with original message
      }
      
      // Provide user-friendly error messages for Firebase errors
      let errorMessage = 'Giriş işlemi başarısız oldu';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else if (error.code === 'auth/invalid-login-credentials') {
        if (__DEV__) {
          // In development, provide more helpful error message
          errorMessage = `E-posta veya şifre hatalı.\n\nTest hesapları:\n• finduk513@gmail.com\n• cayankuzu.0@gmail.com\n\nGirdiğiniz bilgiler:\n• E-posta: ${email}\n• Şifre uzunluğu: ${password?.length}\n\nE-posta adresini doğru yazdığınızdan ve şifrenin doğru olduğundan emin olun.`;
        } else {
          errorMessage = 'E-posta veya şifre hatalı';
        }
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin';
      } else if (error.message) {
        // Use original error message if available
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Send email verification
  static async sendEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'E-posta adresi zaten doğrulanmış'
        };
      }

      await sendEmailVerification(user, {
        url: `https://sorita-6d27e.web.app/verify-email`,
        handleCodeInApp: true
      });

      // Update user profile
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        emailVerificationSentAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        message: 'Doğrulama e-postası gönderildi. E-posta kutunuzu kontrol edin.'
      };

    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('E-posta doğrulama gönderilemedi');
    }
  }

  // Logout
  static async logoutUser() {
    try {
      await signOut(auth);
      // Clear saved credentials on logout
      await this.clearSavedCredentials();
      return {
        success: true,
        message: 'Başarıyla çıkış yaptınız'
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Çıkış işlemi başarısız oldu');
    }
  }

  // Password reset
  static async sendPasswordResetEmail(email) {
    try {
      const validation = ValidationService.validateEmail(email);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      await sendPasswordResetEmail(auth, email);
      
      // Mark user for password reset tracking
      await AsyncStorage.setItem('passwordResetEmail', email.trim().toLowerCase());
      await AsyncStorage.setItem('passwordResetPending', 'true');
      
      return {
        success: true,
        message: 'Şifre sıfırlama e-postası gönderildi'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Şifre sıfırlama e-postası gönderilemedi';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Logout user
  static async logout() {
    try {
      console.log(' [AuthService] Starting logout process...');
      await signOut(auth);
      // Clear ALL saved credentials and preferences on manual logout
      await this.clearSavedCredentials();
      await AsyncStorage.removeItem('rememberMe');
      await AsyncStorage.removeItem('userEmail');
      console.log(' [AuthService] User logged out successfully');
      return { success: true };
    } catch (error) {
      console.error(' [AuthService] Logout failed:', error);
      throw new Error('Çıkış yapılamadı');
    }
  }

  // Check if user should be remembered
  static async checkRememberMe() {
    try {
      const rememberMe = await AsyncStorage.getItem('rememberMe');
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      return {
        shouldRemember: rememberMe === 'true',
        email: userEmail
      };
    } catch (error) {
      console.error(' [AuthService] Error checking remember me:', error);
      return { shouldRemember: false, email: null };
    }
  }

  // Auth state observer
  static onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  static getCurrentUser() {
    return auth.currentUser;
  }

  // Auto-login: Check if saved credentials exist
  static async checkAutoLogin() {
    try {
      console.log(' [AuthService] Checking for saved credentials...');
      
      const autoLoginEnabled = await AsyncStorage.getItem('autoLoginEnabled');
      if (autoLoginEnabled !== 'true') {
        console.log(' [AuthService] Auto-login not enabled');
        return { hasCredentials: false };
      }

      let email, password;
      
      try {
        email = await SecureStore.getItemAsync('userEmail');
        password = await SecureStore.getItemAsync('userPassword');
      } catch (secureStoreError) {
        console.warn(' [AuthService] SecureStore error, clearing corrupted data:', secureStoreError.message);
        
        // Clear potentially corrupted SecureStore data
        try {
          await SecureStore.deleteItemAsync('userEmail');
          await SecureStore.deleteItemAsync('userPassword');
          await AsyncStorage.setItem('autoLoginEnabled', 'false');
        } catch (clearError) {
          console.warn(' [AuthService] Could not clear corrupted data:', clearError.message);
        }
        
        return { hasCredentials: false };
      }

      if (email && password) {
        console.log(' [AuthService] Saved credentials found');
        return {
          hasCredentials: true,
          email,
          password
        };
      } else {
        console.log(' [AuthService] No saved credentials found');
        return { hasCredentials: false };
      }
    } catch (error) {
      console.error(' [AuthService] Error checking auto-login:', error);
      return { hasCredentials: false };
    }
  }

  // Auto-login: Attempt login with saved credentials
  static async performAutoLogin() {
    try {
      console.log(' [AuthService] Performing auto-login...');
      
      const credentialsCheck = await this.checkAutoLogin();
      if (!credentialsCheck.hasCredentials) {
        return { success: false, reason: 'No saved credentials' };
      }

      // Attempt login with saved credentials (skip saving credentials again)
      const loginResult = await this.loginUser(credentialsCheck.email, credentialsCheck.password, true);
      
      if (loginResult.success) {
        console.log(' [AuthService] Auto-login successful');
        return {
          success: true,
          user: loginResult.user,
          profile: loginResult.profile,
          emailVerified: loginResult.emailVerified,
          requiresVerification: loginResult.requiresVerification
        };
      } else {
        console.log(' [AuthService] Auto-login failed');
        // Clear invalid credentials
        await this.clearSavedCredentials();
        return { success: false, reason: 'Invalid credentials' };
      }
    } catch (error) {
      console.error(' [AuthService] Auto-login error:', error);
      // Clear problematic credentials
      await this.clearSavedCredentials();
      return { success: false, reason: error.message };
    }
  }

  // Clear saved credentials (when user logs out or credentials are invalid)
  static async clearSavedCredentials() {
    try {
      console.log(' [AuthService] Clearing saved credentials...');
      
      // Clear SecureStore items with individual error handling
      try {
        await SecureStore.deleteItemAsync('userEmail');
      } catch (error) {
        console.warn(' [AuthService] Could not delete userEmail from SecureStore:', error.message);
      }
      
      try {
        await SecureStore.deleteItemAsync('userPassword');
      } catch (error) {
        console.warn(' [AuthService] Could not delete userPassword from SecureStore:', error.message);
      }
      
      // Clear AsyncStorage items
      await AsyncStorage.removeItem('autoLoginEnabled');
      
      // Also clear password reset tracking
      await AsyncStorage.removeItem('passwordResetPending');
      await AsyncStorage.removeItem('passwordResetEmail');
      
      console.log(' [AuthService] Credentials cleared');
    } catch (error) {
      console.error(' [AuthService] Error clearing credentials:', error);
    }
  }

  // Legacy compatibility methods
  static async isUsernameAvailable(username) {
    const result = await this.checkUsernameAvailability(username);
    return result.available;
  }

  static async isEmailAvailable(email) {
    const result = await this.checkEmailAvailability(email);
    return result.available;
  }
}
