# 🏢 Site ve Apartman Yönetim Sistemi (React JS + Firebase)

Bu proje, C# (.NET) ve SQL bağımlılıklarından arındırılarak modern **React 19 + TypeScript + Vite** ve **Google Cloud Firebase (Firestore & Authentication)** mimarisine taşınmıştır.

Web'de (Firebase Hosting, Vercel, Netlify vb.) sıfır sunucu kurulum maliyetiyle doğrudan çalıştırılabilir ve barındırılabilir.

---

## 🌟 Temel Özellikler

- **📱 Zengin ve Duyarlı Web Arayüzü (React):**
  - **Genel Bakış:** Özet istatistik kartları, aylık gelir/gider trendleri, acil bildirimler.
  - **Site & Blok & Daire Yönetimi:** Çoklu site desteği, bloklar, daire kat/tip/tapu tanımları.
  - **Kat Malikleri & Kiracılar:** İletişim, taşınma tarihleri, sözleşme ve evrak takibi.
  - **Finans & Kasa:** Aidat, Kira, Fatura ve Diğer tahakkuklar; kısmi/tam tahsilat, gider yönetimi, gecikme faizi/gecikmiş borç raporları.
  - **Toplu Aidat / Tahakkuk Sihirbazı:** Tek tıkla tüm siteye, bloğa veya seçilen dairelere aidat tahakkuk ettirme.
  - **Excel / CSV Desteği:** Toplu daire/aidat dışa aktarma ve CSV ile içeri aktarma.
  - **Duyurular & Arıza / Talep Takibi:** Sakinlerden gelen talepler, durum ve öncelik yönetimi.
  - **Denetim Günlükleri (Audit Log):** Sistemde yapılan tüm işlemlerin geçmişi.

- **🔥 Google Firebase & Firestore Desteği:**
  - **Cloud Firestore:** NoSQL koleksiyon yapısı ile hızlı veri okuma/yazma.
  - **Firebase Authentication:** Güvenli kullanıcı kimlik doğrulama.
  - **Firebase Storage:** Tapu, sözleşme, dekont ve fatura belgeleri saklama.
  - **Dahili Offline / Demo Modu:** Firebase anahtarları girilmemiş olsa dahi sistem hazır tohumlama (seed) verileriyle tarayıcıda hemen test edilebilir!

---

## 🚀 Hızlı Başlatma (Frontend - React)

1. **Frontend dizinine gidin:**
   ```bash
   cd frontend
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```
   *Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresini açın.*

4. **Varsayılan Yönetici Girişi:**
   - **E-posta:** `admin@site.com`
   - **Şifre:** `Admin@123`

---

## ⚙️ Firebase Canlı Bağlantısı (Opsiyonel)

Firebase projenizi bağlamak için:
1. `frontend/.env.example` dosyasını `frontend/.env` olarak kopyalayın:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. [Firebase Console](https://console.firebase.google.com)'dan aldığınız proje anahtarlarını `.env` içine yapıştırın:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=projeniz.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=projeniz
   VITE_FIREBASE_STORAGE_BUCKET=projeniz.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

---

## 🌐 Web'de Barındırma (Deploy)

### 1. Firebase Hosting ile Dağıtım:
```bash
npm run build
firebase deploy
```

### 2. Vercel veya Netlify:
- Root dizin: `frontend`
- Build komutu: `npm run build`
- Output dizini: `dist`

---

## 🟢 Node.js Alternatif Sunucusu (C# Yerine)
Sunucu tarafında REST API çalıştırmak isterseniz:
```bash
cd server
npm install
npm run dev
```
*(Node.js Express API `http://localhost:5000` portunda çalışır)*
