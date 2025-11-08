# SoRita Projesi Kapsamlı Teknik ve Deneyimsel Denetim Raporu

**Tarih:** 2025-11-08
**Versiyon:** 1.0
**Hazırlayan:** Jules (Yapay Zeka Yazılım Mühendisi)

---

##  executive summary

Bu rapor, SoRita mobil uygulamasının kod tabanının, mimarisinin, güvenliğinin ve kullanıcı deneyiminin uçtan uca analizini içermektedir. Analiz, tamamen statik kod incelemesi ve yerel geliştirme ortamında yapılan testler üzerinden gerçekleştirilmiştir. Canlı sistemlere (production/staging veritabanları, CI/CD, izleme araçları) erişim olmadan yapılmıştır.

**En Kritik Bulgular:**
Uygulama, çalışmasını ve kullanıcı güvenliğini tehdit eden **çok kritik (P0) güvenlik açıkları** barındırmaktadır. Bunların başında, üretim (release) imzalama anahtarı parolasının ve Google Maps API anahtarının kaynak kodunda ifşa edilmesi gelmektedir. Ayrıca, veritabanı güvenlik kurallarındaki zafiyetler, herhangi bir kullanıcının başka bir kullanıcı adına bildirim göndermesine olanak tanımaktadır. Bu güvenlik açıkları, uygulamanın kötüye kullanılmasına, kullanıcı verilerinin tehlikeye atılmasına ve finansal kayıplara yol açabilir ve **derhal** giderilmelidir.

**Mimari Değerlendirmesi:**
Projenin temel klasör yapısı ve servis katmanı gibi konularda iyi bir başlangıç yapılmış olsa da, veri akışı ve state yönetimi mimarisi **ölçeklenemez** durumdadır. Özellikle ana ekrandaki veri çekme mantığı (`HomeScreen.js`) ve her bir gönderi kartının (`PlaceCard.js`) kendi veri dinleyicilerini oluşturması, "N+1 sorgu" problemine ve aşırı veritabanı maliyetine yol açmaktadır. Bu mimari yaklaşım, kullanıcı sayısı arttıkça uygulamanın performansını hızla düşürecek ve kullanılamaz hale getirecektir.

**Yol Haritası Özeti:**
Öncelikli olarak tüm P0 güvenlik açıkları kapatılmalıdır. Ardından, P1 seviyesindeki mimari sorunların (özellikle ana sayfa veri akışı ve veritabanı sorguları) yeniden tasarlanması gerekmektedir. Son olarak, kod kalitesi, test kapsamı ve CI/CD otomasyonu gibi konular ele alınarak projenin uzun vadeli sağlığı güvence altına alınmalıdır.

---

## 🎯 P0: Kritik Güvenlik Açıkları (Acil Eylem Gerekli)

### 1. Üretim (Release) İmzalama Anahtarı Parolasının Kaynak Kodunda İfşa Edilmesi

*   **Sorun:** Android uygulamasını imzalamak için kullanılan üretim anahtar deposunun (`.keystore`) parolası, `android/app/build.gradle` dosyasına hardcoded olarak yazılmıştır. `sorita-release.keystore` dosyası da kod deposunda mevcuttur.
*   **Kök Neden:** Güvenliğe yönelik en iyi pratiklerin (best practices) ihlal edilmesi ve hassas bilgilerin koddan ayrıştırılmaması.
*   **Etki (Çok Kritik):** Kötü niyetli bir aktör, bu parola ve anahtar dosyasını kullanarak uygulamanın sahte ve zararlı bir versiyonunu oluşturup, geliştirici adına imzalayabilir. Google Play Store bu imzayı geçerli kabul edeceği için, mevcut kullanıcılara bu zararlı güncelleme dağıtılabilir. Bu durum, kullanıcı verilerinin çalınmasından cihazların ele geçirilmesine kadar varan çok ciddi sonuçlara yol açabilir.
*   **Çözüm:**
    1.  **Acil Adım:** `android/app/build.gradle` dosyasındaki `keyPassword` ve `storeFile` bilgileri derhal kaldırılmalıdır.
    2.  **Kalıcı Çözüm:**
        *   `sorita-release.keystore` dosyası ve parolası Git geçmişinden tamamen temizlenmelidir.
        *   Google Play Console üzerinden yeni bir uygulama imzalama anahtarı oluşturulmalı ve "Uygulama İmzalama Anahtarı Yükseltme" işlemi talep edilmelidir.
        *   Yeni parola, `gradle.properties` dosyasına yazılmalı, bu dosya `.gitignore`'a eklenmeli ve parola, EAS Build gibi CI/CD sistemlerine güvenli ortam değişkeni (environment variable) olarak tanıtılmalıdır.
