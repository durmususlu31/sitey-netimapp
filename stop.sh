#!/bin/bash

# ==============================================================================
# Site Yönetim Sistemi - Durdurma Scripti
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Site Yönetim Sistemi servisleri durduruluyor...${NC}"

# 1. Backend durdur
if [ -f /tmp/site_backend.pid ]; then
    kill $(cat /tmp/site_backend.pid) 2>/dev/null || true
    rm -f /tmp/site_backend.pid
fi
killall SiteManagementSystem.Api 2>/dev/null || true
echo -e "${GREEN}✓ Backend durduruldu.${NC}"

# 2. Frontend durdur
if [ -f /tmp/site_frontend.pid ]; then
    kill $(cat /tmp/site_frontend.pid) 2>/dev/null || true
    rm -f /tmp/site_frontend.pid
fi
pkill -f "vite" 2>/dev/null || true
echo -e "${GREEN}✓ Frontend durduruldu.${NC}"

# 3. PostgreSQL konteyneri durdur
docker compose stop postgres 2>/dev/null || true
echo -e "${GREEN}✓ PostgreSQL konteyneri durduruldu.${NC}"

echo -e "${GREEN}Tüm servisler başarıyla kapatıldı.${NC}"
