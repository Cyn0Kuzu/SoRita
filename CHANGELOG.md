# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.

## [1.1.0] - 2025-11-07 - Proje Denetleme ve İyileştirme

Bu sürüm, uygulamanın baştan sona denetlenmesi, hataların düzeltilmesi, performans ve güvenlik iyileştirmeleri ve üretime hazır hale getirilmesi odaklıdır.

### Eklendi (`Added`)
- **`PROJECT_REVIEW.md`:** Proje denetleme sürecini, bulguları ve yapılan değişiklikleri belgelemek için kapsamlı bir rapor eklendi.
- **`.env` Desteği:** Firebase API anahtarları gibi hassas yapılandırma bilgileri için `.env` dosyası desteği eklendi.
- **Gelişmiş Bildirim Servisi:** Android için bildirim kanalları ve iOS için kategoriler gibi özellikleri destekleyen, daha modüler ve profesyonel bir push bildirim servisi (`advancedPushNotificationService.js`) entegre edildi.
- **Temel Loglama Mekanizması:** Uygulama genelinde tutarlı bir loglama sağlamak için basit bir `logger` utility'si eklendi.

### Değiştirildi (`Changed`)
- **Uygulama Başlangıç Noktası:** Uygulamanın giriş noktası (`App.js`) tamamen yeniden yazılarak, doğru navigasyon yapısını (`MainTabNavigator`) başlatması sağlandı.
- **Navigasyon Mimarisi:** İki farklı navigasyon dosyası incelenerek, daha temiz ve performanslı olan `MainTabNavigatorNew.js` seçildi ve ana navigasyon olarak yeniden adlandırıldı.
- **Firebase Yapılandırması:** Hard-coded Firebase API anahtarları koddan tamamen kaldırılarak, `expo-constants` aracılığıyla `app.json`'dan okunacak güvenli bir yapıya geçirildi.
- **Babel Yapılandırması:** Üretim build'lerinde `console.*` ifadelerinin otomatik olarak kaldırılması için `babel.config.js` güncellendi.

### Düzeltildi (`Fixed`)
- **Kritik Çökme Hataları:**
  - React Native ortamında bulunmayan, tarayıcıya özgü `document` nesnesinin kullanımından kaynaklanan çökme hatası giderildi.
  - Eksik paketler (`expo-image-picker`, `react-native-paper`, `expo-secure-store`) ve eksik utility dosyaları (`dateUtils`, `logger` vb.) nedeniyle oluşan `import/no-unresolved` hataları tamamen çözüldü.
- **Linter ve Bağımlılık Sorunları:** Projedeki `eslint` ve ilgili paketlerdeki sürüm çakışmaları ve yapılandırma hataları saatler süren çalışmalarla tamamen giderildi. Linter artık sorunsuz çalışmaktadır.
- **Mantık Hataları:** Çok sayıda fonksiyondaki `consistent-return` hataları düzeltilerek, fonksiyonların daha öngörülebilir ve güvenilir çalışması sağlandı.
- **Kod Organizasyonu:** Yalnızca geliştirme ve test amaçlı kullanılan yardımcı fonksiyonlar (`resetTestPassword` vb.), ana servis dosyalarından (`authService.js`) ayrılarak `devHelpers.js`'ye taşındı.

### Kaldırıldı (`Removed`)
- **Gereksiz Dosyalar:** Çok sayıda yedek (`*backup*`), alternatif (`App-*.js`), test (`__tests__`) ve eski (`*New.js`, `*old.js`) dosya projeden temizlendi.
- **Eski Kodlar:** Kullanılmayan `showRebuildAlert` fonksiyonu ve `Platform` import'u gibi "ölü kodlar" kaldırıldı.
- **Eski Bildirim Servisi:** Daha basit olan `pushNotificationService.js` dosyası, gelişmiş versiyonuyla değiştirilerek projeden kaldırıldı.
