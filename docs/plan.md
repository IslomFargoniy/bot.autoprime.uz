# AutoPrime LMS & ERP (lms.autoprime.uz) Tizimini Joriy Qilish Rejasi

Mazkur reja **lms.autoprime.uz** domenida alohida yaxlit platforma (All-in-One Monolith) sifatida O'zbekiston avtomaktablari uchun to'liq moslashtirilgan. 

Tizim uchta asosiy interfeysdan iborat:
1. 🤖 **O'quvchi Qabul Jarayoni**: 100% Telegram Bot chatida ketma-ket savol-javob (wizard) orqali hech qanday tashqi havola ochmasdan anketani to'ldirish, hujjatlarni yuklash.
2. 📲 **O'quvchi Shaxsiy Kabineti & LMS**: Telegram Bot ichida 1-klik bilan ochiluvchi **Telegram Mini App (TMA)** (`https://lms.autoprime.uz/mini-app`). Hech qanday login/parol talab qilinmaydi — Telegram `initData` orqali xavfsiz avtorizatsiya qilinadi. Talaba dars materiallari, video darslar, 1190+ testlar va dinamik QR davomatdan foydalanadi.
3. 🖥️ **Admin, Filial va Xodimlar ERP Paneli**: Veb-brauzer orqali zamonaviy Inertia.js + React interfeysi (`https://lms.autoprime.uz/admin`).

