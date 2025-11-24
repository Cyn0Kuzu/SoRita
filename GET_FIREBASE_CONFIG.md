# Firebase Config Alma Rehberi

## Firebase Console'dan gerçek config değerlerini almak için:

1. **Firebase Console'a git:**
   - https://console.firebase.google.com/project/sorita-6d27e/overview

2. **Project Settings'e git:**
   - Sol taraftaki ⚙️ ikonuna tıkla
   - "Project settings" seç

3. **Web app ekle:**
   - Aşağı kaydır, "Your apps" bölümüne git
   - "Add app" butonuna tıkla
   - Web app ikonu (</>)  seç
   - App nickname: "SoRita" yaz
   - "Register app" butonuna tıkla

4. **Config'i kopyala:**
   - Açılan sayfada "Firebase SDK snippet" kısmında
   - "Config" seçeneğini seç
   - `firebaseConfig` objesini kopyala

5. **Config'i güncelle:**
   ```javascript
   // src/config/firebase.js dosyasındaki config'i değiştir:
   const firebaseConfig = {
     apiKey: "gerçek-api-key-buraya",
     authDomain: "sorita-6d27e.firebaseapp.com",
     projectId: "sorita-6d27e", 
     storageBucket: "sorita-6d27e.firebasestorage.app",
     messagingSenderId: "gerçek-messaging-sender-id",
     appId: "gerçek-app-id",
     measurementId: "gerçek-measurement-id"
   };
   ```

6. **Authentication etkinleştir:**
   - Firebase Console → Authentication → Get started
   - Sign-in method → Email/Password → Enable

7. **Firestore Database oluştur:**
   - Firebase Console → Firestore Database → Create database  
   - "Start in production mode" seç
   - Location: europe-west1 seç

Config güncellendikten sonra uygulama çalışmaya hazır olacak!
