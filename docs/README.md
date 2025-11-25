# SoRita İnceleme Destek Dokümanı

Bu sayfa; App Store ve Google Play değerlendirmelerinde talep edilen ek açıklamalar, canlı uygulama akışı ve yasal doküman bağlantıları için güncel tek kaynaktır.

---

## 🎯 Son İnceleme Notları ve Çözümler

| Politika Maddesi | Durum & Uygulamadaki Karşılığı |
| --- | --- |
| **1.2.0 Safety – User Generated Content** | Kullanıcılar listeler, mekan kartları, fotoğraflar, yorumlar ve biyografiler paylaşabilir. Her içerik `Profil > ... > Şikayet Et` menüsünden raporlanabilir, kullanıcılar `Engelle` ile tamamen filtrelenir. İtiraz edilen raporlar Firestore `reports` koleksiyonunda saklanır, eş zamanlı olarak `sendReportEmail` Cloud Function’ı ile moderasyon ekibine mail düşer. |
| **2.1.0 Performance – App Completeness** | Giriş ekranındaki “Kayıt Ol” ile yeni hesap açılabilir; e-posta doğrulaması opsiyoneldir. Ana Sayfa (akış), Harita (Google Maps), Profil sekmeleri gerçek verilerle çalışır. Testçiler `demo@sorita.app / Demo123*` hesabıyla doğrudan tüm özellikleri inceleyebilir. |
| **2.3.3 Performance – Accurate Metadata** | Mağaza açıklaması yalnızca mevcut özellikleri anlatır: konum bazlı keşif, arkadaş takip mekanizması, liste ve yorumlar. Henüz yayınlanmamış özellikler (canlı sürüş, pazaryeri vb.) metinden çıkarılmıştır. Uygulama yalnızca Türkçe içerik sunar; mağaza yerelleştirmesi buna göre güncellendi. |
| **5.1.2 Legal – Privacy / Data Use** | Gizlilik Politikası, konum, fotoğraf, cihaz kimliği ve kullanıcı tarafından sağlanan sosyal verilerin hangi amaçla işlendiğini anlatır. Profil ekranındaki **Hesabı Sil** butonu ile tüm veriler kalıcı olarak temizlenir; ayrıca `privacy@sorita.app` adresinden silme/erişim talebi alınır. Hiçbir veri üçüncü taraflara satılmaz, sadece Firebase (Auth, Firestore, Storage) içinde tutulur. |

---

## 🗺️ Uygulamanın Kısa Özeti

