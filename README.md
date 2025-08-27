# SoRita - Modern React Native Harita Uygulaması

Bu proje, React Native ve Expo kullanarak geliştirilmiş modern bir harita uygulamasıdır. Uygulama, kullanıcıların haritaları görüntüleyebilecekleri, konumlarını belirleyebilecekleri ve çeşitli yerleri keşfedebilecekleri kapsamlı bir platform sunar.

## 🚀 Özellikler

### 📱 Ana Ekranlar
- **Hoşgeldin Ekranı**: Kullanıcı karşılama ve uygulama tanıtımı
- **Kayıt/Giriş Ekranları**: Güvenli kullanıcı kimlik doğrulama
- **Ana Sayfa**: Öne çıkan yerler ve öneriler
- **Harita Ekranı**: İnteraktif harita görünümü
- **Profil Ekranı**: Kullanıcı ayarları ve bilgileri

### 🗺️ Harita Özellikleri
- **React Native Maps** ile güçlü harita görünümü
- **Konum İzinleri** ve gerçek zamanlı konum takibi
- **Yer Arama** ve işaretçi yerleştirme
- **Özel Harita Stili** ve modern tasarım
- **Konum Odaklama** ve navigasyon butonları

### 🎨 Modern UI/UX
- **React Native Paper** Material Design bileşenleri
- **Tutarlı Renk Paleti** ve tema sistemi
- **Responsive Tasarım** farklı ekran boyutları için
- **Smooth Animasyonlar** ve geçişler
- **Bottom Tab Navigation** kolay gezinme için

## 📋 Gereksinimler

- Node.js (v16 veya üzeri)
- Expo CLI
- Android Studio (Android için) veya Xcode (iOS için)
- Expo Go uygulaması (test için)

## 🛠️ Kurulum

1. **Projeyi klonlayın:**
   \`\`\`bash
   git clone https://github.com/yourusername/sorita-map-app.git
   cd sorita-map-app
   \`\`\`

2. **Bağımlılıkları yükleyin:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Expo uyumluluğunu düzeltin:**
   \`\`\`bash
   npx expo install --fix
   \`\`\`

4. **Uygulamayı başlatın:**
   \`\`\`bash
   npx expo start
   \`\`\`

## 📱 Çalıştırma

### Expo Go ile Test Etme
1. Telefona Expo Go uygulamasını yükleyin
2. Terminal'de görünen QR kodu okutun
3. Uygulama otomatik olarak yüklenecektir

### Android Emülatörü
\`\`\`bash
npx expo start --android
\`\`\`

### iOS Simülatörü
\`\`\`bash
npx expo start --ios
\`\`\`

### Web Tarayıcısı
\`\`\`bash
npx expo start --web
\`\`\`

## 🏗️ Proje Yapısı

\`\`\`
src/
├── components/          # Yeniden kullanılabilir bileşenler
│   └── CommonComponents.js
├── config/             # Konfigürasyon dosyaları
│   └── mapConfig.js    # Harita ayarları
├── navigation/         # Navigasyon yapısı
│   └── MainTabNavigator.js
├── screens/           # Ana ekranlar
│   ├── WelcomeScreen.js
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── HomeScreen.js
│   ├── MapScreen.js
│   └── ProfileScreen.js
└── theme/             # Tema ve stil ayarları
    └── theme.js
\`\`\`

## 🔧 Kullanılan Teknolojiler

### Çekirdek
- **React Native 0.72.10**: Mobil uygulama geliştirme
- **Expo SDK 49**: Geliştirme ve dağıtım platformu

### UI/UX
- **React Native Paper**: Material Design bileşenleri
- **@expo/vector-icons**: Icon kütüphanesi
- **React Navigation**: Navigasyon sistemi

### Harita ve Konum
- **react-native-maps**: Harita görünümü
- **expo-location**: Konum servisleri

### Veri Yönetimi
- **@react-native-async-storage/async-storage**: Yerel veri saklama

## ⚙️ Konfigürasyon

### Harita API Anahtarları
1. Google Maps API anahtarınızı edinin
2. \`app.json\` dosyasında gerekli ayarları yapın

### Tema Özelleştirme
\`src/theme/theme.js\` dosyasından renkleri ve stilleri özelleştirebilirsiniz.

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (\`git checkout -b feature/amazing-feature\`)
3. Değişikliklerinizi commit edin (\`git commit -m 'Add amazing feature'\`)
4. Branch'i push edin (\`git push origin feature/amazing-feature\`)
5. Pull Request oluşturun

## 📞 Destek

Herhangi bir sorunuz veya öneriniz varsa, lütfen issue açın veya bize ulaşın.

---

**Not**: Uygulama şu anda geliştirme aşamasındadır ve sürekli güncellenmektedir. Güncel bilgiler için repository'yi takip edin.