* 🌐 **Loyiha Domeni**: `https://lms.autoprime.uz`
* 🖥️ **Server Joylashuvi**: `/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz` (IP: `193.181.213.60`)
* ⚙️ **Muhit (Stack)**: PHP 8.3 (`/opt/php83/bin/php`), Node `v20.20.2`, MySQL, Laravel 13, Inertia v3, React 19, Tailwind v4
* 🌿 **Git Brench**: `lms-autoprime`
* 🤖 **Telegram Bot**: [@LmsAutoprimeBot](https://t.me/LmsAutoprimeBot)
* 📱 **Telegram Webhook**: `https://lms.autoprime.uz/api/telegram/webhook`
* 📲 **Telegram Mini App**: `https://lms.autoprime.uz/mini-app`

---

## O'quvchining To'liq Hayotiy Sikli (Bot Qabulidan ➡️ Sertifikatgacha)

```
1. TELEGRAM BOT CHATIDA KETMA-KET QABUL ANKETASI (Bot Chat Wizard & CRM Leads)
   ├── Bot: "F.I.O ingizni kiriting" ➡️ O'quvchi yozadi
   ├── Bot: [📱 Kontaktni yuborish] ➡️ O'quvchi bitta tugma bilan telefonini ulashadi
   ├── Bot: Toifani tanlang: [🚗 B toifa] [🏍️ A toifa] [🚛 C toifa]
   ├── Bot: Filialni tanlang: [🏢 Chilonzor] [🏢 Yunusobod]
   ├── Bot: Qulay o'qish vaqti: [🌅 Ertalabki] [☀️ Kunduzgi] [🌙 Kechki]
   ├── Bot: "Pasportingiz rasmini yuboring" ➡️ Rasm olinadi (Encrypted private storage)
   ├── Bot: "3x4 rasmingizni yuboring" ➡️ Rasm saqlanadi
   ├── Bot: "Tug'ilgan sana va manzilingizni kiriting" ➡️ O'quvchi yozadi
   └── Bot: JSHSHIR (PINFL) ➡️ (Shifrlanadi + Blind Index Hash orqali takrorlanish tekshiriladi)

2. CRM LEADS KANBAN & RECEPTION GA BILDIRISHNOMA
   ├── Bot arizasi CRM Kanban doskasida ko'rinadi (new_lead ➡️ form_sent ➡️ form_completed)
   ├── Reception barcha rasmlar va ma'lumotlarni ko'rib, 1-klik bilan Student ochadi
   └── Shartnoma turini tanlaydi (Tarif: Narx, Muddatlar, [x] Nazariya, [x] Vajdeniya, [x] Test, Majburiy darslar soni).

3. SHARTNOMA RASMIYLASHTIRILADI & SMART BILDIRISHNOMA
   ├── Shartnoma tasdiqlanadi (contracts.group_id orqali talaba guruhga biriktiriladi)
   ├── Smart Router: Telegram bot orqali 100% BEPUL chiroyli shartnoma xabari va havolasi yuboriladi
   │   └── Faqat Telegrami bo'lmagan holdagina zaxira PlayMobile SMS yuboriladi
   └── CRM lidi holati: contract_signed ga o'tadi.

4. TO'LOV QABUL QILISH (Payments & Cash Registers)
   ├── Kassir to'lov usuliga mos kassani tanlaydi (Naqd / Click-Karta / Bank o'tkazma)
   │   └── Qat'iy tekshiruv: Kassa turi to'lov usuli bilan mos kelishi shart (Naqd kassaga Click to'lanmaydi)
   ├── To'lov qabul qilinadi (DB transaction + lockForUpdate) ➡️ Telegram chek / SMS boradi
   └── To'lov foiziga qarab talabaga rang beriladi:
       ├── 0%   = ⚪ Oq rang
       ├── <50% = 🔴 Qizil rang
       ├── 50-74.9% = 🟡 Sariq rang
       └── 75%+ = 🟢 Yashil rang

5. NAZARIY TA'LIM, LMS MATERIALLAR & DINAMIK QR DAVOMAT
   ├── SHART: Talaba minimal to'lovni (min_theory_payment_percent, masalan 30%) to'lagan va has_theory=true
   ├── O'qituvchi dars ochadi, ekrandagi har 15-20s yangilanuvchi dinamik QR kod chiqadi
   ├── Talaba Telegram Mini App ichidagi "📷 Davomat" tugmasini bosib, 1 soniyada QR ni skanerlaydi
   ├── Telefoni yo'q talabalar qo'lda belgilanadi (is_manual, manual_reason, marked_by_user_id)
   └── Shaxsiy kabinetida (Mini App) guruh toifasiga mos VIDEO darslar va PDF materiallardan foydalanadi.

6. AMALIY HAYDASH (Drivings & Instructors & Vehicles)
   ├── SHART: Talaba to'lovi kamida 75% bo'lishi shart (va has_driving=true)
   ├── Instruktor va uning doimiy mashinasi (default_instructor_id) avtomatik taklif qilinadi
   ├── Vaqt kesishuvi (Slot Collision) qat'iy tekshiriladi: bir vaqtda ikkita darsga yozish bloklanadi
   └── Dars yakunida o'quvchi instruktorga baho (Review: 1-5 yulduz + teglar) qo'yadi.

7. TEST VA ICHKI IMTIHON (LMS & Mock Exam — 4 Tilda)
   └── Telegram Mini App orqali 1190+ bazasida 4 tilda mashq qiladi va ichki imtihon topshiradi.

8. BITIRISH & GUVOHNOMA/SERTIFIKAT (Certificates)
   └── 4 ta shart tizim tomonidan qat'iy va avtomatik tekshiriladi:
       ├── 1. Talabaning shu shartnomasi bo'yicha qarzi 0 (debt_amount == 0)
       ├── 2. Nazariy darslardagi davomat foizi kamida 70% (attendance_rate >= 70%)
       ├── 3. Amaliy haydash mashg'ulotlari soni to'liq o'tilgan (completed_drivings >= required_driving_lessons)
       └── 4. Ichki imtihondan muvaffaqiyatli o'tgan (is_passed == true)
       ➡️ QR-kodli rasmiy Bitiruv Guvohnomasi PDF chop etiladi.

9. KASSA SMENASI YOPISH & ADMIN KASSAGA TRANSFER
   ├── NAQD KASSA (cash): Kun/hafta oxirida kassir smenani yopadi (CashShift), naqd pul sanaladi
   │   va Markaziy Admin Kassaga transfer qilinadi (CashTransfer).
   └── BANK & CLICK KASSALARI (card_click, bank_transfer): Smena transferi emas, balki Bank Ko'chirmasi
       Solishtiruvi (Bank Reconciliation) orqali balanslar tekshiriladi.

10. XODIMLAR BILAN OYBAY HISOB-KITOB (Payroll & Vedomost)
    ├── Buxgalter 1-klikda oylik vedomostini generatsiya qiladi (Generate Monthly Payroll):
    │   Sof Oylik (Net) = Oklad + (O'tilgan Haydash Soatlari × Stavka) + (Nazariya Darslari × Stavka) + KPI - Avans - Jarima
    └── Filial kassalaridan xodimga oylik to'lanadi (salary_payments).

11. XRONOLOGIK TARIX & AUDIT (UNION Statements & Drift Reconciliation)
    ├── Talabaning to'liq qarz va to'lovlar tarixi (running balance)
    ├── Kassaning barcha kirim/chiqim qoldiqlari (UNION xronologik ko'chirma)
    ├── Xodimning oylik ko'chirmasi
    └── Har kecha (00:00) avtomatik ReconcileFinancialBalancesJob: balanslar to'g'riligi tekshiruvi.
```

---

## Asosiy Modullar va Imkoniyatlar

### 🤖 1. Telegram Bot Chatida Ketma-ket Qabul Anketasi (Conversational Chat Wizard)
Bo'lajak o'quvchi hech qanday tashqi sayt ochmasdan, to'g'ridan-to'g'ri Telegram bot chatida ketma-ket savollarga javob beradi:
1. 👤 **F.I.O** (Ism, familiya, sharif)
2. 📱 **Telefon raqami** (*"Kontaktni ulashish"* bitta tugma orqali)
3. 🚗 **Toifa tanlash** (*B, A, C, BC* tugmalari orqali)
4. 🏢 **Filial tanlash** (*Chilonzor, Yunusobod va h.k.* tugmalari)
5. ⏰ **Qulay o'qish vaqti** (*Ertalabki, Kunduzgi, Kechki* tugmalari)
6. 📸 **Pasport / ID karta rasmi** (Telefon kamerasidan yoki galereyadan rasm — *shifrlangan papkaga yuklanadi*)
7. 👤 **3x4 rasm / Selfi** (Bot chatiga rasm qilib yuboradi)
8. 📅 **Tug'ilgan sana va Yashash manzili**
9. 🔢 **JSHSHIR (PINFL)** (14 xonali — *shifrlanadi va takrorlanmasligi uchun Blind Index Hash saqlanadi*)

> **Xavfsizlik:** Telegramdan yuklab olingan rasmlar darhol xavfsiz papkaga (`storage/app/private/documents/...`) yuklanib, fayl yo'llari bazada shifrlanadi.

---

### 📲 2. O'quvchi Shaxsiy Kabineti — Telegram Mini App (TMA)
O'quvchi Telegramdagi *"📱 Shaxsiy Kabinet"* yoki *"🚗 O'qishni boshlash"* tugmasini bosganda, Telegram ichida to'liq ekranli **Telegram Mini App** ochiladi:
* **Parolsiz Xavfsiz Kirish**: Telegram `initData` orqali backendda HMAC-SHA256 tekshirilib, o'quvchi avtomatik tizimga kiradi.
* **Mening Shartnomam & To'lovlarim**: To'langan summa, qoldiq qarz, to'lov foizi va rang indikatori.
* **Darslar Jadvali**: Guruh dars kunlari, vaqtlari, xonasi va o'qituvchisi.
* **📷 Dinamik QR Davomat Skaneri**: Dars paytida ekrandagi QR kodni bitta tugma bilan Mini App kamerasi orqali skanerlash (`Telegram.WebApp.showScanQrPopup()`).
* **LMS Video Darslar & PDF Materiallar**: Guruh toifasiga mos mavzularni ko'rish, videolarni tomosha qilish, dars slaydlarini yuklab olish.
* **Testlar**: 1190+ rasmli testlar bilan biletlar bo'yicha mashq qilish va nazorat imtihonini topshirish.

---

### 👥 3. CRM Leads Kanban & Bot Arizalari
* **Lead bosqichlari (stages):** `new_lead` ➡️ `form_sent` ➡️ `form_completed` ➡️ `contract_signed` / `rejected`
* **Manba turlari (sources):** `telegram_bot`, `reception_manual`, `instagram`, `website`, `referral`, `walk_in`, `other`
* **Qabulxona (Reception):** Bot arizasini ko'rib, 1-klik bilan Student va Contract ochadi.

---

### 📄 4. Moslashuvchan Shartnoma Turlari (`contract_types`) va Modullar
Admin cheksiz shartnoma tariflarini yaratadi va boshqaradi:
* **Tarif xususiyatlari:**
  * `name`: Tarif nomi (masalan: "Standart B toifa", "VIP B toifa (Cheksiz haydash)", "Faqat Nazariya", "Faqat Vajdeniya")
  * `category`: A, B, C, BC, D, E
  * `price`: Standart narx
  * `required_driving_lessons`: Majburiy amaliy haydash darslari soni (masalan: 10 ta dars)
  * `required_theory_lessons`: Majburiy nazariy darslar soni (masalan: 24 ta dars)
  * `min_theory_payment_percent`: Darsga kirish uchun minimal to'lov foizi (standart: 30%)
* **Modul tanlovi (Checkboxes):**
  * 📘 `has_theory` (Nazariy ta'lim)
  * 🚗 `has_driving` (Amaliy haydash)
  * 💻 `has_lms` (Testlar va LMS video darslar)
* Shartnoma raqami avtomatik generatsiya qilinadi: `AP-2026-0012`.
* **Shartnoma holatlari:** `draft`, `active`, `completed`, `cancelled`.
* **To'lov holatlari:** `unpaid`, `partial`, `paid`.

---

### 📅 5. Guruhlarda Dars Kunlari va Vaqt Jadvali (Group Schedules)
* 📆 **Dars Kunlari (`days_of_week` JSON):** Dush-Chor-Juma, Sesh-Pay-Shan, Har kuni yoki ixtiyoriy tanlangan kunlar.
* ⏰ **Dars Vaqti:** Boshlanish (`start_time`) va tugash (`end_time`) — masalan: `09:00 - 11:00`, `18:30 - 20:30`.
* 🚪 **Auditoriya / Xona (`room`)** va O'qituvchi (`teacher_id`).
* 📅 **O'qish Muddatlari:** `start_date`, `end_date`.
* 🚗 **Toifa (`category`) & LMS Kursi (`course_id`):** Ushbu guruhga mos LMS video va materiallari avtomatik bog'lanadi.
* **Talabani Guruhga Biriktirish**: Talaba `contracts.group_id` orqali guruhga bog'lanadi (bu orqali bitta talaba kelajakda boshqa guruh va toifalarda ham mustaqil o'qiy oladi).

---

### 📚 6. LMS: Toifalar Bo'yicha Video Darsliklar va Dars Materiallari
* 🚗 **Kurslar (`courses`):** Toifalar bo'yicha kurslar (A, B, C, BC, D, E).
* 📹 **Mavzular & Video Darslar (`topics` / `lessons`):**
  * Dars mavzusi va tavsifi 4 tilda (`uz`, `ru`, `krill`, `en`).
  * Tartib raqami (`order_number`) va davomiyligi (`duration_minutes`).
  * Video manbasi: YouTube / Vimeo / xavfsiz video xosting havolasi (`video_url`).
* 📄 **Yuklab Olinadigan Materiallar (`lesson_materials`):**
  * PDF taqdimotlar, yo'l harakati qoidalari, ko'rgazmali slaydlar.
* 👥 **Guruhlarga Biriktirish:** Shartnomasida `has_lms = true` yoki `has_theory = true` bo'lgan talabalarga o'z guruhining toifasiga mos mavzular Telegram Mini App orqali ochiladi.

---

### 📚 7. LMS Testlar & Imtihon Dvigateli (4 Tilda)
* 1190+ rasmli savollar va biletlar bazasi 4 tilda (`uz`, `ru`, `krill`, `en`).
* ExamInterface: 25 daqiqa taymer, swipe va klaviatura boshqaruvi.
* Yo'l belgilari (`sign_categories`, `signs`) va yo'l chiziqlari (`road_lines`) — 4 tilda.
* Ichki nazorat imtihoni: 20 savoldan kamida 18 ta to'g'ri javob = o'tdi (`is_passed = true`).

---

### 🎨 8. Talabalar To'lov Foizi va 4 Xil Rang Indikatori
To'lov foizi: `paid_amount / final_amount × 100%`

| Foiz oralig'i | Rang | Tailwind sinfi | Tavsif |
|---|---|---|---|
| **0%** | ⚪ Oq / Neytral | `bg-slate-100 text-slate-700` | Umuman to'lov qilinmagan |
| **1% - 49.9%** | 🔴 Qizil | `bg-red-100 text-red-700` | Yarimidan kam to'langan |
| **50% - 74.9%** | 🟡 Sariq / Amber | `bg-amber-100 text-amber-700` | Asosiy qismi to'langan |
| **75% va yuqori** | 🟢 Yashil | `bg-emerald-100 text-emerald-700` | Haydashga ruxsat etilgan |

---

### 🚗 9. Amaliy Haydashga (Vajdeniya) Ruxsat va Rejalashtirish
* **75% To'lov Qoidasi:** Talabani amaliy haydashga yozish uchun to'lov foizi **kamida 75%** va shartnomasida `has_driving = true` bo'lishi shart.
* **Instruktor va Mashina Bog'liqligi:** Har bir avtomobilga asosiy instruktor (`vehicles.default_instructor_id`) biriktirilgan bo'ladi. Instruktor tanlanganda uning mashinasi avtomatik tanlanadi.
* **Vaqt Kesishuvi (Slot Collision Prevention):** Bir vaqtning o'zida bitta instruktorga yoki bitta avtomobilga ikkita alohida o'quvchi yozilishi tizim tomonidan qat'iy bloklanadi.
* **Dars Natijasi va Baholash:** Dars o'tilgach, instruktor uni `completed` deb belgilaydi. O'quvchi esa Mini App orqali instruktorga 1-5 yulduzli baho va fikr qoldiradi.

---

### 🏫 10. Darsga (Nazariy Dars / Davomat) Kirish Qoidasi
* **Minimal To'lov Sharti:** Talaba nazariy darsga kirishi uchun shartnoma tarifida belgilangan minimal to'lovni (`min_theory_payment_percent`, masalan 30%) to'lagan va shartnomasida `has_theory = true` bo'lishi shart.
* **Dinamik QR Davomat:** O'qituvchi dars sessiyasini ochganda doskaga har 15-20 soniyada yangilanuvchi dinamik QR kod chiqadi. Talaba Telegram Mini App orqali skanerlaydi.
* **Manual Davomat:** Telefoni bo'lmagan talabalarni o'qituvchi sababi bilan qo'lda belgilaydi (`is_manual`, `manual_reason`, `marked_by_user_id`).

---

### 🎓 11. Bitirish Shartlari va Guvohnoma Berish Qoidalari
O'quvchiga Bitiruv Guvohnomasi (`certificates`) rasmiylashtirilishi uchun quyidagi **4 ta shart** tizim tomonidan qat'iy va avtomatik tekshiriladi:
1. **Shartnoma to'lovi:** Ushbu shartnoma bo'yicha qoldiq qarzdorlik **0** bo'lishi (`debt_amount == 0`).
2. **Davomat:** Nazariy darslarda qatnashish foizi kamida **70%** bo'lishi (`attendance_rate >= 70%`).
3. **Amaliy haydash:** Belgilangan majburiy haydash darslari to'liq o'tilgan bo'lishi (`completed_drivings_count >= required_driving_lessons`).
4. **Ichki imtihon:** LMS test sinovidan muvaffaqiyatli o'tgan bo'lishi (`is_passed == true`).

Bitiruvchiga QR-kod orqali tekshiriladigan rasmiy PDF guvohnoma chiqariladi (`certificate_number`, `qr_verify_hash`).

---

### 💳 12. Kassalar, Xarajatlar, Smenalar va Transferlar

#### Kassa Turlari va Qat'iy Validatsiya:
* 💵 **Naqd kassa** (`cash`) — masalan: "Chilonzor Naqd Kassasi"
* 💳 **Karta / Click / Payme** (`card_click`) — masalan: "Chilonzor Click / Terminal"
* 🏦 **Bank o'tkazmasi** (`bank_transfer`) — masalan: "AutoPrime Rasmiy Hisob Raqami"
* **To'lov Validatsiyasi:** Kassir to'lov qabul qilganda, tanlangan kassa turi bilan to'lov usuli bir-biriga 100% mos kelishi shart (Naqd kassaga Click yozish dasturiy jihatdan bloklanadi).

#### Kassa Smenasi (CashShift) va Transfer (Faqat Naqd Pul Uchun):
* **Naqd Kassa Smenasi:** Kun/hafta oxirida kassir naqd kassa smenasini yopadi. Haqiqiy naqd pul sanaladi va Markaziy Admin Kassaga transfer (`CashTransfer`) yuboriladi. Superadmin tasdiqlaydi.
* **Bank va Karta Kassalari:** Bank va Click hisoblaridagi pul jismonan olib kelinmaganligi sababli, ular uchun smena transferi emas, balki **Bank Ko'chirmasi Solishtiruvi (Bank Reconciliation)** amali bajariladi.

---

### 💼 13. Xodimlar Bilan Oybay Hisob-kitob (Avtomatlashtirilgan Payroll)
* 📅 **Davr (`period`: `YYYY-MM`)**: Har bir hisob-kitob ma'lum bir oyga biriktiriladi.
* **1-Klikda Oylik Vedomostini Shakllantirish (Generate Monthly Payroll):**
  * Tizim oy oxirida har bir instruktorning shu oydagi `completed` haydash soatlarini uning stavkasiga (`users.driving_hourly_rate`) ko'paytiradi.
  * O'qituvchilarning o'tgan nazariy darslari sonini stavkaga (`users.lesson_rate`) ko'paytiradi.
  * Shtatdagi xodimlarning okladini (`users.base_salary`) qo'shadi.
  * Shu oyda olingan avans va jarimalarni ayirib, loyiha vedomostini (Draft) tayyorlaydi.
  * Buxgalter KPI/bonuslarni kiritib, 1-klikda tasdiqlaydi.
* 🏦 **Kassadan To'lov:** Kassir filial kassasidan xodimga oylik to'laydi (`salary_payments`).
* `users.salary_balance` CHECK `>= 0`, `lockForUpdate()`.

---

### 🔔 14. Smart Xabarnomalar (Telegram Bepul Cheklar + PlayMobile SMS Zaxirasi)
SMS xarajatlarini 80-90% ga tejash maqsadida aqlli marshrutlash tizimi joriy etiladi:
* 📨 **1-navbatda (Telegram Bot - 100% Bepul):**
  * Talaba shartnoma tuzganda, to'lov qilganda yoki darsi belgilanganda uning Telegram botiga chiroyli formatda rasmiy chek, to'lov tafsilotlari va shaxsiy kabinet havolasi yuboriladi.
* 📱 **2-navbatda (PlayMobile SMS Zaxirasi):**
  * Agar talabaning Telegrami bo'lmasa yoki botni bloklagan bo'lsa, xabar avtomatik tarzda PlayMobile SMS orqali yuboriladi.

---

### 🚗 15. Avtopark (Fleet & Vehicles)
* Mashinalar alohida `vehicles` jadvalida yuritiladi: davlat raqami, model, yoqilg'i turi, texnik pasport.
* Har bir avtomobilga asosiy instruktor (`default_instructor_id`) biriktiriladi.
* Moy almashtirish, gaz/metan tekshiruvi, sug'urta, texnik ko'rik muddatlari va xarajatlar monitoringi (`vehicle_maintenances`).

---

### 📜 16. UNION Moliyaviy Tarixlar va Reconciliation
* **Talaba Tarixi (StudentStatement):** To'lovlar jadvalidan running balance (har to'lovdan keyingi qoldiq qarz).
* **Kassa Tarixi (CashRegisterStatement):** `payments UNION expenses UNION salary_payments UNION cash_transfers` — xronologik kirim/chiqim qoldig'i.
* **Xodim Tarixi (EmployeeStatement):** Hisoblangan oyliklar va to'lovlar ko'chirmasi.
* **Drift Reconciliation Job:** Har kecha (00:00 da) `ReconcileFinancialBalancesJob` barcha keshlangan qoldiqlarni tranzaksiyalar bilan solishtirib, nomuvofiqlik bo'lsa Superadminga xabar beradi.

