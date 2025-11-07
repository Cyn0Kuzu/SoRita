// Validation utilities for forms
export class ValidationService {
  // Username validation
  static validateUsername(username) {
    const errors = [];

    if (!username) {
      errors.push('Kullanıcı adı gerekli');
      return { isValid: false, errors };
    }

    if (username.length < 3) {
      errors.push('Kullanıcı adı en az 3 karakter olmalı');
    }

    if (username.length > 20) {
      errors.push('Kullanıcı adı en fazla 20 karakter olmalı');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Kullanıcı adı sadece harf, rakam ve _ içerebilir');
    }

    if (/^\d/.test(username)) {
      errors.push('Kullanıcı adı rakam ile başlayamaz');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Email validation
  static validateEmail(email) {
    const errors = [];

    if (!email) {
      errors.push('E-posta adresi gerekli');
      return { isValid: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Geçerli bir e-posta adresi girin');
    }

    if (email.length > 100) {
      errors.push('E-posta adresi çok uzun');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Password validation - Simple rules
  static validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Şifre gerekli');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Şifre en az 8 karakter olmalı');
    }

    if (password.length > 128) {
      errors.push('Şifre çok uzun (maksimum 128 karakter)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password),
    };
  }

  // Password confirmation validation
  static validatePasswordConfirmation(password, confirmPassword) {
    const errors = [];

    if (!confirmPassword) {
      errors.push('Şifre onayı gerekli');
      return { isValid: false, errors };
    }

    if (password !== confirmPassword) {
      errors.push('Şifreler eşleşmiyor');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Name validation
  static validateName(name, fieldName = 'İsim') {
    const errors = [];

    if (!name) {
      errors.push(`${fieldName} gerekli`);
      return { isValid: false, errors };
    }

    if (name.length < 2) {
      errors.push(`${fieldName} en az 2 karakter olmalı`);
    }

    if (name.length > 50) {
      errors.push(`${fieldName} en fazla 50 karakter olmalı`);
    }

    if (!/^[a-zA-ZäöüßÄÖÜçğıüşöÇĞIÜŞÖ\s]+$/.test(name)) {
      errors.push(`${fieldName} sadece harf içerebilir`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Calculate password strength
  static calculatePasswordStrength(password) {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    score += checks.length ? 20 : 0;
    score += checks.lowercase ? 20 : 0;
    score += checks.uppercase ? 20 : 0;
    score += checks.number ? 20 : 0;
    score += checks.special ? 20 : 0;

    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    let strength = 'Çok Zayıf';
    if (score >= 40) strength = 'Zayıf';
    if (score >= 60) strength = 'Orta';
    if (score >= 80) strength = 'Güçlü';
    if (score >= 100) strength = 'Çok Güçlü';

    return {
      score,
      strength,
      checks,
    };
  }

  // Full form validation
  static validateRegistrationForm(formData) {
    const validations = {
      firstName: this.validateName(formData.firstName, 'Ad'),
      lastName: this.validateName(formData.lastName, 'Soyad'),
      username: this.validateUsername(formData.username),
      email: this.validateEmail(formData.email),
      password: this.validatePassword(formData.password),
      confirmPassword: this.validatePasswordConfirmation(
        formData.password,
        formData.confirmPassword
      ),
    };

    const isValid = Object.values(validations).every((v) => v.isValid);
    const errors = {};

    Object.keys(validations).forEach((key) => {
      if (!validations[key].isValid) {
        errors[key] = validations[key].errors[0]; // First error only
      }
    });

    return {
      isValid,
      errors,
      validations,
    };
  }

  // Field validation
  static validateField(field, value, formData = {}) {
    switch (field) {
      case 'firstName':
        const firstNameResult = this.validateName(value, 'Ad');
        return {
          isValid: firstNameResult.isValid,
          message: firstNameResult.isValid ? '' : firstNameResult.errors[0],
        };

      case 'lastName':
        const lastNameResult = this.validateName(value, 'Soyad');
        return {
          isValid: lastNameResult.isValid,
          message: lastNameResult.isValid ? '' : lastNameResult.errors[0],
        };

      case 'username':
        const usernameResult = this.validateUsername(value);
        return {
          isValid: usernameResult.isValid,
          message: usernameResult.isValid ? '' : usernameResult.errors[0],
        };

      case 'email':
        const emailResult = this.validateEmail(value);
        return {
          isValid: emailResult.isValid,
          message: emailResult.isValid ? '' : emailResult.errors[0],
        };

      case 'password':
        const passwordResult = this.validatePassword(value);
        return {
          isValid: passwordResult.isValid,
          message: passwordResult.isValid ? '' : passwordResult.errors[0],
        };

      case 'confirmPassword':
        const confirmResult = this.validatePasswordConfirmation(formData.password || '', value);
        return {
          isValid: confirmResult.isValid,
          message: confirmResult.isValid ? '' : confirmResult.errors[0],
        };

      default:
        return { isValid: true, message: '' };
    }
  }

  // Login form validation
  static validateLoginForm(formData) {
    const validations = {
      email: this.validateEmail(formData.email),
      password: {
        isValid: !!formData.password,
        errors: !formData.password ? ['Şifre gerekli'] : [],
      },
    };

    const isValid = Object.values(validations).every((v) => v.isValid);
    const errors = {};

    Object.keys(validations).forEach((key) => {
      if (!validations[key].isValid) {
        errors[key] = validations[key].errors[0];
      }
    });

    return {
      isValid,
      errors,
      validations,
    };
  }
}