*   **Test Planı:** Yeni anahtarla imzalanan bir AAB (Android App Bundle) dosyasının Google Play Console'a başarıyla yüklendiği ve dahili test kanallarında çalıştığı doğrulanmalıdır.

**Örnek Kod (Sorunlu):**
```gradle
// File: android/app/build.gradle
...
        release {
            ...
            storeFile file('../../sorita-release.keystore')
            keyAlias 'sorita'
            keyPassword 'sorita123' // <-- KRİTİK ZAFİYET
        }
...
```

### 2. Google Maps API Anahtarının Kaynak Kodunda ve Dokümanlarda İfşa Edilmesi

*   **Sorun:** Google Maps API anahtarı, `app.json`, `AndroidManifest.xml`, `.env.example` ve çeşitli Markdown dokümanları dahil olmak üzere birçok dosyada hardcoded olarak bulunmaktadır.
*   **Kök Neden:** Hassas bilgilerin yapılandırma dosyalarına ve hatta dokümantasyona düz metin olarak eklenmesi.
*   **Etki (Kritik):** Bu API anahtarı, herhangi bir kişi tarafından kopyalanıp kendi web sitelerinde veya uygulamalarında kullanılabilir. Bu durum, yetkisiz kullanımdan kaynaklanan yüksek faturalara (finansal kayıp), Google Cloud Platform projesinde kotaların hızla tükenmesine ve servis kesintilerine yol açar.
*   **Çözüm:**
    1.  **Acil Adım:** İfşa olan API anahtarı, Google Cloud Console üzerinden **derhal iptal edilmeli** veya kısıtlanmalıdır.
    2.  **Kalıcı Çözüm:** Yeni bir API anahtarı oluşturulmalıdır. Bu anahtar, sadece uygulamanın paket adı (Android) ve bundle identifier (iOS) ile kullanılabilecek şekilde sınırlandırılmalıdır. Anahtar, `.env` dosyası üzerinden okunmalı ve bu dosya `.gitignore` ile takip dışı bırakılmalıdır.
*   **Test Planı:** Uygulamanın harita özelliklerinin yeni ve kısıtlanmış API anahtarıyla düzgün çalıştığı, ancak başka bir alan adından veya uygulamadan yapılan isteklerin başarısız olduğu doğrulanmalıdır.

**Etkilenen Dosyalar:**
*   `app.json`
*   `android/app/src/main/AndroidManifest.xml`
*   `.env.example`
*   `PROJECT_REVIEW.md`
*   `ROADMAP.md`

### 3. Firestore Güvenlik Kurallarında Yetkisiz Bildirim Gönderme Zafiyeti