---

### 📋 17. Audit va Xatti-harakatlar Tarixi (`spatie/laravel-activitylog`)
* Shartnomalarni tahrirlash
* Ochiq smenadagi to'lovlarni tuzatish
* Kassa transferlarini tasdiqlash
* Xodim oyligini hisoblash / to'lash

---

## 🔐 Rollar va Ruxsatlar Matritsasi (`spatie/laravel-permission`)

Tizimda **Spatie Multi-Role (`model_has_roles`)** va **To'g'ridan-to'g'ri Ruxsatlar (`model_has_permissions`)** qo'llaniladi. Bitta xodim bir vaqtning o'zida bir nechta rolga ega bo'lishi mumkin (masalan: `teacher + instructor`).

### 7 ta Asosiy Rol:
1. **`super_admin`**: Barcha filiallar, tizim sozlamalari, audit loglar va Markaziy Admin Kassalarning yagona boshqaruvchisi.
2. **`admin`**: O'z filialidagi barcha jarayonlarni nazorat qiluvchi filial rahbari. Shartnoma turlari va narxlarini belgilaydi.
3. **`accountant` (Buxgalter)**: Moliyaviy hisobotlar, xodimlar oylik vedomostini shakllantirish, kassa transferlarini audit qilish.
4. **`reception`**: Yangi o'quvchilarni qabul qiladi, shartnoma tuzadi (modullarni tanlaydi, muddatlarni belgilaydi), guruhga biriktiradi va sertifikat/guvohnoma chiqaradi.
5. **`kassir`**: Filialdagi Naqd, Karta/Click va Bank kassalariga to'lovlarni qabul qiladi, kassadan xarajatlar va oyliklarni to'laydi, naqd kassa smenasini yopadi va Admin Kassaga transfer qiladi.
6. **`teacher`**: Nazariy dars o'qituvchisi (Dars sessiyasini ochadi, ekranga Dinamik QR chiqaradi va davomatni oladi).
7. **`instructor`**: Amaliy haydash instruktori (Avtomobili va vaqt slotlarida faqat to'lovi 75%+ bo'lgan o'quvchilar bilan amaliy dars o'tadi).

