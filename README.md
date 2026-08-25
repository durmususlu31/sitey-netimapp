# Site Management System (Site Yönetim Sistemi)

## 🚀 Hızlı Başlatma (Tek Tıkla / Tek Komutla)

Projeyi tüm servisleriyle (Docker PostgreSQL, .NET Backend API ve React Frontend) tek bir komutla başlatmak için terminalden proje dizininde şu komutu çalıştırmanız yeterlidir:

```bash
cd /Users/durmus/SiteYönetim/site-management-system
./start.sh
```

> **Not:** `start.sh` scripti Docker kapalıysa otomatik olarak Docker Desktop'ı açar, PostgreSQL veritabanını ayağa kaldırır, backend ve frontend'i başlatır ve tarayıcınızı otomatik açar.

Tüm servisleri durdurup kapatmak için:
```bash
./stop.sh
```

---

## 🛠️ Manuel Adım Adım Çalıştırma (Alternatif)

Eğer servisleri ayrı ayrı terminal pencerelerinde takip etmek isterseniz:

### 1. Adım: Docker Desktop'ı Açın
- Mac'inizde `Docker Desktop` uygulamasını açın (Spotlight: `Cmd + Boşluk` -> `Docker`).
- Veya terminalden:
  ```bash
  open -a Docker
  ```

### 2. Adım: PostgreSQL Veritabanını Başlatın
Terminalde proje ana dizinindeyken:
```bash
cd /Users/durmus/SiteYönetim/site-management-system
docker compose up -d postgres
```

### 3. Adım: Backend (.NET API) Başlatın
Ayrı bir terminal penceresinde:
```bash
cd /Users/durmus/SiteYönetim/site-management-system/SiteManagementSystem.Api
dotnet run --launch-profile https
```
*(Backend `https://localhost:7044` ve `http://localhost:5071` portlarında çalışır)*

### 4. Adım: Frontend (React SPA) Başlatın
Başka bir terminal penceresinde:
```bash
cd /Users/durmus/SiteYönetim/site-management-system/frontend
npm run dev
```
*(Frontend `http://localhost:5173` adresinde çalışır)*

---

## 🌐 Giriş ve Erişim Bilgileri

- **🖥️ Web Dashboard (Önerilen):** [http://localhost:5173](http://localhost:5173)
- **⚙️ Backend Swagger API:** [https://localhost:7044/swagger/index.html](https://localhost:7044/swagger/index.html)
- **🔑 Yönetici Girişi:**
  - **E-posta:** `admin@site.com`
  - **Şifre:** `Admin@123`

---

## 🧪 Testleri Çalıştırma

```bash
# Backend xUnit Testleri:
dotnet test SiteManagementSystem.sln --nologo

# Uçtan Uca Test Ajanı:
node tests/api-agent-test.mjs
```
