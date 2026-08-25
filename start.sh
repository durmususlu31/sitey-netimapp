#!/bin/bash

# ==============================================================================
# Site Yönetim Sistemi - Tek Tıkla Local Çalıştırma Scripti
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PATH="/Users/durmus/.local/node-v22.17.0-darwin-arm64/bin:/usr/local/share/dotnet:~/.dotnet/tools:/usr/local/bin:/opt/homebrew/bin:$PATH"
export HOME=/Users/durmus
export DOTNET_CLI_HOME=/Users/durmus

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   🏢 Site Yönetim Sistemi - Başlatılıyor...          ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. DOCKER KONTROLÜ
echo -e "\n${YELLOW}[1/4] Docker kontrol ediliyor...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker kapalı görünüyor. Docker Desktop açılıyor...${NC}"
    open -a Docker
    
    echo -n "Docker servisinin hazır olması bekleniyor"
    for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
            echo -e "\n${GREEN}✓ Docker hazır!${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done

    if ! docker info >/dev/null 2>&1; then
        echo -e "\n${RED}Hata: Docker Desktop başlatılamadı. Lütfen Docker uygulamasını açıp tekrar deneyin.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker zaten çalışıyor.${NC}"
fi

# 2. POSTGRESQL VERİTABANI BAŞLATMA
echo -e "\n${YELLOW}[2/4] PostgreSQL veritabanı konteyneri başlatılıyor...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^site-management-postgres$"; then
    docker start site-management-postgres >/dev/null 2>&1 || docker compose up -d postgres
else
    docker compose up -d postgres
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL aktif (Port: 5432).${NC}"
else
    echo -e "${RED}PostgreSQL başlatılamadı!${NC}"
    exit 1
fi

# 3. BACKEND API BAŞLATMA
echo -e "\n${YELLOW}[3/4] Backend .NET API başlatılıyor...${NC}"
killall SiteManagementSystem.Api 2>/dev/null || true

cd "$SCRIPT_DIR/SiteManagementSystem.Api"
export ASPNETCORE_ENVIRONMENT=Development
dotnet run --launch-profile https > /tmp/site_backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/site_backend.pid
echo -e "${GREEN}✓ Backend başlatıldı (PID: $BACKEND_PID, https://localhost:7044).${NC}"

# 4. FRONTEND BAŞLATMA
echo -e "\n${YELLOW}[4/4] Frontend Vite Dev Server başlatılıyor...${NC}"
pkill -f "vite" 2>/dev/null || true
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/site_frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/site_frontend.pid
echo -e "${GREEN}✓ Frontend başlatıldı (PID: $FRONTEND_PID, http://localhost:5173).${NC}"

# 5. KULLANICI BİLGİLENDİRME
sleep 2
echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   🚀 Sistem Başarıyla Ayakta!                       ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "🖥️  Frontend:   ${BLUE}http://localhost:5173${NC}"
echo -e "⚙️  Swagger API: ${BLUE}https://localhost:7044/swagger/index.html${NC}"
echo -e "🔑 Giriş:       admin@site.com / Admin@123"
echo -e "🛑 Durdurmak için: ${YELLOW}./stop.sh${NC}"
echo -e "${GREEN}======================================================${NC}\n"

open "http://localhost:5173" 2>/dev/null || true