### To'liq Permissions (Ruxsatlar) Ro'yxati:

#### 📊 Boshqaruv & Tahlil
| Permission | Turi | Vazifasi |
|---|---|---|
| `dashboard.view` | *Sidebar* | Boshqaruv panelini ko'rish |
| `kpi.view` | *Sidebar/Action* | Xodimlar va filiallar KPI reytingi |
| `audit.view` | *Sidebar/Action* | Tizim audit jurnali (*Superadmin*) |

#### 🏢 Filiallar va Xodimlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `branches.view` | *Sidebar* | Filiallar ro'yxati |
| `branches.manage` | *Action* | Filial ochish, tahrirlash, o'chirish |
| `users.view` | *Sidebar* | Xodimlar ro'yxati |
| `users.manage` | *Action* | Xodim qo'shish, rol biriktirish |
| `roles.manage` | *Action* | Rollar va ruxsatlarni sozlash (*Superadmin*) |

#### 🎓 O'quvchilar va Guruhlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `students.view` | *Sidebar* | O'quvchilar ro'yxati |
| `students.create` | *Action* | Yangi o'quvchi kiritish (*Reception*) |
| `students.edit` | *Action* | O'quvchi ma'lumotlarini tahrirlash |
| `students.delete` | *Action* | O'quvchini o'chirish / arxivlash |
| `groups.view` | *Sidebar* | Guruhlar ro'yxati |
| `groups.manage` | *Action* | Guruh ochish, jadval belgilash, dars boshlash/tugatish |

