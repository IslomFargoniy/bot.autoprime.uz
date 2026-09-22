# AutoPrime LMS & ERP (lms.autoprime.uz) Tizimini Joriy Qilish Rejasi

Mazkur reja **lms.autoprime.uz** domenida alohida platforma sifatida O‘zbekiston avtomaktablari uchun to‘liq moslashtirilgan, **O‘quvchi hech qanday veb-sahifasiz to‘g‘ridan-to‘g‘ri Telegram Bot Chatida ketma-ket savol-javob orqali anketani to‘ldirishi, rasmlarni yuklashi, 1-klik shartnoma, Kassa, Guruhlar jadvali, Darslar, LMS Video & Materiallar, Testlar, Bitiruv Guvohnomasi va Xodimlar bilan Oybay Hisob-kitobgacha bo‘lgan 100% to‘liq platforma**ga aylantirish uchun ishlab chiqildi:

* 🌐 **Loyiha Domeni**: `https://lms.autoprime.uz`
* 🖥️ **Server Joylashuvi**: `/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz` (IP: `193.181.213.60`)
* ⚙️ **Muhit (Stack)**: PHP 8.3 (`/opt/php83/bin/php`), Node `v20.20.2`, MySQL
* 🌿 **Git Brench**: `lms-autoprime`

---

## Asosiy Modullar va Imkoniyatlar

* 🤖 **Telegram Bot Chatida Ketma-ket Anketa To‘ldirish (Conversational Chat Wizard)**: 
  Bo‘lajak o‘quvchi hech qanday tashqi sayt ochmasdan, to‘g‘ridan-to‘g‘ri bot chatida ketma-ket savollarga javob beradi:
  1. 👤 **F.I.O** (Ism, familiya, sharif)
  2. 📱 **Telefon raqami** (*"Kontaktni ulashish"* bitta tugma orqali)
  3. 🚗 **Toifa tanlash** (*B, A, C* tugmalari orqali)
  4. 🏢 **Filial tanlash** (*Chilonzor, Yunusobod va h.k.* tugmalari)
  5. ⏰ **Qulay o‘qish vaqti** (*Ertalabki, Kunduzgi, Kechki* tugmalari)
  6. 📸 **Pasport / ID karta rasmi** (Telefon kamerasidan yoki galereyadan to‘g‘ridan-to‘g‘ri rasm qilib tashlaydi — *shifrlangan saqlanadi*)
  7. 👤 **3x4 rasm / Selfi** (Bot chatiga rasm qilib yuboradi)
  8. 📅 **Tug‘ilgan sana va Yashash manzili**
  9. 🔢 **JSHSHIR (PINFL)** (14 xonali — *shifrlangan saqlanadi*)
* ⚡ **Receptionga Xabar va 1-Klikda Shartnoma**: Bot anketani qabul qilishi bilan Reception xodimiga bildirishnoma boradi. Reception barcha yuklangan rasmlar va ma'lumotlarni ko‘rib, 1-klik bilan talaba (`students`) va shartnoma (`contracts`)ga aylantiradi.
* 📅 **Guruhlarda Dars Kunlari va Vaqt Jadvali**:
  - Guruh yaratishda dars bo'ladigan hafta kunlari (`days_of_week` JSON: Dush-Chor-Juma, Sesh-Pay-Shan yoki ixtiyoriy kunlar) belgilanadi.
  - Darsning boshlanish va tugash vaqti (`start_time`, `end_time`), xonasi (`room`) va toifasi (`category`) kiritiladi.
* 📚 **LMS: Toifalar Bo'yicha Video Darsliklar va Materiallar**:
  - Har bir toifa (A, B, C, D, BC...) uchun dars mavzulari (`lessons`/`topics`) 4 tilda tuziladi.
  - Mavzularga video darsliklar (`video_url`) va yuklab olinadigan PDF qo'llanma/slaydlar (`lesson_materials`) biriktiriladi.
  - Guruhga biriktirilgan o'quvchilar o'z shaxsiy kabinetida o'z toifasiga tegishli barcha video va materiallardan erkin foydalanadi.
* 📄 **Moslashuvchan Shartnoma Turlari (Tariflar & Modullar)**:
  - Admin cheksiz shartnoma turlari (`contract_types`)ni yaratadi va standart narxini belgilaydi.
  - Shartnomaga boshlanish (`start_date`) va tugash (`end_date`) vaqtlari erkin kiritiladi.
  - Shartnoma tuzilayotganda talabaning ehtiyojiga qarab xizmatlar tanlanadi:
    - 📘 **Nazariy ta'lim** (`has_theory`)
    - 🚗 **Amaliy haydash / Vajdeniya** (`has_driving`)
    - 💻 **Testlar va LMS imtihon** (`has_lms`)
