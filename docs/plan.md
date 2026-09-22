# AutoPrime LMS & ERP (lms.autoprime.uz) Tizimini Joriy Qilish Rejasi

Mazkur reja **lms.autoprime.uz** domenida alohida platforma sifatida O'zbekiston avtomaktablari uchun to'liq moslashtirilgan, **O'quvchi hech qanday veb-sahifasiz to'g'ridan-to'g'ri Telegram Bot Chatida ketma-ket savol-javob orqali anketani to'ldirishi, rasmlarni yuklashi, 1-klik shartnoma, Kassa, Guruhlar jadvali, Darslar, LMS Video & Materiallar, Testlar, Bitiruv Guvohnomasi va Xodimlar bilan Oybay Hisob-kitobgacha bo'lgan 100% to'liq platforma**ga aylantirish uchun ishlab chiqildi.

* 🌐 **Loyiha Domeni**: `https://lms.autoprime.uz`
* 🖥️ **Server Joylashuvi**: `/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz` (IP: `193.181.213.60`)
* ⚙️ **Muhit (Stack)**: PHP 8.3 (`/opt/php83/bin/php`), Node `v20.20.2`, MySQL, Laravel 13, Inertia v3, React 19, Tailwind v4
* 🌿 **Git Brench**: `lms-autoprime`
* 📱 **Telegram Webhook**: `https://lms.autoprime.uz/api/telegram/webhook`
* 📲 **Telegram Mini App**: `https://lms.autoprime.uz/mini-app`

---

## O'quvchining To'liq Hayotiy Sikli (Bot Qabulidan ➡️ Sertifikatgacha)