#### 📄 Shartnomalar va Sertifikatlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `contracts.view` | *Sidebar* | Shartnomalar va qoldiq qarzdorlar |
| `contracts.create` | *Action* | Yangi shartnoma tuzish |
| `contracts.edit` | *Action* | Shartnoma tahrirlash (*Audit loglanadi*) |
| `contracts.print` | *Action* | PDF shartnoma chop etish |
| `contract_types.manage` | *Action* | Shartnoma tariflari va modullarini boshqarish (*Admin*) |
| `certificates.view` | *Sidebar* | Bitiruvchilar va guvohnomalar |
| `certificates.create` | *Action* | Bitiruv Guvohnomasi chiqarish |
| `certificates.print` | *Action* | QR-kodli PDF chop etish |

#### 💳 Moliya, Kassalar va Chiqimlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `finance.view` | *Sidebar* | Moliya va kassalar bo'limi |
| `cash_registers.view` | *Action* | Kassa balanslari va ko'chirma |
| `payments.create` | *Action* | To'lov qabul qilish (*Kassir*) |
| `payments.edit` | *Action* | Ochiq smenadagi to'lovni tahrirlash (*Audit*) |
| `expenses.create` | *Action* | Kassadan xarajat chiqimi |
| `expense_categories.manage`| *Action* | Xarajat toifalarini boshqarish |
| `cash_shifts.close` | *Action* | Naqd kassa smenasini yopish |
| `cash_transfers.create` | *Action* | Admin kassaga naqd pul transfer yuborish |
| `cash_transfers.approve` | *Action* | Transferni qabul qilish (*Superadmin, Audit*) |
| `admin_treasury.manage` | *Sidebar/Action* | Markaziy Admin Kassani boshqarish (*Superadmin*) |