*   **Sorun:** `firestore.rules` dosyasındaki `/notifications/{notificationId}` koleksiyonu için tanımlanan `create` (oluşturma) kuralı, bildirimi oluşturan kullanıcının kimliğini doğrulamamaktadır.
*   **Kök Neden:** Güvenlik kuralı, sadece oluşturulan dokümanın *şeklini* kontrol ediyor, ancak `request.auth.uid`'nin dokümandaki `fromUserId` alanı ile eşleşip eşleşmediğini kontrol etmiyor.
*   **Etki (Kritik):** Herhangi bir kimliği doğrulanmış kullanıcı, başka bir kullanıcı adına, istediği herhangi bir kişiye sahte "beğeni", "yorum" veya "takip" bildirimi gönderebilir. Bu, sistemin manipüle edilmesine, kullanıcılar arası tacize ve spam'e olanak tanıyan kritik bir zafiyettir.
*   **Çözüm:** `create` kuralı, bildirimi gönderen kullanıcının kimliğinin `request.auth.uid` ile aynı olduğunu zorunlu kılacak şekilde güncellenmelidir.
*   **Test Planı:** Firestore emülatöründe veya test ortamında, bir kullanıcı olarak oturum açıp başka bir `userId` kullanarak bildirim oluşturmaya çalışan bir test senaryosu yazılmalı ve bu işlemin "permission-denied" hatasıyla başarısız olduğu doğrulanmalıdır.

**Örnek Kod (Düzeltme Önerisi):**
```diff
// File: firestore.rules
...
    match /notifications/{notificationId} {
      allow create: if isAuthenticated() &&
+                  request.resource.data.fromUserId == request.auth.uid && // <-- EKLENMELİ
                   (
                     // ... (mevcut schema doğrulamaları)
                   );
...
```

### 4. `pendingNotifications` Koleksiyonu İçin Güvenlik Kuralı Olmaması

*   **Sorun:** Anlık bildirimleri tetikleyen `pendingNotifications` koleksiyonu için `firestore.rules` dosyasında hiçbir güvenlik kuralı tanımlanmamıştır.
*   **Kök Neden:** Güvenlik kurallarının eksik bırakılması.
*   **Etki (Kritik):** Firestore'un varsayılan davranışı "tüm erişimi reddet" olduğu için bu durum, anlık bildirim özelliğinin **tamamen bozuk** olduğu anlamına gelir. Hiçbir istemci bu koleksiyona yazma işlemi yapamaz. Eğer veritabanı, geliştirme kolaylığı için güvensiz bir moda ayarlandıysa (tüm okuma/yazmalara izin ver), bu durum `functions/index.js`'deki yetkilendirme zafiyetini tetikler ve herhangi bir kullanıcının istediği kişiye bildirim göndermesine olanak tanır.
*   **Çözüm:** `pendingNotifications` koleksiyonu için, sadece kimliği doğrulanmış kullanıcıların kendi adlarına bildirim oluşturabileceğini garanti eden katı güvenlik kuralları eklenmelidir.
*   **Test Planı:** Yeni kural eklendikten sonra, bir kullanıcının anlık bildirim tetikleyebildiği (örneğin, bir gönderiyi beğenerek) ve bildirim oluşturma işleminin Firestore'a yansıdığı doğrulanmalıdır.

---

##  P1: Yüksek Öncelikli Mimari ve Performans Sorunları

### 1. "God Component" ve Verimsiz Veri Dinleyicileri (`PlaceCard.js`)

*   **Sorun:** `PlaceCard.js` bileşeni, 1000 satırı aşan boyutuyla arayüz, durum yönetimi (state), veri çekme ve iş mantığını tek bir dosyada birleştiren bir "God Component" (Tanrı Bileşeni) anti-desenidir. Daha da kötüsü, ana ekranda listelenen **her bir kart**, beğeni ve yorumları dinlemek için Firestore'a kendi gerçek zamanlı `onSnapshot` bağlantısını açar.
*   **Kök Neden:** Sorumlulukların ayrıştırılmaması (Separation of Concerns) ve merkezi bir state yönetimi mimarisinin olmaması.
*   **Etki (Çok Yüksek):**
    *   **Performans:** Ekranda 20 kart varsa, Firestore'a anında 40 adet (20 beğeni + 20 yorum) kalıcı bağlantı açılır. Bu, uygulamanın başlangıç süresini yavaşlatır ve Firestore'un anlık bağlantı kotalarını hızla tüketir.
    *   **Maliyet:** Gereksiz yere açılan çok sayıda dinleyici, Firestore faturalarının fahiş düzeylere çıkmasına neden olur.
    *   **Bakım ve Test Edilebilirlik:** Bileşenin aşırı karmaşıklığı, hata ayıklamayı, yeni özellik eklemeyi ve test yazmayı neredeyse imkansız hale getirir.
