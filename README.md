# 🏢 Site Yönetim Sistemi (React + Firebase)

Modern, hızlı ve bulut tabanlı Site & Apartman Yönetim Sistemi. React 19 ve Google Cloud Firestore mimarisiyle sıfırdan geliştirilmiştir.

---

## 🚀 Özellikler

- 🏢 **Site ve Blok Yönetimi:** Çoklu site ve blok ekleme, düzenleme, detaylı liste.
- 🚪 **Daire & Mülk Yönetimi:** Kat, tip, tapu numarası ve doluluk durumları.
- 👥 **Kat Malikleri & Kiracılar:** İletişim bilgileri, giriş/çıkış tarihleri, kira ve aidat tanımları.
- 💳 **Tahakkuk & Aidat İşlemleri:** Aylık otomatik veya tekli aidat/kira/fatura tahakkuku, toplu borçlandırma.
- 🧾 **Kasa & Finans Takibi:** Ödeme tahsilatı, gider faturaları, kategori bazlı harcamalar, geciken alacaklar raporu.
- 📢 **Duyurular & Sakin Talepleri:** Site geneli duyuru panosu ve sakin arıza/istek bildirim sistemi.
- 📑 **Evrak & Belge Yönetimi:** Tapu fotokopisi, kira kontratı yükleme ve arşivleme.
- 🔒 **Firebase Entegrasyonu:** Firestore gerçek zamanlı NoSQL veritabanı.

---

## 🛠️ Yerel Kurulum & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Canlı dağıtım için derleyin (Build)
npm run build
```

---

## ☁️ Cloudflare Pages Dağıtımı

1. [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
2. GitHub deponuzu seçin.
3. Ayarlar:
   - **Framework Preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment Variables:**
     - `VITE_FIREBASE_PROJECT_ID`: `siteyonetim-4e92e`
     - `VITE_FIREBASE_AUTH_DOMAIN`: `siteyonetim-4e92e.firebaseapp.com`
4. **Save and Deploy** butonuna basın.