#### 💼 Xodimlar Oyligi
| Permission | Turi | Vazifasi |
|---|---|---|
| `salaries.view` | *Sidebar* | Oyliklar ro'yxati va tarix |
| `salaries.accrue` | *Action* | Oylik vedomostini generatsiya qilish (*Accountant/Admin, Audit*) |
| `salaries.pay` | *Action* | Kassadan oylik to'lash |

#### 📱 Davomat
| Permission | Turi | Vazifasi |
|---|---|---|
| `attendance.view` | *Sidebar* | Davomat jurnali va foizlari |
| `attendance.start_session` | *Action* | Dars ochish va Dinamik QR chiqarish (*Teacher*) |
| `attendance.mark_manual` | *Action* | Telefoni yo'q o'quvchini qo'lda belgilash |
| `attendance.export` | *Action* | Davomat Excelga eksport |

#### 🚗 Amaliy Haydash
| Permission | Turi | Vazifasi |
|---|---|---|
| `drivings.view` | *Sidebar* | Haydash jadvallari va slotlar |
| `drivings.manage` | *Action* | Haydash darsini rejalashtirish, o'tildi deb belgilash |
| `autodromes.manage` | *Action* | Avtodromlarni boshqarish |
| `reviews.view` | *Action* | Instruktor baholari va sharhlar |

