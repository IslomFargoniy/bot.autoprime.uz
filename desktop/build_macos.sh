#!/bin/bash
set -e

echo "========================================================"
echo "       AutoPrime LMS Desktop - macOS Release Build      "
echo "========================================================"

# 1. Flutter Dependencies
echo "[1/4] Paketlar yuklanmoqda..."
flutter pub get

# 2. macOS Release Build
echo "[2/4] macOS Release dastur yig'ilmoqda..."
flutter build macos --release

# 3. Create DMG or ZIP
echo "[3/4] DMG paket yaratilmoqda..."
APP_PATH="build/macos/Build/Products/Release/autoprime_desktop.app"
DEST_PATH="../public/downloads/desktop/AutoPrime-Setup-1.0.0.dmg"

if command -v create-dmg &> /dev/null; then
    create-dmg "$APP_PATH" "../public/downloads/desktop/" --overwrite || true
else
    # Fallback to hdiutil (native macOS built-in tool)
    hdiutil create -volname "AutoPrime LMS" -srcfolder "$APP_PATH" -ov -format UDZO "$DEST_PATH"
fi

echo "========================================================"
echo "[4/4] TAYYOR! DMG fayli: $DEST_PATH"
echo "Serverga yuklash:"
echo "scp $DEST_PATH root@193.181.213.60:/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz/public/downloads/desktop/"
echo "========================================================"