```
1. TELEGRAM BOT CHATIDA KETMA-KET QABUL ANKETASI (Bot Chat Wizard & CRM Leads)
   ├── Bot: "F.I.O ingizni kiriting" ➡️ O'quvchi yozadi
   ├── Bot: [📱 Kontaktni yuborish] ➡️ O'quvchi bosadi
   ├── Bot: Toifani tanlang: [🚗 B toifa] [🏍️ A toifa] [🚛 C toifa]
   ├── Bot: Filialni tanlang: [🏢 Chilonzor] [🏢 Yunusobod]
   ├── Bot: Qulay vaqt: [🌅 Ertalabki] [☀️ Kunduzgi] [🌙 Kechki]
   ├── Bot: "Pasportingiz rasmini yuboring" ➡️ O'quvchi rasm tashlaydi (Encrypted)
   ├── Bot: "3x4 rasmingizni yuboring" ➡️ O'quvchi rasm tashlaydi
   └── Bot: "Tug'ilgan sana va manzilingizni kiriting" ➡️ O'quvchi yozadi.

2. CRM LEADS KANBAN & RECEPTION GA BILDIRISHNOMA
   ├── Bot arizasi CRM Kanban doskasida ko'rinadi (new_lead ➡️ form_sent ➡️ form_completed)
   ├── Reception barcha rasmlar va ma'lumotlarni ko'rib, 1-klik bilan Student ochadi
   └── Shartnoma turini tanlaydi (Narx, Muddatlar, [x] Nazariya, [x] Vajdeniya, [x] Test).

3. SHARTNOMA RASMIYLASHTIRILADI & SMS
   ├── Shartnoma tasdiqlanadi ➡️ Talabaga PlayMobile orqali SMS boradi
   ├── Talaba mos guruhga (Dars kunlari: Dush-Chor-Juma, 18:30-20:30) biriktiriladi
   └── CRM lidining holati: contract_signed.

4. TO'LOV QABUL QILISH (Payments & Cash Registers)
   ├── Kassir to'lov turiga mos kassani tanlaydi (Naqd / Click-Karta / Bank o'tkazma)
   ├── To'lov qabul qilinadi (DB transaction + lockForUpdate) ➡️ SMS boradi
   └── To'lov foiziga qarab talabaga rang beriladi:
       ├── 0%   = ⚪ Oq rang
       ├── <50% = 🔴 Qizil rang
       ├── 50-75% = 🟡 Sariq rang
       └── 75%+ = 🟢 Yashil rang

5. NAZARIY TA'LIM, LMS MATERIALLAR & DAVOMAT
   ├── SHART: Talaba minimal to'lovni qilgan bo'lishi kerak (va has_theory=true)
   ├── O'qituvchi dars ochadi, ekrandagi har 15-20s yangilanuvchi dinamik QR orqali davomat olinadi
   ├── Telefoni yo'q talabalar qo'lda belgilanadi (is_manual, manual_reason, marked_by_user_id)
   └── Shaxsiy kabinetida guruh toifasiga mos VIDEO darslar va PDF materiallardan foydalanadi.

6. AMALIY HAYDASH (Drivings & Instructors & Vehicles)
   ├── SHART: Talaba to'lovi kamida 75% bo'lishi shart (va has_driving=true)
   ├── Instruktor va aniq mashina (vehicle_id) biriktiriladi
   └── Dars yakunida o'quvchi instruktorga baho (Review: 1-5 yulduz + teglar) qo'yadi.

7. TEST VA ICHKI IMTIHON (LMS & Mock Exam — 4 Tilda)
   └── Shartnomada has_lms=true bo'lsa, Prava24 1190+ bazasida 4 tilda mashq qiladi va imtihon topshiradi.

8. BITIRISH & GUVOHNOMA/SERTIFIKAT (Certificates)
   └── 4 ta shart tizim tomonidan qat'iy tekshiriladi:
       ├── 1. Talabaning BARCHA faol shartnomalari bo'yicha umumiy qarzi 0
       ├── 2. Nazariy darslardagi davomat foizi kamida 70%
       ├── 3. Belgilangan barcha amaliy haydash mashg'ulotlari o'tilgan
       └── 4. Ichki imtihondan muvaffaqiyatli o'tgan (is_passed = true)
       ➡️ QR-kodli rasmiy Bitiruv Guvohnomasi PDF chop etiladi.

9. KASSA SMENASI YOPISH & ADMIN KASSAGA TRANSFER
   ├── Kassir kun/hafta oxirida kassa smenasini yopadi (CashShift)
   ├── closing_balance = opening_balance + income - expenses - salaries
   └── Pullar turi bo'yicha mos Markaziy Admin Kassaga transfer qilinadi (CashTransfer).

10. XODIMLAR BILAN OYBAY HISOB-KITOB (Payroll & Vedomost)
    ├── Har oy oxirida (period: YYYY-MM) vedomost shakllanadi:
    │   Net = Oklad + Darsbay + Bonus/KPI - Avans - Jarima
    └── Filial kassalaridan oylik to'lanadi (salary_payments).

11. XRONOLOGIK TARIX & AUDIT (UNION Statements & Drift Reconciliation)
    ├── Talabaning to'liq qarz tarixi (har to'lovdan keyin qoldiq qarz, running balance)
    ├── Kassaning barcha kirim/chiqim qoldiqlari (UNION xronologik ko'chirma)
    ├── Xodimning oylik ko'chirmasi
    └── Har kecha (00:00) avtomatik ReconcileFinancialBalancesJob: drift nazorati.
```

---

## Asosiy Modullar va Imkoniyatlar