#### 📚 LMS & Testlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `lms.view` | *Sidebar* | Testlar va imtihonlar bo'limi |
| `lms.manage_materials` | *Action* | Video va PDF materiallarni yuklash/boshqarish |
| `tickets.manage` | *Action* | Biletlar va savollar bazasi (4 tilda) |
| `attempts.view` | *Action* | Imtihon natijalari statistikasi |

#### 👥 CRM & 🚙 Avtopark
| Permission | Turi | Vazifasi |
|---|---|---|
| `crm.view` | *Sidebar* | CRM Lidlar Kanban |
| `leads.manage` | *Action* | Lid qo'shish, bot arizalarini ko'rish |
| `fleet.view` | *Sidebar* | Avtopark mashinalar |
| `fleet.manage` | *Action* | Mashina qo'shish, texnik xizmat eslatmalari |

---

## 🚫 Moliyaviy Yaxlitlik Qoidalari (Financial Integrity & No-Drift)

* **DB CHECK Constraint & Row Lock:**
  * `cash_registers.balance >= 0`
  * `contracts.debt_amount >= 0`
  * `users.salary_balance >= 0`
  * Barcha balans yangilanishlari `DB::transaction()` va `lockForUpdate()` bilan o'raladi.
* **Keshlangan Summalar Driftini Oldini Olish:**
  * `contracts.paid_amount`, `contracts.debt_amount`, `cash_registers.balance`, `cash_shifts.total_income/closing_balance`, `users.salary_balance` har tranzaksiyada atomar yangilanadi.
  * Har kecha (00:00) `ReconcileFinancialBalancesJob` xom summalarni qayta hisoblab, tafovut bo'lsa Superadminga xabar beradi.
