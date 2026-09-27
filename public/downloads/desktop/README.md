# AutoPrime Desktop Releases Folder

Ushbu papka Flutter Desktop dasturi uchun o'rnatish fayllari (`.exe`, `.dmg`) va avto-yangilanish faylini saqlash uchun mo'ljallangan.

## Yangi versiya yuklash tartibi:
1. Yangi Flutter Windows build tayyorlang (`flutter build windows`).
2. Inno Setup orqali `AutoPrime-Setup-X.X.X.exe` installer yarating.
3. Yangi `.exe` faylini ushbu papkaga yuklang:
   `/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz/public/downloads/desktop/AutoPrime-Setup-X.X.X.exe`
4. `version.json` faylidagi `version`, `build_number`, `download_url_windows`, `changelog_uz` qatorlarini yangilang.
5. Desktop dasturlar yangi versiyani avtomatik aniqlab, o'quvchilarga yangilash oynasini ko'rsatadi.
