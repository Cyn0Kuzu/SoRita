# Kritik Hata Raporları İçin GitHub/Jira Issue Şablonları

Bu dosya, SoRita projesinde tespit edilen en kritik (P0) hatalar için doğrudan görev takip sistemlerine (GitHub Issues, Jira vb.) kopyalanabilecek hazır şablonlar içermektedir.

---

## Şablon 1: Kritik Güvenlik Açığı - Üretim İmzalama Anahtarı Parolası İfşası

### **Başlık:** `[KRİTİK GÜVENLİK] Üretim (Release) İmzalama Anahtarı Parolası Kaynak Kodunda İfşa Edildi`

### **Açıklama:**

**Hata Tanımı:**
Android uygulamasını imzalamak için kullanılan üretim `.keystore` dosyasının parolası, `android/app/build.gradle` dosyasına hardcoded olarak yazılmıştır. `.keystore` dosyası da depoda bulunmaktadır. Bu, uygulamanın bütünlüğünü ve kullanıcı güvenliğini tehdit eden çok kritik bir güvenlik açığıdır.

**Etki:**
Bu parola ve anahtar dosyasına erişen herhangi bir kişi, uygulamanın sahte ve potansiyel olarak zararlı bir versiyonunu oluşturup bizim adımıza imzalayabilir. Google Play Store bu imzayı geçerli kabul edeceği için, bu durum kullanıcılarımıza zararlı güncellemeler dağıtılmasına yol açabilir.

**Etkilenen Dosya:**
- `android/app/build.gradle`
- `sorita-release.keystore`

**Yapılması Gerekenler (Action Items):**
1.  [ ] `android/app/build.gradle` dosyasından `keyPassword` ve `storeFile` bilgileri derhal kaldırılmalı.
2.  [ ] `sorita-release.keystore` dosyası ve parolası, Git geçmişinden tamamen temizlenmeli.
3.  [ ] Google Play Console üzerinden yeni bir uygulama imzalama anahtarı oluşturulmalı ve "Uygulama İmzalama Anahtarı Yükseltme" işlemi talep edilmeli.
4.  [ ] Yeni parola, `gradle.properties` dosyasına yazılmalı ve bu dosya `.gitignore`'a eklenmeli.
5.  [ ] Parola, EAS Build gibi CI/CD sistemlerine güvenli bir ortam değişkeni (secret/environment variable) olarak tanıtılmalı.

**Kabul Kriterleri (Acceptance Criteria):**
- Hassas bilgiler artık kaynak kodunda veya Git geçmişinde bulunmamalıdır.
- Yeni anahtarla imzalanan bir AAB dosyası Google Play Console'a başarıyla yüklenebilmelidir.
- Üretim derlemesi (production build) CI/CD üzerinden başarıyla tamamlanabilmelidir.

**Öncelik:** P0 - Kritik (ACİL)

---

## Şablon 2: Kritik Güvenlik Açığı - Google Maps API Anahtarı İfşası

### **Başlık:** `[KRİTİK GÜVENLİK] Google Maps API Anahtarı Kaynak Kodunda ve Dokümanlarda İfşa Edildi`

### **Açıklama:**

**Hata Tanımı:**
Google Maps API anahtarı, `app.json`, `AndroidManifest.xml` ve hatta `.md` dokümantasyon dosyaları dahil olmak üzere proje genelinde birçok dosyada hardcoded olarak bulunmaktadır.

**Etki:**
Bu API anahtarı, yetkisiz kişiler tarafından kopyalanıp kendi projelerinde kullanılabilir. Bu durum, projemize ait Google Cloud Platform hesabında beklenmedik maliyetlere, API kotalarının hızla tükenmesine ve servis kesintilerine yol açabilir.

**Etkilenen Dosyalar:**
- `app.json`
- `android/app/src/main/AndroidManifest.xml`
- `.env.example`
- `PROJECT_REVIEW.md`
- `ROADMAP.md`

**Yapılması Gerekenler (Action Items):**
1.  [ ] İfşa olan mevcut API anahtarı, Google Cloud Console üzerinden **derhal iptal edilmeli** veya kısıtlanmalıdır.
2.  [ ] Yeni bir API anahtarı oluşturulmalıdır.
3.  [ ] Yeni anahtar, sadece uygulamanın paket adı (Android: `com.sorita.app`) ve bundle identifier (iOS) ile kullanılabilecek şekilde uygulama bazında sınırlandırılmalıdır.
4.  [ ] Anahtar, `.env` dosyası aracılığıyla yüklenmeli ve `.env` dosyası `.gitignore`'a eklenerek takip dışı bırakılmalıdır.

**Kabul Kriterleri (Acceptance Criteria):**
- API anahtarı artık kaynak kodunda veya Git geçmişinde bulunmamalıdır.
- Uygulamanın harita özellikleri yeni ve kısıtlanmış API anahtarıyla sorunsuz çalışmalıdır.
- API anahtarının kısıtlamaları Google Cloud Console üzerinden doğrulanmalıdır.

**Öncelik:** P0 - Kritik (ACİL)

---

## Şablon 3: Kritik Güvenlik Açığı - Firestore'da Yetkisiz Bildirim Gönderme

### **Başlık:** `[KRİTİK GÜVENLİK] Firestore Kuralları, Herhangi Bir Kullanıcının Başkası Adına Bildirim Göndermesine İzin Veriyor`

### **Açıklama:**

**Hata Tanımı:**
`firestore.rules` dosyasındaki `/notifications/{notificationId}` koleksiyonu için tanımlanan `create` (oluşturma) kuralı, bildirimi oluşturan kullanıcının kimliğini (`request.auth.uid`) doğrulamamaktadır.

**Etki:**
Bu zafiyet, sisteme giriş yapmış herhangi bir kullanıcının, istediği bir kullanıcı adına, istediği başka bir kullanıcıya sahte "beğeni", "yorum" veya "takip" bildirimi göndermesine olanak tanır. Bu durum, spam, taciz ve sistemin manipülasyonu gibi ciddi kötüye kullanımlara yol açabilir.

**Etkilenen Dosya:**
- `firestore.rules`

**Yapılması Gerekenler (Action Items):**
1.  [ ] `/notifications/{notificationId}` koleksiyonu için `create` kuralı, oluşturulan dokümandaki `fromUserId` alanının işlemi yapan kullanıcının kimliğiyle (`request.auth.uid`) aynı olduğunu zorunlu kılacak şekilde güncellenmelidir.
2.  [ ] Benzer şekilde, `/pendingNotifications` koleksiyonu için de (kurallar eklendiğinde) aynı doğrulama yapılmalıdır.

**Kabul Kriterleri (Acceptance Criteria):**
- Bir kullanıcı, Firestore kurallarını ihlal ederek başka bir kullanıcı adına bildirim oluşturmaya çalıştığında "permission-denied" hatası almalıdır.
- Bu doğrulama, Firestore emülatörü kullanılarak yazılmış bir test senaryosu ile kanıtlanmalıdır.

**Öncelik:** P0 - Kritik (ACİL)