1. **Ana Sayfa:** Takip edilen kişilerin yer paylaşımları, fotoğrafları ve yorumları kart yapısında listelenir (şekil #1 App Store ekranı).
2. **Harita:** Google Maps üzerinde SoRita listelerindeki mekanlar, filtrelenebilir pinler ve alt bilgi kartı ile gösterilir (şekil #2).
3. **Listeler & Mekanlar:** Kullanıcı özel / herkese açık listeler biçiminde yer koleksiyonları oluşturur, puan verir, fotoğraf ekler.
4. **Profil:** Takip, takipten çıkma, biyografi düzenleme, bloklama, raporlama ve hesap silme işlemleri.
5. **Gizlilik kontrolleri:** Konum paylaşımı isteğe bağlıdır; kilit ekranı ve uygulama içi ayarlardan kapatılabilir.

---

## 🧪 İnceleme/Test Akışı (2.1.0)

1. Uygulamayı açın ➜ **Kayıt Ol**.
2. E-posta, kullanıcı adı ve en az 8 karakter (1 büyük, 1 rakam) içeren şifre girin.
3. Açılış sonrası izin istemleri gelir:
   - **Konum:** “Uygulamayı Kullanırken” seçmek yeterlidir.
   - **Bildirim:** Opsiyonel.
4. Ana sekmeler alt barda yer alır:
   - **Ana Sayfa:** Artı butonuyla yeni yer paylaşımı yapılır.
   - **Harita:** Sağ üst dişli ile filtreler, sol alt karttan yer detayları.
   - **Profil:** Üst sağ dişliden Hesap, Gizlilik, Engellenenler.
5. Test hesabı kullanmak isterseniz: `demo@sorita.app / Demo123*`.

---

## 🛡️ Kullanıcı Üretimli İçerik Süreçleri (1.2.0)

- **İzin verilen içerikler:** Mekan açıklamaları, listeler, fotoğraflar, yorum ve değerlendirmeler.
- **Otomatik korumalar:** 
  - Engellenen kullanıcıların tüm gönderileri `UserSafetyService.filterItemsByBlockStatus` ile feed’den kaldırılır.
  - Bildirilen kullanıcı için `blocks` koleksiyonuna kayıt açılır; tekrar etmesi halinde otomatik gizleme uygulanır.
- **Raporlama akışı:** Profil kartındaki `...` menüsü ➜ “Şikayet Et”. Form zorunlu alanları (konu, kategori, açıklama) Sunucuya kaydedilir ve moderasyon ekibine e‑posta gider.
- **Kullanıcı kontrolleri:** Tüm listeler ve paylaşımlar içerik sahibi tarafından düzenlenebilir veya silinebilir. Engelleme çift taraflıdır; mesaj, takip ve içerik görünürlüğü kesilir.
- **Politika ihlali kriterleri:** Nefret söylemi, aşırı şiddet, kişisel veri paylaşımı, spam ve yanıltıcı içerik; ihlal durumunda hesap askıya alınır.

---

## ✅ Metadata Doğruluğu (2.3.3)

- **Kategori:** Sosyal Ağ / Haritalar.
- **Desteklenen diller:** Türkçe (UI), İngilizce açıklama yalnızca mağaza sayfasında kısa özet olarak bulunur.
- **Uwygulama özellikleri:** Arkadaş takibi, yer listeleri, fotoğraf paylaşımı, konum gösterimi. 
- **Eksik olan özellikler:** Çevrim dışı kullanım, anlık mesajlaşma, mağaza içi satın alma *YOKTUR*; mağaza açıklamasından da çıkartılmıştır.
- **Minimum gereksinimler:** iOS 15+ / Android 8+, aktif internet ve GPS.

---

## 🔐 Gizlilik ve Veri Kullanımı (5.1.2)

- **Toplanan veriler:** E-posta, ad/soyad veya kullanıcı adı, profil fotoğrafı (isteğe bağlı), konum (anlık + arka plan isteğe bağlı), kullanıcı listeleri ve beğeni/yorum gibi sosyal hareketler, cihaz model/OS bilgisi (çökme analizi).
- **Kullanım amaçları:** Kimlik doğrulama (Firebase Auth), içerik saklama (Firestore), medya yükleme (Firebase Storage), anlık bildirimler (Expo + FCM/APNs), uygulama güvenliği (log kayıtları).
- **Paylaşım:** Veri üçüncü taraflarla *satılmaz*; yalnızca altyapı sağlayıcıları (Firebase, Expo push, Mapbox/Google Maps) ile sözleşmesel olarak paylaşılır.
- **Saklama & Silme:** Hesabınız silindiğinde ilişkili tüm Firestore kayıtları, medya dosyaları ve takip ilişkileri 30 dakika içinde temizlenir. `Settings > Hesabı Sil` adımıyla veya `privacy@sorita.app` adresine e-posta göndererek tetiklenir.
- **Haklar:** Erişim, düzeltme, taşınabilirlik, işlenmeye itiraz ve veri silme; talepler 30 gün içinde yanıtlanır.

---

## 🔗 Resmi Dokümanlar

- **Konum İzni Açıklaması:** https://cyn0kuzu.github.io/SoRita-main/docs/location-permission-explanation.html
- **Gizlilik Politikası:** https://cyn0kuzu.github.io/SoRita-main/docs/privacy-policy.html
- **Uygulama içi Gizlilik & KVKK metni:** `Profil > Ayarlar > Gizlilik Politikası`.
- **Destek / İletişim:** support@sorita.app & privacy@sorita.app

---

Bu doküman düzenli olarak güncellenir. App Store/Google Play inceleme ekiplerinin talep ettiği her ek bilgi yeni bir bölüm olarak buraya eklenir.
