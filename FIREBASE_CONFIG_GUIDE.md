# Firebase Config Güncelleme Rehberi

## Adım 1: Firebase Console'dan Config Alın

1. https://console.firebase.google.com/project/sorita-6d27e/overview adresine gidin
2. Sol menüden ⚙️ **Project Settings** tıklayın  
3. Aşağı kaydırın → **Your apps** bölümünde
4. **Add app** → **Web app** (</>) seçin
5. App nickname: "SoRita" yazın
6. **Register app** tıklayın
7. **Firebase SDK snippet** → **Config** seçin
8. Config objesini kopyalayın

## Adım 2: Config'i Güncelleyin

Kopyaladığınız config'i `src/config/firebase.js` dosyasındaki placeholder ile değiştirin:

```javascript
// Örnek config (sizinki farklı olacak):
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "sorita-6d27e.firebaseapp.com",
  projectId: "sorita-6d27e",
  storageBucket: "sorita-6d27e.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Adım 3: Firestore Database'i Etkinleştirin

1. Firebase Console → **Firestore Database**
2. **Create database** 
3. **Start in production mode** (kurallarımız hazır)
4. Location: **europe-west1** (Türkiye'ye yakın)
5. **Done**

## Adım 4: Authentication'ı Etkinleştirin

1. Firebase Console → **Authentication**
2. **Get started**
3. **Sign-in method** tab
4. **Email/Password** → **Enable** → **Save**

## Adım 5: Test Edin

```bash
npm start
```

Artık kayıt ve giriş sistemini test edebilirsiniz!

## ✅ Kurulum Tamamlandı!

- ✅ Firebase SDK yüklendi
- ✅ Firestore kuralları deploy edildi  
- ✅ Config dosyası hazır (güncelleme gerekli)
- ✅ Authentication sistemi hazır

**Sonraki adım:** Firebase Console'dan config alıp `src/config/firebase.js`'e yapıştırın!