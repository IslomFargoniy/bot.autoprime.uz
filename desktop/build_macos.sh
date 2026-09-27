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
STAGE_DIR="/tmp/autoprime_dmg_stage_$$"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp -R "$APP_PATH" "$STAGE_DIR/AutoPrime.app"
ln -s /Applications "$STAGE_DIR/Applications"

hdiutil create -volname "AutoPrime LMS" -srcfolder "$STAGE_DIR" -ov -format UDZO -fs HFS+ "$DEST_PATH"
rm -rf "$STAGE_DIR"

echo "========================================================"
echo "[4/4] TAYYOR! DMG fayli: $DEST_PATH"
echo "Serverga yuklash:"
echo "scp $DEST_PATH root@193.181.213.60:/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz/public/downloads/desktop/"
echo "========================================================"