### 🤖 1. Telegram Bot Chatida Ketma-ket Anketa To'ldirish (Conversational Chat Wizard)
Bo'lajak o'quvchi hech qanday tashqi sayt ochmasdan, to'g'ridan-to'g'ri bot chatida ketma-ket savollarga javob beradi:
1. 👤 **F.I.O** (Ism, familiya, sharif)
2. 📱 **Telefon raqami** (*"Kontaktni ulashish"* bitta tugma orqali)
3. 🚗 **Toifa tanlash** (*B, A, C* tugmalari orqali)
4. 🏢 **Filial tanlash** (*Chilonzor, Yunusobod va h.k.* tugmalari)
5. ⏰ **Qulay o'qish vaqti** (*Ertalabki, Kunduzgi, Kechki* tugmalari)
6. 📸 **Pasport / ID karta rasmi** (Telefon kamerasidan yoki galereyadan rasm — *shifrlangan saqlanadi*)
7. 👤 **3x4 rasm / Selfi** (Bot chatiga rasm qilib yuboradi)
8. 📅 **Tug'ilgan sana va Yashash manzili**
9. 🔢 **JSHSHIR (PINFL)** (14 xonali — *shifrlangan saqlanadi*)

> **Muhim:** Telegramdan yuklab olingan rasmlar darhol xavfsiz papkaga (`storage/app/private/documents/...`) yuklab, siqilib va fayl yo'li bazada shifrlab saqlanadi.

---

### 👥 2. CRM Leads Kanban & Bot Arizalari
* **Lead bosqichlari (stages):** `new_lead` ➡️ `form_sent` ➡️ `form_completed` ➡️ `contract_signed` / `rejected`
* **Manba turlari (sources):** `telegram_bot`, `reception_manual`, `instagram`, `website`, `referral`, `walk_in`, `other`
* **Qabulxona (Reception):** Bot arizasini ko'rib, 1-klik bilan Student va Contract ochadi.

---

### 📅 3. Guruhlarda Dars Kunlari va Vaqt Jadvali (Group Schedules)
* 📆 **Dars Kunlari (`days_of_week` JSON):** Dush-Chor-Juma, Sesh-Pay-Shan, Har kuni yoki ixtiyoriy tanlangan kunlar.
* ⏰ **Dars Vaqti:** Boshlanish (`start_time`) va tugash (`end_time`) — masalan: `09:00 - 11:00`, `18:30 - 20:30`.
* 🚪 **Auditoriya / Xona (`room`)** va O'qituvchi (`teacher_id`).
* 📅 **O'qish Muddatlari:** `start_date`, `end_date`.
* 🚗 **Toifa (`category`):** A, B, C, D, BC va h.k.

---

### 📚 4. LMS: Toifalar Bo'yicha Video Darsliklar va Dars Materiallari
Har bir avtotransport toifasi (**A, B, C, D, BC, E**) bo'yicha to'liq multimedia o'quv dasturi yaratiladi:
* 🚗 **Toifaga Bog'langan Mavzular (`lessons`/`topics`):** Dars mavzusi va tavsifi 4 tilda, tartib raqami (`order_number`) va davomiyligi.
* 📹 **Video Darsliklar:** YouTube / Vimeo yoki to'g'ridan-to'g'ri yuklangan videodarslar (`video_url`).
* 📄 **Yuklab Olinadigan Materiallar:** PDF prezentatsiyalar, yo'l harakati qoidalari, ko'rgazmali slaydlar (`lesson_materials`).
* 👥 **Guruhlarga Biriktirish:** Guruh toifasiga (masalan `B`) mos materiallar avtomatik ochiladi. Shartnomasida `has_lms = true` yoki `has_theory = true` bo'lgan talabalar foydalanadi.

---

### 📚 5. LMS Testlar & Prava24 Imtihon Dvigateli (4 Tilda)
* 1190+ rasmli savollar va biletlar bazasi 4 tilda (`uz`, `ru`, `krill`, `en`).
* Prava24 ExamInterface: 25 daqiqa taymer, swipe va klaviatura boshqaruvi.
* Yo'l belgilari (`sign_categories`, `signs`) va yo'l chiziqlari (`road_lines`) — 4 tilda.
* Ichki imtihon: 20 savoldan kamida 18 ta to'g'ri javob = o'tdi.

---