* **Ortiqcha To'lov:** `contracts.overpaid_amount >= 0` orqali alohida kuzatiladi.
* **Oylik Hisoblash Belgisi:** `salaries.is_deduction` (`true` = jarima/avans, `false` = oklad/darsbay/bonus) — `amount` doim musbat.

---

## 🛡️ Xavfsizlik va PII Blind Indexing Encryption

Shaxsiy ma'lumotlar (PII) o'g'irlanishini oldini olish va shu bilan birga ma'lumotlar bazasida qidirish va takrorlanmaslikni (Unique) ta'minlash:
* **Shifrlanadigan maydonlar (Laravel `encrypted` cast):**
  * `students.pinfl`, `students.passport_series`, `students.passport_number`
  * `students.passport_photo_url`, `students.medical_certificate_photo_url`
  * `leads.pinfl`, `leads.passport_series`, `leads.passport_number`
  * `leads.passport_photo_url`, `leads.medical_certificate_photo_url`
* **Blind Index (Takrorlanishni tekshirish uchun HMAC-SHA256):**
  * `students.pinfl_hash` va `leads.pinfl_hash` ustiga `UNIQUE` index qo'yiladi.
  * Qiymat: `hash_hmac('sha256', $pinfl, config('app.key'))`.

---

## 📦 Kerakli Composer Paketlar

Loyiha quyidagi asosiy paketlarga tayanadi:
1. `spatie/laravel-permission` — Rollar va ruxsatlar (RBAC) uchun
2. `spatie/laravel-activitylog` — Harakatlar tarixi va audit uchun
3. `barryvdh/laravel-dompdf` — Shartnoma, chek va Bitiruv Guvohnomasi PDF uchun
4. `simplesoftwareio/simple-qrcode` — Dinamik QR va Guvohnoma tekshiruv QR kodi uchun
5. `nutgram/laravel` — Telegram Bot integratsiyasi uchun (mavjud)
6. `maatwebsite/excel` — Davomat va moliyaviy hisobotlarni eksport qilish uchun (mavjud)

---

## 🌐 Mahalliylashtirish (4 ta tilda)

Barcha UI interfeyslar, LMS dars mavzulari va video tavsiflari, oylik vedomostlari, holat matnlari, SMS shablonlari va savollar bazasi to'rtta tilda to'liq ishlaydi:
- `ru.json` (Ruscha)
- `uz.json` (O'zbekcha lotin)
- `krill.json` (O'zbekcha kirill)
- `en.json` (Inglizcha)

---

## ⚠️ Deploy Eslatmalari

* Serverdagi asosiy `php` buyrug'i 8.1, lekin loyiha PHP 8.3 talab qiladi. Barcha artisan buyruqlari va cron'larda `/opt/php83/bin/php` aniq ko'rsatilishi shart.
* Nginx/Apache FastCGI konfiguratsiyasida PHP-FPM 8.3 versiyasiga bog'lanishi kerak.
* `npm run build` serverda Node v20 bilan ishga tushiriladi.
