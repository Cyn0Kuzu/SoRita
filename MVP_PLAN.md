# SoRita MVP Development Plan
*Sosyal Harita Uygulaması - Minimum Viable Product*

## 🎯 KONSEPT
Kullanıcılar gittiği mekanlardan arkadaşlarına not ve fotoğraf paylaşabilir.
**Problem:** "Nereye gitsem?" sorusuna sosyal çözüm
**Çözüm:** Arkadaşların önerileriyle mekan keşfi

## 📱 MVP ÖZELLİKLER (4 Hafta)

### Hafta 1: Foundation
- [x] React Navigation kurulumu
- [x] Google Maps entegrasyonu 
- [ ] Firebase Authentication
- [ ] Temel UI/UX tasarım

### Hafta 2: User System
- [ ] Kayıt/Giriş ekranları
- [ ] Profil oluşturma
- [ ] Kullanıcı veri modeli
- [ ] Temel güvenlik

### Hafta 3: Core Features
- [ ] Mekan arama (Google Places)
- [ ] Check-in fonksiyonu
- [ ] Not yazma sistemi
- [ ] Tek fotoğraf ekleme
- [ ] Paylaşım kaydetme

### Hafta 4: Social Features
- [ ] Arkadaş ekleme (basit)
- [ ] Paylaşımları görme
- [ ] Harita üzerinde marker'lar
- [ ] Basit bildirimler

## 🏗️ EKRAN YAPISI

```
SoRita App
├── 🔐 Auth Stack
│   ├── WelcomeScreen ✅
│   ├── LoginScreen ✅
│   └── RegisterScreen ✅
│
├── 🏠 Main Tabs
│   ├── 🗺️ MapScreen (Ana) → GoogleMapsScreen
│   ├── 📝 PostsScreen (Paylaşımlarım)
│   ├── 🔍 ExploreScreen (Keşfet)
│   └── 👤 ProfileScreen ✅
│
└── 🚀 Modals
    ├── VenueDetailScreen
    ├── CreatePostScreen
    └── AddPhotoScreen
```

## 🎨 DESIGN SYSTEM

### Renk Paleti:
```javascript
const colors = {
  primary: '#FF6B6B',     // Check-in butonu
  secondary: '#4ECDC4',   // Harita teması
  accent: '#45B7D1',      // Sosyal öğeler
  success: '#2ECC71',     // Başarı mesajları
  warning: '#F39C12',     // Uyarılar
  background: '#F8F9FA',  // Ana arka plan
  surface: '#FFFFFF',     // Kartlar
  text: '#2C3E50',        // Ana metin
  textLight: '#7F8C8D'    // İkincil metin
}
```

### Typography:
```javascript
const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' }
}
```

## 🔥 BACKEND STACK

### Firebase Services:
```
✅ Authentication (Google, Email)
✅ Firestore Database
✅ Storage (photos)
✅ Cloud Functions (future)
✅ FCM (notifications)
```

### Data Models:
```javascript
// User
{
  id: string,
  email: string,
  displayName: string,
  photoURL: string,
  createdAt: timestamp,
  friends: array
}

// Post (Check-in)
{
  id: string,
  userId: string,
  venueId: string,
  venueName: string,
  location: geopoint,
  note: string,
  photos: array,
  createdAt: timestamp,
  likes: number
}

// Venue (Cache)
{
  id: string, // Google Place ID
  name: string,
  address: string,
  location: geopoint,
  category: string,
  rating: number
}
```

## 🚀 KULLANICI AKIŞI

### İlk Kullanım:
```
1. Uygulamayı aç
2. Hoş geldin ekranı
3. Google ile kayıt ol
4. Profil fotoğrafı ekle
5. Konum izni ver
6. İlk check-in yap
7. Arkadaş davet et (opsiyonel)
```

### Günlük Kullanım:
```
1. Uygulamayı aç → Harita göster
2. Mevcut konuma yakın paylaşımları gör
3. Yeni mekana git → Check-in yap
4. Not yaz + fotoğraf ekle
5. Arkadaşların son paylaşımlarını gör
6. Yeni mekan keşfet
```

## 📊 SUCCESS METRICS

### MVP Success:
- [ ] 10 kullanıcı kayıt
- [ ] 50+ check-in
- [ ] 20+ mekan ekleme
- [ ] 5+ günlük aktif kullanıcı

### Growth Metrics:
- [ ] User retention 7 günde %30
- [ ] Günlük ortalama check-in 2+
- [ ] Arkadaş başına ortalama 3+ bağlantı

## 🔧 TECHNICAL TODOS

### Geliştirme Ortamı:
- [x] Expo SDK 49 kurulumu
- [x] EAS Build yapılandırması
- [x] Google Maps API entegrasyonu
- [ ] Firebase proje kurulumu
- [ ] Testlint, ESLint yapılandırması

### Security:
- [ ] API key güvenliği
- [ ] Firebase rules
- [ ] Input validation
- [ ] Image upload limits

### Performance:
- [ ] Map clustering
- [ ] Lazy loading
- [ ] Image compression
- [ ] Offline support (future)

## 📅 RELEASE PLAN

### MVP Release (v1.0):
```
✅ Temel check-in
✅ Basit sosyal özellikler
✅ Android development build
🔲 iOS development build
🔲 Beta test (10 kullanıcı)
```

### Post-MVP (v1.1):
```
🔮 Hikayeler özelliği
🔮 Mekan filtreleme
🔮 Push notifications
🔮 Mekan kategorileri
```

### Future (v2.0):
```
🔮 AI-powered öneriler
🔮 Etkinlik organizasyonu
🔮 Premium özellikler
🔮 Business partnerships
```

## 💰 MONETIZATION (Future)

1. **Freemium Model:**
   - Unlimited check-ins (free)
   - Premium: Unlimited photos, priority support

2. **Business Integration:**
   - Mekan sahibi dashboard
   - Promoted posts
   - Analytics

3. **Data Insights:**
   - Trend raporları
   - Location intelligence