### 📄 6. Moslashuvchan Shartnoma Turlari (Tariflar & Modullar)
* Admin cheksiz shartnoma turlari (`contract_types`)ni yaratadi va standart narxini belgilaydi.
* Shartnomaga boshlanish (`start_date`) va tugash (`end_date`) vaqtlari erkin kiritiladi.
* **Modul tanlovi (Checkboxes):**
  * 📘 `has_theory` (Nazariy ta'lim)
  * 🚗 `has_driving` (Amaliy haydash / Vajdeniya)
  * 💻 `has_lms` (Testlar va LMS imtihon)
* *(Kimdir faqat vajdeniya, faqat test yoki to'liq kurs o'qishi mumkin).*
* Shartnoma raqami avtomatik generatsiya qilinadi: `AP-2026-0012`.
* **Shartnoma holatlari:** `draft`, `active`, `completed`, `cancelled`.
* **To'lov holatlari:** `unpaid`, `partial`, `paid`.

---

### 🎨 7. Talabalar To'lov Foizi va 4 Xil Rang Indikatori
To'lov foizi: `paid_amount / final_amount × 100%`

| Foiz oralig'i | Rang | Tailwind sinfi |
|---|---|---|
| **0%** (to'lov qilinmagan) | ⚪ Oq / Neytral kulrang | `bg-slate-100 text-slate-700` |
| **1% - 49.9%** (< 50%) | 🔴 Qizil | `bg-red-100 text-red-700` |
| **50% - 74.9%** (50% - 75%) | 🟡 Sariq / Amber | `bg-amber-100 text-amber-700` |
| **75% va yuqori** (75%+) | 🟢 Yashil | `bg-emerald-100 text-emerald-700` |

---

### 🚗 8. Amaliy Haydashga (Vajdeniya) Ruxsat Qoidasi
* Talabani haydash darslariga qo'shish uchun to'lov foizi **kamida 75% (>= 75)** va shartnomasida `has_driving = true` bo'lishi shart.
* 75% dan kam talabalar bloklanadi: *"Talaba to'lovi 75% dan kam (Hozir: X%). Haydashga yozilish uchun to'lov yetarli emas!"*

---

### 🏫 9. Darsga (Nazariy Dars / Davomat) Kirish Qoidasi
* Talaba darsga kirishi uchun **minimal to'lovni** (`min_payment_amount`) to'lagan va shartnomasida `has_theory = true` bo'lishi shart.
* Minimal to'lov qilinmagan talaba QR skanerlaganda rad etiladi.

---

### 💳 10. Kassalar, Xarajatlar, Smenalar va Transferlar

#### 3 Xil Kassa Turlari:
* 💵 **Naqd kassa** (`cash`) — masalan: "Chilonzor Naqd Kassasi"
* 💳 **Karta / Click / Payme** (`card_click`) — masalan: "Chilonzor Click / Terminal"
* 🏦 **Bank o'tkazmasi** (`bank_transfer`) — masalan: "AutoPrime Rasmiy Hisob Raqami"
* Har bir filialda ushbu turlar bo'yicha bir nechta kassa ochilishi mumkin.
* Markaziy Admin Kassalar (`branch_id = null`) faqat Superadmin boshqaradi.

#### Xarajat Toifalari va Chiqimlar:
* Admin yaratgan toifalar: Bino ijarasi, Banner, Reklama/SMM, Kommunal va h.k.
* Kassadan xarajat chiqimi: summa kassa balansidan oshmasligi (`lockForUpdate()`).

#### Kassa Smenasi (CashShift):
* Kun/hafta oxirida kassir smenani yopadi.
* `closing_balance = opening_balance + income - expenses - salaries`
* Yopilgan smena summasi Admin Kassaga transfer qilinadi.

#### Admin Kassaga Transfer (CashTransfer):
* Filial kassiridan mos turdagi Markaziy Admin Kassaga transfer yuboriladi (`pending`).
* Superadmin tasdiqlaydi (`approved`) yoki rad etadi (`rejected`).
* Tasdiqlangan transferlar `activity_log`da saqlanadi.

---

### 💼 11. Xodimlar Bilan Oybay Hisob-kitob (Monthly Payroll)
* 📅 **Davr (`period`: `YYYY-MM`)**: Har bir hisob-kitob ma'lum bir oyga biriktiriladi.
* **Oylik Vedomosti:**

  `To'lanadigan Sof Oylik (Net) = Oklad + Darsbay + Bonus/KPI - Avans - Jarima`

* **Oylik turlari:** `base_salary`, `driving_hourly_rate`, `bonus_kpi`, `penalty` (`is_deduction=true`), `advance` (`is_deduction=true`).
* `amount` doim musbat saqlanadi, `is_deduction` belgisi summa yo'nalishini ko'rsatadi.
* 🏦 **Kassadan To'lov:** Kassir filial kassasidan (Naqd, Karta yoki Bank) xodimga oylik to'laydi (`salary_payments`).
* `users.salary_balance` CHECK `>= 0`, `lockForUpdate()`.

---

### 📱 12. PlayMobile SMS Integratsiyasi
* 📨 **Shartnoma tuzilganda:**
  > *"Hurmatli [Ism], AutoPrime avtomaktabi bilan [Raqam] sonli shartnomangiz rasmiylashtirildi. Summa: [Summa] so'm. O'qish davri: [Boshlanish] - [Tugash]. Tel: +998..."*
* 💳 **To'lov qabul qilinganda:**
  > *"Hurmatli [Ism], sizdan [Summa] so'm to'lov qabul qilindi. Jami: [Jami] so'm ([Foiz]%). Qoldiq: [Qoldiq] so'm. AutoPrime."*
* SMS'lar Laravel Queue / Job orqali asinxron yuboriladi (`SendContractCreatedSmsJob`, `SendPaymentReceivedSmsJob`).

---

### 🚗 13. Avtopark Normalizatsiyasi (Fleet & Vehicles)
* Xodimlar jadvalidan mashina maydonlari butunlay chiqarilib, alohida `vehicles` jadvali kiritilgan.
* `drivings.vehicle_id` orqali har bir dars o'tilgan avtomobil aniq bog'lanadi.
* Moy almashtirish, gaz/metan, sug'urta, texnik ko'rik muddatlari va xarajatlar monitoringi (`vehicle_maintenances`).

---

### 🎓 14. Bitirish Shartlari va Guvohnoma Berish Qoidalari
O'quvchiga Bitiruv Guvohnomasi (`certificates`) rasmiylashtirilishi uchun quyidagi **4 ta shart** tizim tomonidan qat'iy tekshiriladi:
1. **Shartnomalar to'lovi:** Talabaning **BARCHA faol shartnomalari bo'yicha umumiy qarzdorligi 0** bo'lishi shart.
2. **Davomat:** Nazariy darslarda qatnashish foizi kamida **70%** bo'lishi.
3. **Amaliy haydash:** Belgilangan barcha haydash mashg'ulotlari **o'tilgan** bo'lishi.
4. **Ichki imtihon:** LMS test sinovidan **muvaffaqiyatli o'tgan** bo'lishi (`is_passed = true`).

Bitiruvchiga QR-kod orqali tekshiriladigan rasmiy PDF guvohnoma chiqariladi (`certificate_number`, `qr_verify_hash`).

---

### 📱 15. Darslar & Davomat (One-Time Dynamic QR & Manual Davomat)
* **Dinamik QR:** O'qituvchi dars sessiyasini ochganda (`lesson_sessions`) ekranda har 15-20 soniyada yangilanuvchi tokenli QR chiqadi (`qr_secret_salt` + HMAC). Skrinshot qilib boshqalarga jo'natishni oldini oladi.
* **Telefoni yo'qlar uchun Manual rejim:** O'qituvchi/admin sababi bilan qo'lda belgilaydi (`is_manual`, `manual_reason`, `marked_by_user_id`).

---

### 📜 16. UNION Moliyaviy Tarixlar va Reconciliation
* **Talaba Tarixi (StudentStatement):** To'lovlar jadvalidan running balance (har to'lovdan keyingi qoldiq qarz).
* **Kassa Tarixi (CashRegisterStatement):** `payments UNION expenses UNION salary_payments UNION cash_transfers` — xronologik kirim/chiqim qoldig'i.
* **Xodim Tarixi (EmployeeStatement):** Hisoblangan oyliklar va to'lovlar ko'chirmasi.
* **Drift Reconciliation Job:** Har kecha (00:00 da) `ReconcileFinancialBalancesJob` barcha keshlangan qoldiqlarni tranzaksiyalar bilan solishtirib, nomuvofiqlik bo'lsa Superadminga bildirishnoma beradi.

---

### 📋 17. Audit va Xatti-harakatlar Tarixi (`spatie/laravel-activitylog`)
Quyidagi amallar kim tomonidan qachon va qanday o'zgartirilgani (old/new diff) qayd etiladi:
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
3. **`accountant` (Buxgalter)**: Moliyaviy hisobotlar, xodimlar oylik vedomostini (oybay) shakllantirish, kassa transferlarini audit qilish.
4. **`reception`**: Yangi o'quvchilarni qabul qiladi, shartnoma tuzadi (modullarni tanlaydi, muddatlarni belgilaydi), guruhga biriktiradi va sertifikat/guvohnoma chiqaradi.
5. **`kassir`**: Filialdagi Naqd, Karta/Click va Bank kassalariga to'lovlarni qabul qiladi, kassadan xarajatlar va oybay oyliklarni to'laydi, kassa smenasini yopadi va Admin Kassaga transfer qiladi.
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
| `groups.manage` | *Action* | Guruh ochish, dars boshlash/tugatish |

#### 📄 Shartnomalar va Sertifikatlar
| Permission | Turi | Vazifasi |
|---|---|---|
| `contracts.view` | *Sidebar* | Shartnomalar va qoldiq qarzdorlar |
| `contracts.create` | *Action* | Yangi shartnoma tuzish |
| `contracts.edit` | *Action* | Shartnoma tahrirlash (*Audit loglanadi*) |
| `contracts.print` | *Action* | PDF shartnoma chop etish |
| `contract_types.manage` | *Action* | Shartnoma turlarini yaratish va boshqarish (*Admin*) |
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
| `cash_shifts.close` | *Action* | Kassa smenasini yopish |
| `cash_transfers.create` | *Action* | Admin kassaga transfer yuborish |
| `cash_transfers.approve` | *Action* | Transferni qabul qilish (*Superadmin, Audit*) |
| `admin_treasury.manage` | *Sidebar/Action* | Markaziy Admin Kassani boshqarish (*Superadmin*) |

#### 💼 Xodimlar Oyligi
| Permission | Turi | Vazifasi |
|---|---|---|
| `salaries.view` | *Sidebar* | Oyliklar ro'yxati va tarix |
| `salaries.accrue` | *Action* | Oylik/jarima/avans hisoblash (*Accountant/Admin, Audit*) |
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

#### 📚 LMS & Prava24 Testlar
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

## 🛡️ Xavfsizlik va PII Encryption

Quyidagi maydonlar model darajasida Laravel `encrypted` cast bilan saqlanadi:
* `students.pinfl`, `students.passport_series`, `students.passport_number`
* `students.passport_photo_url`, `students.medical_certificate_photo_url`
* `leads.pinfl`, `leads.passport_series`, `leads.passport_number`
* `leads.passport_photo_url`, `leads.medical_certificate_photo_url`

---

## Mahalliylashtirish (4 ta tilda)

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