*   **Çözüm:**
    1.  **Yeniden Yapılandırma (Refactoring):** `PlaceCard.js` bileşeni, sadece arayüzü render'lamaktan sorumlu "aptal" (dumb) bir bileşen haline getirilmelidir.
    2.  **Veri Sorumluluğunu Üst Bileşene Taşıma:** Beğeni ve yorum verileri, `HomeScreen.js` gibi üst bir bileşen tarafından tek bir sorgu ile toplu olarak çekilmeli ve `PlaceCard`'lara `prop` olarak geçirilmelidir.
    3.  **Merkezi State Yönetimi:** Beğeni gibi global state'ler için React Context veya Redux gibi bir state management kütüphanesi kullanılmalıdır.
*   **Test Planı:** Yeniden yapılandırma sonrası, `PlaceCard` bileşeninin birim testleri (unit tests) yazılmalı ve ana sayfanın performansı (render süresi, açılan bağlantı sayısı) profil araçlarıyla ölçülmelidir.

### 2. Ölçeklenemez Ana Sayfa Veri Akışı (`HomeScreen.js`)

*   **Sorun:** `loadPosts` fonksiyonu, özellikle "Takip Ettiklerim" sekmesinde, sosyal bir akış oluşturmak için istemci tarafında (client-side) aşırı sayıda veritabanı sorgusu yapmaktadır ("N+1 Sorgu" problemi).
*   **Kök Neden:** Sosyal akışlar için uygun olmayan, normalize edilmiş bir veritabanı mimarisi ve bu mimariyi istemci tarafında birleştirmeye (join) çalışma.
*   **Etki (Yüksek):** Kullanıcı ve veri sayısı arttıkça, ana sayfanın yüklenme süresi katlanarak artacak ve uygulama kullanılamaz hale gelecektir. Bu, hem kötü bir kullanıcı deneyimi yaratır hem de Firestore okuma maliyetlerini aşırı artırır.
*   **Çözüm:**
    *   **Veritabanı Mimarisi Değişikliği (Denormalizasyon):** Sosyal akışlar için standart bir yaklaşım olan "fan-out-on-write" mimarisi benimsenmelidir. Bir kullanıcı yeni bir gönderi paylaştığında, bir Cloud Function tetiklenmeli ve bu gönderiyi, o kullanıcıyı takip eden tüm kişilerin kişisel "akış" (feed) koleksiyonlarına kopyalamalıdır. Bu sayede, ana sayfa akışı, sadece tek bir koleksiyondan yapılan basit bir sorgu ile yüklenebilir.
*   **Test Planı:** Yeni mimari ile ana sayfa yüklenme süresinin, farklı sayıda takipçi ve gönderi senaryoları için ölçülmesi ve eski yöntemle karşılaştırılması gerekir.

### 3. Verimsiz Coğrafi Sorgu Mimarisi (`placesDataService.js`)

*   **Sorun:** `getPlacesNearLocation` fonksiyonu, yakındaki mekanları bulmak için geniş bir enlem aralığındaki tüm dokümanları okuyup, mesafeyi istemci tarafında hesaplayarak filtrelemektedir.
*   **Kök Neden:** Firestore'un dairesel coğrafi sorguları doğal olarak desteklememesi ve bu kısıtlamayı aşmak için verimsiz bir yöntem kullanılması.
*   **Etki (Yüksek):** Mekan sayısı arttıkça bu sorgu yavaşlayacak, maliyetleri artıracak ve uygulamanın harita özelliklerini kullanılamaz hale getirecektir.
*   **Çözüm:** Coğrafi sorgular için endüstri standardı olan **Geohashing** tekniği kullanılmalıdır. Mekanların konumu için bir "geohash" değeri (bir string) hesaplanıp dokümana kaydedilmelidir. Bu sayede, belirli bir coğrafi alan içindeki mekanlar, veritabanı seviyesinde çok daha verimli bir şekilde sorgulanabilir. `geofire-common` gibi kütüphaneler bu işlemi basitleştirir.
*   **Test Planı:** Geohash ile yapılan sorguların, belirli bir yarıçap içindeki mekanları doğru ve hızlı bir şekilde getirdiği doğrulanmalıdır. Performans, eski yöntemle karşılaştırılmalıdır.

