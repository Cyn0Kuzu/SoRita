# SoRita Development Roadmap

## 🎯 ŞU ANKİ DURUM (13 Ağustos 2025)

### ✅ TAMAMLANAN:
- [x] Google Maps API Key alındı: `AIzaSyBxgDpK3-dWsuXewlIWB68ubkuH4Q4eEB8`
- [x] Expo Maps entegrasyonu tamamlandı
- [x] Google Places API entegrasyonu hazır
- [x] Development build kuyruğa alındı (57dk kaldı)
- [x] API test ekranı oluşturuldu

### ⏳ DEVAM EDEN:
- [ ] EAS Build tamamlanması (Build ID: fd031434-83b0-4dc2-916f-27ce50877ff8)
- [ ] APK indirme ve kurulum

## 🔄 DEVELOPMENT WORKFLOW

### 1️⃣ İLK KURULUM (Sadece 1 kez):
```bash
# Build tamamlandıktan sonra:
1. https://expo.dev/accounts/cayan/projects/sorita/builds/fd031434-83b0-4dc2-916f-27ce50877ff8
2. APK dosyasını indirin
3. Android cihazda "Bilinmeyen kaynaklardan kuruluma izin ver"
4. APK'yı kurun
```

### 2️⃣ GÜNLÜK GELİŞTİRME:
```bash
# Her kod değişikliği için:
cd "C:\Users\lenovo\Desktop\SoRita"
npm start
# APK otomatik güncellenir - YENİDEN KURULUM YOK!
```

## 📱 APK KURULUMU SONRASI

### Development Build Özellikleri:
- ✅ Native Google Maps (Android)  
- ✅ Native Apple Maps (iOS)
- ✅ Google Places API
- ✅ Gerçek GPS konum
- ✅ Tıklanabilir POI'ler
- ✅ Hot reload (kod değişiklikleri canlı yansır)
- ✅ Console debugging
- ✅ Tüm native özellikler

### Test Edilecek Özellikler:
1. **Ana Sayfa → Harita Butonu**
2. **Google Maps görünümü**
3. **GPS konum alma**
4. **Yakındaki mekanları getirme**
5. **Mekan araması**
6. **Marker tıklama ve detay gösterme**
7. **POI etkileşimi**

## 🔑 FİNGERPRINT İŞLEMİ

### APK Kurulumu Sonrası:
```bash
# Fingerprint alma:
eas credentials
# veya
keytool -list -v -keystore ~/.android/debug.keystore
```

### Google Cloud Console Güncelleme:
1. Console.cloud.google.com
2. APIs & Services → Credentials
3. API Key → Restrict Key
4. Yeni SHA1 fingerprint ekle
5. Save

## 🚀 PRODUCTION HAZIRLIK

### Release Build:
```bash
# Production APK için:
eas build --profile production --platform android
```

### Google Play Store:
1. App signing certificate alın
2. Store listing hazırlayın
3. APK/AAB yükleyin

## 🔧 TROUBLESHOOTING

### Yaygın Sorunlar:
- **Maps görünmüyor:** Fingerprint kontrolü
- **API limit:** Usage quotas kontrol
- **Location permission:** App settings
- **Hot reload çalışmıyor:** Metro cache temizle

### Debug Komutları:
```bash
# Cache temizle:
npx expo start --clear

# Build status:
eas build:list

# Credentials kontrol:
eas credentials
```

## 📊 SONRAKI ÖZELLIKLER

### v1.1 Planları:
- [ ] Offline map support
- [ ] Route planning
- [ ] Favorites system
- [ ] User reviews
- [ ] Photo uploads
- [ ] Social features

### v1.2 Planları:
- [ ] AR navigation
- [ ] Voice commands
- [ ] Multi-language
- [ ] Dark mode
- [ ] Analytics
