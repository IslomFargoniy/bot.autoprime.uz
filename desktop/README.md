# 🚗 AutoPrime LMS — Flutter Desktop Application

AutoPrime avtomaktabi o'quvchilari uchun maxsus **Windows (.exe)** va **macOS (.dmg)** ish stoli dasturi.

---

## 🌟 Asosiy Imkoniyatlar:
1. **Telegram OTP Orqali Login**:
   - O'quvchi telefon raqamini kiritadi.
   - 6 xonali tasdiqlash kodi to'g'ridan-to'g'ri [@LmsAutoprimeBot](https://t.me/LmsAutoprimeBot) botiga keladi.
2. **Yagona Desktop Qurilma Nazorati (Strict Single Active Concurrency)**:
   - O'quvchi boshqa kompyuterdan kirsa, eski kompyuterdagi sessiya darhol avtomatik yopiladi va ogohlantirish chiqariladi.
3. **Desktop Test Yechish Interfeysi**:
   - 2-ustunli dizayn: Chapda katta rasm/diagramma, o'ngda F1–F4 javob variantlari.
   - To'liq klaviatura boshqaruvi: `F1-F4`, `1-4`, `Enter`, `Space`, `Arrow Left/Right`.
   - 130 ta Biletlar va 20 talik Ichki Nazorat Imtihoni.
4. **Serverdan Avto-Update (Ichki Yangilanish)**:
   - Dastur ishga tushganda `https://lms.autoprime.uz/api/desktop/version-check` orqali yangi versiyani tekshiradi.
   - Serverda yangi `.exe` paydo bo'lganda, foydalanuvchiga progress bar bilan avtomatik yuklab yangilab beradi.
5. **Ko'p tillilik**: 4 ta tilda (`uz`, `ru`, `krill`, `en`).

---

## 🛠️ Dasturni Ishga Tushirish (Development):

```bash
# 1. Desktop papkasiga o'ting
cd desktop

# 2. Paketlarni o'rnating
flutter pub get

# 3. Dasturni ishga tushiring
# macOS uchun:
flutter run -d macos

# Windows uchun:
flutter run -d windows
```

---

## 📦 Windows (.exe) va macOS (.dmg) Build Qilish:

### Windows uchun:
```bash
flutter build windows --release
```
Hosil bo'lgan fayllar: `desktop/build/windows/x64/runner/Release/`
Inno Setup orqali installer tayyorlab, serverdagi `/public/downloads/desktop/` papkasiga yuklang.

### macOS uchun:
```bash
flutter build macos --release
```