---

## P2: Orta Öncelikli Hatalar ve Kod Kalitesi Sorunları

*   **Riskli Test Kodu (`cleanupTestPosts`):** `HomeScreen.js` içinde, uygulama her başlatıldığında çalışan ve isminde "Test" geçen gönderileri silen bir fonksiyon bulunmaktadır. Bu, üretim verilerini yanlışlıkla silme riski taşıdığı için derhal kaldırılmalıdır.
*   **Yarış Durumu (Race Condition) Riski:** `placesDataService.js`'de beğeni ve yorum dizileri, atomik olmayan "oku-değiştir-yaz" işlemleriyle güncellenmektedir. Bu, iki kullanıcı aynı anda işlem yaptığında veri kaybına yol açabilir. `arrayUnion`, `arrayRemove` ve `increment` gibi atomik Firestore operatörleri kullanılmalıdır.
*   **Bağımlılık Sorunları:** Proje, eski ve uyumsuz Expo paketleri içermektedir. `metro` bundler ile ilgili sorunları çözmek için kullanılan `fix-metro.js` gibi geçici çözümler, bağımlılıkların kırılgan olduğunu göstermektedir. `npx expo install --fix` komutu çalıştırılmalı ve bağımlılıklar stabilize edilmelidir.
*   **Sonsuz Büyüyen Koleksiyon:** `functions/index.js`, bildirim gönderdikten sonra `pendingNotifications` koleksiyonundaki dokümanı silmemektedir. Bu, koleksiyonun gereksiz yere büyümesine ve maliyet artışına neden olur. İşlem tamamlandıktan sonra doküman silinmelidir.

---

## P3: Düşük Öncelikli İyileştirme Alanları

*   **CI/CD Otomasyonu Eksikliği:** Proje, testleri otomatik çalıştıran ve derlemeleri yöneten bir CI/CD pipeline'ından (örn. GitHub Actions) yoksundur. Bu, geliştirme süreçlerini yavaşlatır ve hata riskini artırır.
*   **Yetersiz İzleme ve Hata Raporlama:** Firebase Crashlytics tam olarak entegre edilmemiştir. Sentry veya Datadog gibi araçların eklenmesi, üretimdeki hataların proaktif olarak tespit edilmesini ve çözülmesini kolaylaştırır.
*   **Kod Tekrarı:** `authService.js` ve `HomeScreen.js` gibi dosyalarda benzer işlevlere sahip tekrar eden kod blokları bulunmaktadır. Bu bloklar, ortak yardımcı fonksiyonlar (utility functions) haline getirilerek sadeleştirilmelidir.

---

## Eksik Bilgiler ve Analiz Kısıtları

Bu analiz, aşağıdaki sistemlere ve bilgilere erişim olmadan yapılmıştır. Bu sistemlere erişim, daha derin ve dinamik bir analiz sağlayacaktır:

*   **Canlı Firebase Projesi:** Firebase Console'a erişim olmadan, Firestore'daki gerçek veri dağılımı, indekslerin performansı, Cloud Functions logları ve Crashlytics hata raporları incelenememiştir.
*   **Google Cloud Platform Projesi:** API anahtarlarının yetkileri ve kullanım metrikleri görülememiştir.
*   **CI/CD Sistemi:** EAS Build loglarına ve yapılandırmasına tam erişim olmadan, derleme süreçlerindeki olası darboğazlar tespit edilememiştir.
*   **Canlı Test Ortamı (Staging/Production):** Uygulamanın gerçek dünya koşullarındaki performansı (Web Vitals, ağ gecikmesi vb.) test edilememiştir.