* 🎨 **Talabalar To'lov Foizi va 4 Xil Rang Indikatori**:
  - ⚪ **0%**: Oq / Neytral kulrang
  - 🔴 **1% - 49.9% (< 50%)**: Qizil
  - 🟡 **50% - 74.9% (50% - 75%)**: Sariq
  - 🟢 **75% va undan yuqori (75%+)**: Yashil
* 🚗 **Amaliy Haydashga (Vajdeniya) Ruxsat**:
  - Faqat to'lov foizi **75% dan katta yoki teng (>= 75%)** bo'lgan va shartnomasida `has_driving = true` bo'lgan talabalarnigina haydash darslariga (instruktor slotlariga) qo'shish mumkin.
* 🏫 **Darsga (Nazariy Dars / Davomat) Kirish**:
  - Talaba darsga (QR orqali davomatga) kirishi uchun **minimal to'lovni** (`min_payment_amount`) amalga oshirgan bo'lishi shart.
* 💳 **3 Xil Kassa Turlari va Moliyaviy Yaxlitlik**:
  - Filiallarda 3 xil kassa turlari bo'yicha bir nechta kassa yaratiladi:
    - 💵 **Naqd kassa** (`cash`)
    - 💳 **Karta / Click / Payme** (`card_click`)
    - 🏦 **Bank o'tkazmasi** (`bank_transfer`)
  - DB CHECK constraint (`balance >= 0`, `debt_amount >= 0`, `salary_balance >= 0`) + `DB::transaction()` + `lockForUpdate()`.
  - Keshlangan summalarning drift xavfini oldini olish uchun kunlik yarim kechasi avtomatik `ReconcileFinancialBalancesJob`.
* 💼 **Xodimlar Bilan Oybay Hisob-kitob (Monthly Payroll)**:
  - Barcha hisob-kitoblar oylar bo'yicha (`period: 'YYYY-MM'`) olib boriladi.
  - Oylik tarkibi: Oklad (`base_salary`), Darsbay soatbay (`driving_hourly_rate`), KPI / Bonus (`bonus_kpi`), Avans va Jarimalar (`is_deduction = true`).
  - Har oy uchun xodimlar oylik vedomosti (Payroll Sheet) shakllanadi va kassadan to'lanadi (`salary_payments`).
* 📱 **PlayMobile SMS Integratsiyasi**:
  - Shartnoma tuzilganda avtomatik SMS (Shartnoma raqami, summa, o'qish muddatlari).
  - To'lov qabul qilinganda avtomatik SMS (Qabul qilingan summa, jami to'langan foiz, qoldiq qarz).
* 🔐 **Spatie RBAC & Permissions Matrix** (7 ta rol, `model_has_roles` va `model_has_permissions` orqali to‘g‘ridan-to‘g‘ri ruxsatlar)
* 🛡️ **Xavfsizlik va Shaxsiy Ma'lumotlarni Himoyalash (PII Encryption)**:
  - `pinfl`, `passport_series`, `passport_number`, `passport_photo_url`, `medical_certificate_photo_url` maydonlari model darajasida Laravel `encrypted` cast bilan saqlanadi.
* 📋 **Audit va Xatti-harakatlar Tarixi (`spatie/laravel-activitylog`)**:
  - Shartnomalarni tahrirlash, ochiq smenadagi to‘lovlarni tuzatish, kassa transferlarini tasdiqlash va oylik hisoblash amallari to‘liq qayd etiladi.
* 🚗 **Avtopark Normalizatsiyasi**:
  - Xodimlar jadvalidan mashina maydonlari chiqarilib, `vehicles` jadvali orqali boshqariladi va `drivings.vehicle_id` orqali har bir dars o‘tilgan avtomobil aniq bog‘lanadi.
* 📱 **Darslar & Davomat** (One-Time Dynamic QR & Telefonsizlar uchun Manual Davomat)
* 📚 **LMS Testlar & Imtihon (4 Tilda: uz, ru, krill, en)**:
  - Prava24 1190+ savolli 25 min taymerli simulyator, biletlar, savollar, javoblar va yo‘l belgilari 4 ta tilda to‘liq ishlaydi.
* 🎓 **Bitirish & Sertifikat/Guvohnoma** (QR-kodli rasmiy bitiruv guvohnomasi PDF)
* 📜 **Gibrid Balans & UNION Moliyaviy Tarixlar** (Student, Kassa, Xodim ko‘chirmalari)
* 📲 **Telegram Mini App** (O‘quvchining to‘liq shaxsiy kabineti)

---

## Mahalliylashtirish (4 ta tilda)

Barcha UI interfeyslar, LMS dars mavzulari va video tavsiflari, oylik vedomostlari, holat matnlari, SMS shablonlari va savollar bazasi to‘rtta tilda to‘liq ishlaydi:
- `ru.json` (Ruscha)
- `uz.json` (O‘zbekcha lotin)
- `krill.json` (O‘zbekcha kirill)
- `en.json` (Inglizcha)
